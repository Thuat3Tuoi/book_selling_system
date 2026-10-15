# Hướng dẫn tự xây dựng và triển khai Docker Compose cho backend

Tài liệu này hướng dẫn **từng bước, từ lúc chưa có cấu hình Docker đến khi backend chạy và được kiểm tra**. Các đoạn cấu hình bên dưới là bản đang dùng trong thư mục `backend` của dự án. Người mới có thể làm theo thứ tự; nếu các tệp đã có sẵn thì đọc để hiểu và chuyển tới bước chạy thử.

Môi trường minh họa: Windows, PowerShell và Docker Desktop. Mọi lệnh Docker Compose phải chạy trong thư mục `backend`.

## Bước 1. Chuẩn bị công cụ và mở đúng thư mục

1. Cài và mở Docker Desktop; đợi Docker Engine chạy.
2. Mở PowerShell tại thư mục backend của dự án. Đường dẫn trên máy đang làm việc là:

~~~powershell
Set-Location -LiteralPath 'D:\SGU\Nam4\[T6-Chieu]-CCNLTHD\book-selling-system\backend'
~~~

Nếu bạn clone dự án ở chỗ khác, thay đường dẫn tương ứng. Dùng `-LiteralPath` vì tên thư mục hiện tại có dấu ngoặc vuông.

3. Kiểm tra Docker và các tệp nguồn:

~~~powershell
docker version
docker compose version
Get-ChildItem -Name package.json,package-lock.json,prisma,docker-compose.yml
~~~

`docker version` cần có cả phần Client và Server. Nếu không có Server, Docker Engine chưa sẵn sàng. Không cần cài Node.js hay PostgreSQL trực tiếp lên host để chạy stack bằng Docker.

## Bước 2. Khảo sát backend trước khi viết cấu hình

Mở các tệp sau trong editor và xác nhận công nghệ thực sự được dùng:

| Tệp hoặc thư mục | Điều cần xem | Kết quả của dự án này |
|---|---|---|
| `package.json`, `package-lock.json` | Framework, package manager, lệnh build/start | NestJS 12, TypeScript, npm; `npm run build` và `node dist/main.js` |
| `prisma/schema.prisma`, `prisma/migrations/` | Database, ORM, migration | Prisma 7 và PostgreSQL; có migration cần chạy trước backend |
| `src/main.ts` | Cổng HTTP và kết nối lúc khởi động | HTTP cổng 3001, RabbitMQ consumer |
| `src/prisma/`, `src/redis/` | Kết nối database/cache | PostgreSQL và Redis |
| `src/infrastructure/rabbitmq/` | Message broker | RabbitMQ |
| `src/search/` | Search engine | Meilisearch |

Vì mã nguồn dùng cả bốn dependency, Compose cần **PostgreSQL, Redis, RabbitMQ và Meilisearch**. Container `migrate` chạy Prisma migration một lần rồi kết thúc. Backend giao tiếp qua tên service trên Compose network: `postgres`, `redis`, `rabbitmq`, `meilisearch`. `localhost` bên trong container chỉ trỏ về chính container đó.

## Bước 3. Tạo Dockerfile cho backend

Tạo tệp `backend/Dockerfile` với nội dung sau (trong repo hiện tại tệp này đã có):

~~~dockerfile
FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392 AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM dependencies AS build
COPY nest-cli.json tsconfig.json tsconfig.build.json prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY types ./types
RUN npm run prisma:generate && npm run build

FROM dependencies AS migrate
COPY prisma.config.ts ./
COPY prisma ./prisma
USER node
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

FROM base AS production-dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./package.json
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "dist/main.js"]
~~~

Ý nghĩa các phần quan trọng:

