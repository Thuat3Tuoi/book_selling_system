# Hệ thống bán sách trực tuyến - Nhóm 9

Hệ thống bán sách trực tuyến gồm backend NestJS tại `backend/` và frontend Next.js tại `frontend/`. Tài liệu này hướng dẫn cấu hình và chạy toàn hệ thống bằng **Compose tại thư mục gốc**. Hướng dẫn triển khai riêng backend nằm tại [backend/DOCKER.md](backend/DOCKER.md).

## Cách chạy các lệnh trong tài liệu

Các lệnh trong README sử dụng **Bash trên Linux hoặc Git Bash trên Windows**. Trên Linux, mở Terminal; trên Windows, mở thư mục dự án bằng **Git Bash Here**. Nếu dùng terminal tích hợp của VS Code, chọn **Terminal → Select Default Profile → Git Bash**, rồi mở terminal mới.

Chuyển đến thư mục gốc `book-selling-system/` trước khi chạy từng nhóm lệnh. Trong Git Bash, ổ `D:` được viết thành `/d/`, dùng dấu `/` trong đường dẫn và đặt đường dẫn chứa khoảng trắng hoặc ký tự `[`/`]` trong dấu nháy. Ví dụ với vị trí dự án trên Windows:

```bash
cd '/d/SGU/Nam4/[T6-Chieu]-CCNLTHD/book-selling-system'
```

Trên Linux, thay đường dẫn trên bằng đường dẫn thực tế đến bản sao dự án, chẳng hạn `cd "$HOME/book-selling-system"`.

| Lệnh Bash | Cách sử dụng |
| --- | --- |
| `pwd` | Xem thư mục đang làm việc. |
| `ls -a` | Liệt kê tệp, gồm cả tệp ẩn như `.env`. |
| `cd backend` / `cd ..` | Vào thư mục `backend/` / trở về thư mục cha. |
| `cp .env.example .env` | Sao chép cấu hình mẫu; chỉ chạy khi chưa có `.env`. |

Sao chép các dòng trong khối `bash` vào terminal theo thứ tự; dòng bắt đầu bằng `#` là chú thích. Các lệnh npm cần Node.js và npm đã được cài đặt trên máy.

## 1. Môi trường và cấu hình triển khai

Môi trường triển khai sử dụng Docker Desktop hoặc Docker Engine với Compose v2. Tệp `.env` tại **thư mục gốc** được tạo từ `.env.example`, gồm các biến `POSTGRES_PASSWORD`, `RABBITMQ_PASSWORD`, `MEILISEARCH_API_KEY`, `JWT_SECRET` và `SEED_DEFAULT_PASSWORD`. `JWT_SECRET` có độ dài tối thiểu 32 ký tự; mật khẩu PostgreSQL và RabbitMQ sử dụng chuỗi an toàn trong URL, chẳng hạn chuỗi hex. Các giá trị `CORS_ORIGINS` và `NEXT_PUBLIC_API_URL` tương ứng với cổng frontend và backend được cấu hình. Tệp `.env` chứa thông tin bí mật và được loại khỏi nội dung commit.

Trình tự khởi động tại thư mục gốc (bước sao chép chỉ thực hiện khi chưa có `.env`):

```bash
cp .env.example .env
# Điền các giá trị còn trống trong .env
docker compose config --quiet
docker compose up --build -d
docker compose ps --all
```

Compose chờ PostgreSQL, Redis, RabbitMQ và Meilisearch sẵn sàng, áp dụng migration, chạy `prisma/seed.safe.ts`, xây dựng lại chỉ mục sách rồi khởi động backend và frontend. Seed bổ sung các bản ghi mẫu còn thiếu vào database của Compose project và giữ nguyên dữ liệu, mật khẩu đã tồn tại. Dữ liệu mẫu gồm ba vai trò `ADMIN`, `STAFF`, `CUSTOMER`, sáu tài khoản và 20 sách, trong đó có *Clean Code*. Mật khẩu khởi tạo được lấy từ `SEED_DEFAULT_PASSWORD`. Seed mặc định bật trong Compose gốc; đặt `DEMO_SEED_ENABLED=false` để bỏ qua dữ liệu demo. Phạm vi sử dụng seed là môi trường phát triển và kiểm thử. Khi tái sử dụng volume cũ, mật khẩu tài khoản đã tồn tại được giữ nguyên.

| Vai trò | Tài khoản mẫu |
| --- | --- |
| ADMIN | `admin@bookstore.example.com` |
| STAFF | `staff@bookstore.example.com` |
| CUSTOMER | `minh.tran@example.com`, `thao.le@example.com`, `hoang.vo@example.com`, `mai.do@example.com` |

## 2. Địa chỉ truy cập và vận hành

| Thành phần | Địa chỉ |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Health | `http://localhost:3001/health` |
| Swagger UI / OpenAPI JSON | `http://localhost:3001/api/docs` / `http://localhost:3001/api/docs-json` |
| PostgreSQL, Redis, RabbitMQ, Meilisearch | Chỉ trong mạng Compose, không mở cổng host |

Khi truy cập từ máy chạy Docker, dùng `http://localhost:3000` hoặc `http://127.0.0.1:3000`. Frontend giữ cùng hostname local khi gọi API; cấu hình CORS mẫu cho phép các địa chỉ loopback ở cổng `3000`. Nếu đổi cổng, cập nhật `CORS_ORIGINS` theo đúng giao thức, hostname và cổng frontend.

Khi truy cập từ máy khác trong mạng LAN, đặt `NEXT_PUBLIC_API_URL` theo địa chỉ backend mà máy đó truy cập được, đồng thời thêm origin frontend tương ứng vào `CORS_ORIGINS`. Build lại frontend sau khi đổi `NEXT_PUBLIC_API_URL` vì biến này được đưa vào mã JavaScript khi build.

API `/auth/login` trả access token sau khi đăng nhập. Tài khoản staff phục vụ thao tác tạo và sửa sách; các tài khoản customer phục vụ thử giỏ hàng và đơn hàng. E2E tự đăng ký hai khách hàng mới mỗi lần chạy để kiểm tra phân quyền độc lập với dữ liệu demo. Nhật ký các dịch vụ được truy xuất bằng `docker compose logs --tail=100 migrate seed-safe search-reindex backend frontend`. Lệnh `docker compose down` dừng hệ thống và giữ dữ liệu. Lệnh `docker compose down -v` **xóa các volume dữ liệu** của Compose project đang chọn.

## 3. Công nghệ và vị trí triển khai

| Thành phần | Mã nguồn và hướng dẫn |
| --- | --- |
| NestJS Module, Controller, Provider/DI | `backend/src/app.module.ts` và các module nghiệp vụ |
| DTO/Pipe, Guard, Interceptor | `backend/src/main.ts`, `backend/src/guards/`, `backend/src/common/interceptors/` |
| Redis cache | `backend/src/redis/`, cache sách và giỏ; [tài liệu kỹ thuật](backend/src/redis/README.md) |
| PostgreSQL `EXPLAIN ANALYZE`, index tổ hợp | `backend/prisma/schema.prisma`, migrations; `npm run db:explain` |
| RabbitMQ và tác vụ định kỳ | `backend/src/infrastructure/rabbitmq/`, `backend/src/infrastructure/cron-job/` |
| Meilisearch | `backend/src/search/`; [tài liệu kỹ thuật](backend/src/search/README.md) |
| Docker Compose, dữ liệu mẫu | `compose.yaml`, `backend/Dockerfile`, `backend/prisma/seed.safe.ts` |
| GitHub Actions | [.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml) kiểm tra backend và frontend mỗi lần push/PR |
| Kiểm thử và OpenAPI | `backend/src/**/*.spec.ts`, `backend/test/`, Swagger tại `/api/docs` |

## 4. Quy trình kiểm thử

Từ thư mục gốc, các bước kiểm tra backend gồm cài đặt dependency, kiểm tra mã nguồn, kiểm tra kiểu dữ liệu, biên dịch và chạy unit test. Lệnh `cd ..` cuối khối đưa terminal trở về thư mục gốc:

```bash
cd backend
npm ci
npm run lint
npm run typecheck
npm run build
npm test
cd ..
```