1. **base:** dùng Node.js 22, cài OpenSSL vì Prisma cần nhận diện thư viện này. Digest của image được cố định để lần build sau dùng cùng phiên bản.
2. **dependencies:** chỉ copy `package.json` và lockfile rồi chạy `npm ci`. Khi sửa mã nguồn nhưng không sửa dependency, Docker có thể dùng lại layer cài package.
3. **build:** copy Prisma schema và mã TypeScript, sinh Prisma Client, sau đó build NestJS.
4. **migrate:** có Prisma CLI và các migration; chạy `prisma migrate deploy` trước backend.
5. **production-dependencies/runtime:** cài dependency cần cho lúc chạy, copy thư mục `dist`, dùng user `node` thay cho root. `CMD` chạy trực tiếp Node.js để nhận tín hiệu dừng container. Health check gọi endpoint `/health`.

Khi sửa Dockerfile, kiểm tra lệnh start thực tế trong `package.json` và vị trí tệp build. Ở dự án này entry point là `dist/main.js`.

## Bước 4. Tạo .dockerignore

Tạo `backend/.dockerignore`:

~~~text
.git
.github
.env*
!.env.example
node_modules
dist
coverage
.nyc_output
test
**/*.spec.ts
**/*.e2e-spec.ts
*.log
*.tsbuildinfo
.temp
.tmp
.idea
.vscode
src/generated
README.md
docs
~~~

Tệp này loại `node_modules`, bản build cũ, log, test và `.env` khỏi Docker build context. **Không copy secret vào image.** Mã Prisma Client trong `src/generated` được tạo mới ở build stage nên không cần gửi bản được sinh trên máy host.

## Bước 5. Tạo mẫu cấu hình môi trường

Tạo `backend/.env.example` để ghi tên các biến cần thiết, không ghi secret thật:

~~~dotenv
# Copy this file to .env in backend/, then set every blank secret to a strong value.
# Compose overrides the standalone DATABASE_URL and RABBITMQ_URL with service URLs.
# Use URL-safe characters (for example, random hex) for PostgreSQL and RabbitMQ passwords.
POSTGRES_DB=bookstore
POSTGRES_USER=bookstore
POSTGRES_PASSWORD=
RABBITMQ_USER=bookstore
RABBITMQ_PASSWORD=
MEILISEARCH_API_KEY=
JWT_SECRET=
BACKEND_PORT=3001
RABBITMQ_QUEUE=book_queue
~~~

Nếu **chưa có** `.env`, tạo từ bản mẫu. Nếu đã có, giữ nguyên giá trị đang dùng và chỉ bổ sung biến còn thiếu:

~~~powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
~~~