Kiểm thử trên dịch vụ thật cần PostgreSQL, Redis, RabbitMQ và Meilisearch **riêng cho kiểm thử**, có thể truy cập từ tiến trình Node.js chạy test. Cấu hình các biến kết nối trong môi trường hoặc `backend/.env`: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `RABBITMQ_URL`, `RABBITMQ_QUEUE`, `RABBITMQ_DURABLE=true`, `RABBITMQ_PERSISTENT=true`, `MEILISEARCH_HOST`, `MEILISEARCH_API_KEY`, `JWT_SECRET`, `CORS_ORIGINS` và `SEED_DEFAULT_PASSWORD`. Cấu hình mẫu đầy đủ cho CI nằm trong [.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml). Compose mặc định giữ các dịch vụ dữ liệu trong mạng Docker; chạy test từ host cần môi trường thử có cổng kết nối riêng.

Sau bước build, chạy tại `backend/` với các biến trỏ tới môi trường thử:

```bash
npx prisma migrate deploy
NODE_ENV=test DEMO_SEED_ENABLED=true npm run prisma:seed:safe
E2E_ISOLATED_DB=YES NODE_ENV=test npm run test:runtime
```

`test:runtime` tự khởi động API trên một cổng trống, đợi `/health`, chạy toàn bộ E2E (gồm HTTP mua hàng, Redis TTL/invalidation, tìm kiếm/lọc/sắp xếp, CORS, cron), kiểm tra RabbitMQ trùng sự kiện/retry/dead queue và đo `EXPLAIN ANALYZE`, rồi dừng API do lệnh tạo. `SEED_DEFAULT_PASSWORD` phải khớp mật khẩu staff trong database thử. Lệnh `test:e2e` vẫn dùng được với API có sẵn nếu đặt `E2E_BASE_URL`, `E2E_SAMPLE_PASSWORD` và `E2E_ALLOWED_ORIGIN`; khi thiếu `E2E_BASE_URL`, suite HTTP sẽ bị bỏ qua. CI dùng `test:runtime` để chạy đầy đủ suite này.

Đo riêng truy vấn PostgreSQL tại `backend/`:

```bash
EXPLAIN_OUTPUT=artifacts/orders-explain.json npm run db:explain
```

Lệnh xác nhận index ứng dụng đã được migrate, tạo 40.000 đơn tổng hợp trong **bảng tạm**, đo trước/sau index tương đương rồi rollback. Kết quả JSON có plan và thời gian thực thi; lệnh không sửa dữ liệu hoặc index của bảng `Order`. CI lưu JSON này thành artifact `postgres-explain`.

Xem [hướng dẫn kiểm thử](backend/docs/TESTING.md) để chạy riêng từng nhóm kiểm tra và lưu đầu ra vào `backend/artifacts/`.

Kiểm tra frontend từ thư mục gốc:

```bash
cd frontend
npm ci
npm run lint
npm run build
cd ..
```

## 5. Bài thực hành RabbitMQ

Thư mục **[hands-on-lab/](hands-on-lab/README.md)** chứa bài thực hành 40 phút về RabbitMQ, gồm retry có giới hạn, dead queue và ACK/NACK. Nội dung gồm starter code, ba bài tập, bốn test, đáp án và biểu mẫu kết quả. Môi trường chạy sử dụng Node.js và npm, độc lập với backend và các dịch vụ Docker.

Trình tự khởi chạy bài thực hành từ thư mục gốc:

```bash
cd hands-on-lab
npm ci
npm test
```

Trạng thái kiểm thử ban đầu của starter là 1 test thành công và 3 test thất bại. Tiêu chí hoàn thành là 4/4 test thành công. Khi chia sẻ bài thực hành, sao chép toàn bộ thư mục `hands-on-lab/` và loại trừ `node_modules/`.

## 6. Bảo mật và sử dụng AI

Backend giới hạn CORS theo origin, sử dụng DTO validation, guard phân quyền, bcrypt cho mật khẩu và Prisma cho truy vấn dữ liệu. Frontend hiển thị văn bản qua React JSX. Khi triển khai, dùng secret riêng, không commit `.env` và thay thế các khóa hoặc mật khẩu từng bị lộ trong Git, log hay tệp chia sẻ. Chạy E2E trên database và dịch vụ riêng cho kiểm thử.

Xem [hướng dẫn sử dụng AI và khai báo phạm vi hỗ trợ](backend/docs/AI_DISCLOSURE.md) khi phát triển hoặc cập nhật dự án.