Mở `.env` trong editor. Bạn phải điền giá trị riêng cho `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `MEILISEARCH_API_KEY` và `JWT_SECRET`. Có thể tạo **một** chuỗi hex 64 ký tự bằng PowerShell; chạy lại cho từng biến:

~~~powershell
$bytes = New-Object byte[] 32
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$rng.GetBytes($bytes)
$rng.Dispose()
[BitConverter]::ToString($bytes).Replace('-', '').ToLowerInvariant()
~~~

Dùng ký tự an toàn cho URL, chẳng hạn chuỗi hex, đối với hai mật khẩu PostgreSQL và RabbitMQ. Không để giá trị trống, không dùng giá trị mẫu làm mật khẩu thật, không commit `.env`. Trong Compose, `DATABASE_URL` và `RABBITMQ_URL` được ghép từ các biến này và tên service, nên giá trị cũ dành cho cách chạy ngoài Docker trong `.env` không được đưa vào backend container.

## Bước 6. Tạo docker-compose.yml

Tạo `backend/docker-compose.yml`. Đây là cấu hình đầy đủ đang chạy:

~~~yaml
name: book-selling-backend

services:
  postgres:
    image: postgres:17-alpine@sha256:18cfe3ef5e6815560c98237d6216d1e5119702fb0f3894c8785dd58b8bbe5d73
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-bookstore}
      POSTGRES_USER: ${POSTGRES_USER:-bookstore}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$$POSTGRES_USER\" -d \"$$POSTGRES_DB\""]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [backend]

  redis:
    image: redis:7-alpine@sha256:ff02b58f971e7d7d156a1267e283fcbbeee91773b6aa36c49dac28ecfe28eadf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks: [backend]

  rabbitmq:
    image: rabbitmq:3-management@sha256:e582c0bc7766f3342496d8485efb5a1df782b5ce3886ad017e2eaae442311f69
    restart: unless-stopped
    environment:
      RABBITMQ_DEFAULT_USER: ${RABBITMQ_USER:-bookstore}
      RABBITMQ_DEFAULT_PASS: ${RABBITMQ_PASSWORD:?Set RABBITMQ_PASSWORD in .env}
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 15s
      timeout: 10s
      retries: 8
      start_period: 30s
    networks: [backend]

  meilisearch:
    image: getmeili/meilisearch:v1.15@sha256:fe500cf9cca05cb9f027981583f28eccf17d35d94499c1f8b7b844e7418152fc
    restart: unless-stopped
    environment:
      MEILI_MASTER_KEY: ${MEILISEARCH_API_KEY:?Set MEILISEARCH_API_KEY in .env}
      MEILI_ENV: production
      MEILI_NO_ANALYTICS: "true"
    volumes:
      - meilisearch_data:/meili_data
    healthcheck:
      test: ["CMD", "curl", "--fail", "--silent", "http://127.0.0.1:7700/health"]
      interval: 10s
      timeout: 5s
      retries: 8
      start_period: 30s
    networks: [backend]

  migrate:
    build:
      context: .
      target: migrate
    restart: "no"
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-bookstore}:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}@postgres:5432/${POSTGRES_DB:-bookstore}?schema=public
    depends_on:
      postgres:
        condition: service_healthy
    networks: [backend]

  backend:
    build:
      context: .
      target: runtime
    restart: unless-stopped
    environment:
      PORT: "3001"
      DATABASE_URL: postgresql://${POSTGRES_USER:-bookstore}:${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD in .env}@postgres:5432/${POSTGRES_DB:-bookstore}?schema=public
      JWT_SECRET: ${JWT_SECRET:?Set JWT_SECRET in .env}
      REDIS_HOST: redis
      REDIS_PORT: "6379"
      RABBITMQ_URL: amqp://${RABBITMQ_USER:-bookstore}:${RABBITMQ_PASSWORD:?Set RABBITMQ_PASSWORD in .env}@rabbitmq:5672
      RABBITMQ_QUEUE: ${RABBITMQ_QUEUE:-book_queue}
      RABBITMQ_DURABLE: "true"
      RABBITMQ_PERSISTENT: "true"
      MEILISEARCH_HOST: http://meilisearch:7700
      MEILISEARCH_API_KEY: ${MEILISEARCH_API_KEY:?Set MEILISEARCH_API_KEY in .env}
    ports:
      - "${BACKEND_PORT:-3001}:3001"
    depends_on:
      migrate:
        condition: service_completed_successfully
      redis:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
      meilisearch:
        condition: service_healthy
    networks: [backend]

networks:
  backend:

volumes:
  postgres_data:
  rabbitmq_data:
  meilisearch_data:
~~~

Cách đọc Compose từ trên xuống:

- `name` tạo project riêng để network và volume không trùng với stack khác.
- `postgres` lưu database vào named volume; `pg_isready` báo khi đã sẵn sàng. Cổng database chỉ nằm trong network nội bộ.
- `redis` dùng làm cache và có lệnh `redis-cli ping` để kiểm tra. Cache không cần volume trong dự án này.
- `rabbitmq` lưu message broker vào volume, dùng tài khoản từ `.env`; management UI không được publish ra host.
- `meilisearch` dùng API key từ `.env`, có health check và volume cho chỉ mục tìm kiếm.
- `migrate` chờ PostgreSQL healthy, sau đó chạy migration. `Exited (0)` nghĩa là chạy thành công.
- `backend` chờ migration hoàn tất và các dependency healthy, rồi mở cổng 3001 trên host. Chỉ service này có mục `ports` để truy cập từ máy host.
- `networks` cho phép các container tìm nhau bằng tên service. `volumes` giữ dữ liệu khi container được restart hoặc tạo lại.

`depends_on` giúp điều phối lúc khởi động; các thư viện kết nối vẫn cần tự kết nối lại khi dependency tạm ngắt. Dự án đang dùng ioredis và NestJS RabbitMQ transport cho việc này.

## Bước 7. Tạo health endpoint và chuẩn bị migration

Dockerfile gọi `GET /health`, nên backend phải có route này. Ở dự án hiện tại, `src/health.controller.ts` kiểm tra một truy vấn PostgreSQL có dùng cột của model `Book`, lệnh ping Redis và trạng thái Meilisearch. `src/app.module.ts` đăng ký controller, còn `src/main.ts` bật shutdown hook để dừng gọn khi container nhận tín hiệu.

Database không tự có đủ bảng chỉ vì PostgreSQL đã chạy. Prisma migration nằm trong `prisma/migrations/` và được service `migrate` áp dụng bằng `prisma migrate deploy`. Khi kiểm tra lần đầu, schema Prisma có cột `Book.status` nhưng các migration cũ chưa tạo cột đó. Migration `20261014000000_add_book_status` đã được thêm để database mới khớp với mã nguồn. Không sửa các migration cũ đã áp dụng; thêm migration mới khi schema thay đổi.

Seed của dự án có lệnh `TRUNCATE` để xóa dữ liệu mẫu cũ. Seed **không** chạy tự động trong Compose. Đừng chạy seed trên database cần giữ dữ liệu.

## Bước 8. Kiểm tra cấu hình, build và chạy

Chạy từng lệnh để dễ tìm lỗi ở bước nào:

~~~powershell
docker compose config --quiet
docker compose build
docker compose up -d
docker compose ps --all
~~~

`config --quiet` không in gì nếu YAML và biến môi trường hợp lệ. Dùng `--quiet` vì bản `docker compose config` đầy đủ có thể in ra giá trị secret đã thay thế. `build` cài npm package, sinh Prisma Client và biên dịch NestJS; lần đầu cần tải image và package nên có thể mất vài phút.

Sau khi đã hiểu từng bước, một lệnh tương đương để build và chạy là:

~~~powershell
docker compose up -d --build
~~~

Trạng thái cần thấy:

| Service | Kết quả mong đợi | Cổng trên host |
|---|---|---|
| `backend` | `Up ... (healthy)` | `3001`, hoặc `BACKEND_PORT` đã chọn |
| `postgres` | `Up ... (healthy)` | Không publish |
| `redis` | `Up ... (healthy)` | Không publish |
| `rabbitmq` | `Up ... (healthy)` | Không publish |
| `meilisearch` | `Up ... (healthy)` | Không publish |
| `migrate` | `Exited (0)` | Không có |

Nếu `migrate` có `Exited (0)`, đó là kết quả đúng của tác vụ một lần. Nếu backend chưa healthy ngay, chờ một lúc rồi chạy lại `docker compose ps --all`.

## Bước 9. Kiểm tra hoạt động thật

Trong PowerShell, gọi API từ host:

~~~powershell
Invoke-RestMethod 'http://localhost:3001/health'
Invoke-RestMethod 'http://localhost:3001/'
Invoke-RestMethod 'http://localhost:3001/search/books?q=nonexistent'
~~~

`/health` cần trả `status: ok`. API gốc trả `Hello World!`. API tìm kiếm phải phản hồi; kết quả có thể rỗng vì database mới chưa có sách. Nếu đã đổi `BACKEND_PORT` thành 3002, dùng cổng 3002 trong URL.

Đọc log và kiểm tra kết nối:

~~~powershell
docker compose logs --tail=100 migrate backend
docker compose ps --all
docker compose exec -T postgres psql -U bookstore -d bookstore -Atc 'SELECT count(*) FROM _prisma_migrations;'
~~~

Giá trị đếm migration phải lớn hơn 0 với database mới. Nếu đã đổi `POSTGRES_USER` hoặc `POSTGRES_DB`, thay `bookstore` trong lệnh. Backend healthy xác nhận PostgreSQL, Redis và Meilisearch phản hồi; RabbitMQ healthy và kết nối consumer có thể kiểm tra thêm trong log broker:

~~~powershell
docker compose logs --tail=50 rabbitmq
~~~

## Bước 10. Xác nhận dữ liệu không mất sau restart

Ghi lại số migration, restart PostgreSQL, rồi đếm lại:

~~~powershell
docker compose exec -T postgres psql -U bookstore -d bookstore -Atc 'SELECT count(*) FROM _prisma_migrations;'
docker compose restart postgres
docker compose exec -T postgres psql -U bookstore -d bookstore -Atc 'SELECT count(*) FROM _prisma_migrations;'
Invoke-RestMethod 'http://localhost:3001/health'
~~~

Hai số phải bằng nhau. Nếu PostgreSQL vừa restart chưa healthy, đợi vài giây rồi thử lại. Named volume giữ dữ liệu database; RabbitMQ và Meilisearch cũng có named volume riêng.

## Bước 11. Các lệnh vận hành hằng ngày

| Mục đích | Lệnh chạy tại thư mục `backend` |
|---|---|
| Xem toàn bộ container | `docker compose ps --all` |
| Theo dõi log backend | `docker compose logs -f backend` |
| Xem log migration | `docker compose logs migrate` |
| Chạy lại migration | `docker compose run --rm migrate` |
| Restart backend | `docker compose restart backend` |
| Dừng mà giữ dữ liệu | `docker compose stop` |
| Chạy lại sau khi stop | `docker compose up -d` |
| Build lại sau khi sửa mã | `docker compose up -d --build` |

**Không chạy `docker compose down -v` nếu muốn giữ dữ liệu.** Tùy chọn `-v` xóa named volume của project.

## Bước 12. Khi gặp lỗi

| Hiện tượng | Bước xử lý |
|---|---|
| `docker version` chỉ có Client hoặc báo lỗi daemon | Mở Docker Desktop, đợi Engine chạy rồi thử lại. |
| `docker compose config --quiet` báo thiếu biến | Điền biến được báo trong `.env`; không sửa trực tiếp mật khẩu vào Compose. |
| Cổng 3001 đã được dùng | Đổi `BACKEND_PORT=3002` trong `.env`, chạy lại Compose và dùng URL cổng 3002. |
| `migrate` thoát mã khác 0 | Xem `docker compose logs migrate` và trạng thái PostgreSQL. |
| Backend không healthy | Xem `docker compose logs --tail=100 backend`, rồi kiểm tra các dependency bằng `docker compose ps --all`. |
| Báo thiếu cột `Book.status` | Kiểm tra migration mới có trong repo, chạy `docker compose run --rm migrate` rồi restart backend. |
| Đổi `POSTGRES_PASSWORD` sau lần khởi tạo đầu nhưng đăng nhập lỗi | Volume cũ vẫn giữ mật khẩu đã tạo. Dùng lại mật khẩu cũ hoặc đổi mật khẩu trong PostgreSQL; đừng xóa volume để xử lý. |
| Log báo mất kết nối trong lúc restart dependency | Đợi dependency healthy, kiểm tra lại `/health` và log mới. Redis và RabbitMQ cần kết nối lại sau gián đoạn. |

Nếu chỉ cần chạy nhanh trên máy đã được cấu hình sẵn, xem thêm `DOCKER.md`. Tệp này dành cho người muốn hiểu và tự xây dựng toàn bộ cấu hình từng bước.
