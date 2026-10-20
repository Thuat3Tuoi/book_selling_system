# Audit rubric NestJS và kết quả triển khai — Nhóm 9

> Đây là mốc audit trước khi Docker Desktop hoạt động. [Báo cáo kiểm chứng runtime tiếp nối](runtime-verification-20261019.md) cập nhật trạng thái sau khi chạy migration, container, E2E và EXPLAIN ANALYZE trên project thử nghiệm riêng.

**Ngày:** 19/10/2026. **HEAD gốc:** `610501cf212580a25a48654863db31e973540bc1`. **Nhánh làm việc:** `audit/rubric-completion-20261019`. Các thay đổi dưới đây còn ở working tree, chưa có SHA mới. Tài liệu này đánh giá bản hiện tại; không có nhận xét tuần 5 trong file chuẩn nên không gán trạng thái “đã sửa góp ý cũ”.

**Mốc “trước”** là working tree đầu lượt audit này, đã chứa các thay đổi chưa commit từ lượt rà soát trước. **Mốc “sau”** là working tree sau các thay đổi của lượt này. Không đồng nhất hai mốc này với HEAD hoặc image Docker.

## I. Tổng quan dự án

| Thành phần | Kết quả khảo sát |
| --- | --- |
| Backend framework | NestJS 12, TypeScript; `NestFactory.create(AppModule)` tại `src/main.ts:9` |
| Database / ORM | PostgreSQL / Prisma 7, `prisma/schema.prisma`, `src/prisma/prisma.service.ts` |
| Cache | Redis qua `src/redis/redis.service.ts`, TTL sách/giỏ 300 giây |
| Message broker | RabbitMQ qua Nest microservice, order outbox và consumer |
| Search engine | Meilisearch, index `books`, API `GET /search/books` |
| Container | `Dockerfile`, `docker-compose.yml` trong backend |
| CI/CD | `.github/workflows/backend-ci.yml`; chỉ có CI, chưa có triển khai tự động được xác minh |
| Testing | Vitest, Supertest, test E2E riêng dùng database thật |
| Nhận xét | Kiến trúc và mã nguồn khá đầy đủ. Bằng chứng chạy thật từ working tree qua tất cả service vẫn thiếu; không thể kết luận nghiệm thu toàn bộ. |

## II. Bảng kiểm tra toàn bộ tiêu chí

Ký hiệu: ✅ đạt, 🟡 đạt một phần, ❌ chưa đạt, ⚪ chưa xác minh, ➖ không áp dụng. “Sau” chỉ đánh giá bằng chứng hiện có; không xem build hoặc test giả lập là E2E thật.

| ID | Tiêu chí | Phân loại | Trước | Sau | Bằng chứng trực tiếp | Phần còn thiếu |
| --- | --- | --- | --- | --- | --- | --- |
| A1 | NestJS | Chính | ✅ | ✅ | `src/main.ts:9`, `src/app.module.ts:25`, package Nest 12 | Không |
| F1 | Module | Lõi | ✅ | ✅ | `AppModule` và các module nghiệp vụ trong `src/app.module.ts` | Không thấy circular dependency ở build |
| F2 | Controller | Lõi | ✅ | ✅ | `src/books/books.controller.ts`, `src/orders/orders.controller.ts`; controller gọi service | Không |
| F3 | Provider / DI | Lõi | ✅ | ✅ | `src/books/books.service.ts`, `src/orders/orders.module.ts`, constructor injection | Không |
| F4 | DTO / ValidationPipe | Chọn thêm | 🟡 | ✅ | `src/main.ts:37`, `src/books/dtos/books-query.dto.ts`, `src/common/http-policy.spec.ts` | Pipe HTTP đã thử cho sách; E2E toàn ứng dụng nằm ở D4 |
| F5 | Guard | Chọn thêm | 🟡 | 🟡 | `src/guards/staff-auth.guard.ts`, `src/orders/orders.service.ts`, HTTP test hai danh tính | Cần xác nhận HTTP 403/404 qua JWT, DB thật |
| F6 | Interceptor | Chọn thêm | ✅ | ✅ | `src/common/interceptors/{logging,response-envelope}.interceptor.ts`, `src/app.module.ts` | Không |
| C1.1 | Redis cache | Nâng cao | 🟡 | 🟡 | `src/redis/redis.service.ts`, `src/books/books.service.ts`, `src/carts/carts.service.ts` | Redis lỗi còn làm hỏng một số request; chưa đo hit/miss thật |
| C1.2 | EXPLAIN ANALYZE | Nâng cao | ❌ | ❌ | Không có execution plan từ PostgreSQL | Cần database thử nghiệm và đo trước/sau |
| C1.3 | Composite index | Nâng cao | 🟡 | 🟡 | `schema.prisma` có `CartItem(cartId,bookId)`, `OutboxEvent(status,nextAttemptAt)`; thêm `Order(userId,createdAt DESC)` | Migration mới chưa áp dụng; chưa có plan chứng minh dùng index |
| C2.1 | RabbitMQ | Nâng cao | 🟡 | 🟡 | `src/orders/order-outbox.publisher.ts`, `dtos/consumers/order-created.consumer.ts`; retry/DLQ/idempotency test | Broker thật, DLQ và phục hồi sau gián đoạn chưa thử |
| C2.2 | Cron | Nâng cao | 🟡 | 🟡 | `src/infrastructure/cron-job/cron-job.service.ts` 08:00 Asia/Ho_Chi_Minh; unique `Notification.eventId` | Cần thử nhiều instance trên DB thật |
| C4 | Meilisearch | Nâng cao | 🟡 | 🟡 | `src/search/search.service.ts` index/search/filter/reindex; chờ task hoàn thành | Đồng bộ sau DB commit vẫn best effort; chưa chạy search thật |
| D1 | Git workflow | Kỹ nghệ | 🟡 | 🟡 | Local branches/merge; [PR #11](https://github.com/Thuat3Tuoi/book_selling_system/pull/11) đã merge | PR #11 hiển thị không có review; branch protection/conflict chưa chứng minh |
| D2 | Tái lập dự án | Kỹ nghệ | 🟡 | 🟡 | Compose hợp lệ; `prisma/seed.safe.ts`, `README.md` | Docker daemon không chạy; chưa clone sạch/chạy một lệnh |
| D3 | Quản lý bí mật | Kỹ nghệ | 🟡 | 🟡 | `.env.example`, `.gitignore`, `src/config/environment.ts`; không thấy `.env` được Git track | Chưa quét được secret trên toàn bộ history/production |
| D4 | Kiểm thử | Kỹ nghệ | 🟡 | 🟡 | 185/185 unit/API test; `test/*.e2e-spec.ts`; coverage hiện tại 77.72% statements | E2E có ghi DB chưa chạy; coverage Redis/user thấp |
| D5 | GitHub Actions CI | Kỹ nghệ | 🟡 | 🟡 | Workflow có install/generate/lint/build/test và frontend build; [run #78 của HEAD thành công](https://github.com/Thuat3Tuoi/book_selling_system/actions/runs/39159181474) | Working tree này chưa push nên chưa có run; không suy ra frontend job đã chạy trên HEAD |
| D6 | OWASP security | Kỹ nghệ | 🟡 | 🟡 | Prisma ORM, bcrypt, JWT/RBAC, ownership, CORS env, lỗi 500 che chi tiết; npm audit hiện 0 advisory | Chưa pentest/CSRF review đầy đủ |
| D7 | README / API docs | Kỹ nghệ | ❌ | 🟡 | `README.md` mới, Swagger `/api-docs`, `nest-cli.json` plugin DTO, Postman collection | Response schema chưa đầy đủ cho mọi endpoint; Swagger chưa chạy từ container |
| D8 | AI Disclosure | Kỹ nghệ | ✅ | ✅ | `docs/AI_DISCLOSURE.md` và README liên kết | Mức sử dụng AI thực tế chỉ nhóm xác nhận được |
| E1 | Docker / Compose | Bổ trợ | 🟡 | 🟡 | Multi-stage `Dockerfile`, Compose healthcheck/volumes, `docker compose config --quiet` đạt | Daemon không kết nối; image/SHA/runtime chưa kiểm chứng |
| E2 | GitHub Actions | Bổ trợ | 🟡 | 🟡 | Cùng workflow D5; có cache npm, push/PR, frontend job | Run cho thay đổi hiện tại chưa có |

## III. Phân tích các mục chưa đạt / đạt một phần

Mỗi dòng nêu hiện trạng và nguyên nhân, phần thiếu, sửa/đường dẫn, ưu tiên, cách xác minh. Các mục chưa thể đo do hạ tầng được giữ 🟡 hoặc ❌ theo mức triển khai, không tự nâng thành ✅.

| ID | Hiện trạng, nguyên nhân và yêu cầu thiếu | Sửa đã làm / cần làm; file | Ưu tiên và xác minh |
| --- | --- | --- | --- |
| F5 | JWT và staff guard hoạt động trong HTTP test có guard thay thế; ownership ở service. Chưa có request qua JWT/Prisma thật. | `src/guards/staff-auth.guard.ts`, `src/orders/orders.service.ts`; chạy hai customer/staff trên DB thử nghiệm. | High; 401/403/404/200/201 đúng policy, không đọc/sửa chéo. |
| C1.1 | TTL 300s và invalidation theo key đã có; cache read/write vẫn phụ thuộc Redis. Thiếu phép đo và fallback. | `src/redis/redis.service.ts`; cần quyết định chính sách fail-open cho read cache và kiểm tra invalidation sách/giỏ sau ghi. | Medium; tắt Redis, đối chiếu response; đo số query hoặc thời gian hit/miss. |
| C1.2 | Chưa xác định được DB thử nghiệm tách biệt để đo, nên không có EXPLAIN ANALYZE. PostgreSQL tự nó không chứng minh tối ưu. | Dùng query GET orders theo user và sách active trên DB thử nghiệm; lưu plan trước/sau vào `docs/evidence/`. | Medium; ghi execution time, scan type, buffers và query tương ứng. |
| C1.3 | Index tổ hợp mới ở schema/migration, chưa tồn tại trên DB đã xác minh. | `prisma/schema.prisma`, `prisma/migrations/20261019020000_order_user_created_index/`; áp trên DB thử nghiệm sau khi xem SQL. | Medium; kiểm tra pg_indexes và EXPLAIN thực tế. |
| C2.1 | Outbox cùng transaction, retry giới hạn, consumer chống notification trùng và DLQ được unit test. Broker thực chưa sẵn. | `src/orders/order-outbox.publisher.ts`, `src/orders/dtos/consumers/order-created.consumer.ts`; kiểm tra queue cũ trước khi đổi queue. | High; tắt/bật broker, phát message trùng, đếm `Notification.eventId` đúng 1. |
| C2.2 | Cron có timezone, bỏ qua danh sách rỗng; thêm eventId duy nhất theo ngày. Chưa thử nhiều instance. | `src/infrastructure/cron-job/cron-job.service.ts`, `src/notifications/notifications.service.ts`. | Medium; chạy đồng thời hai instance trên DB thử nghiệm, đúng 1 notification/ngày. |
| C4 | API tìm kiếm dùng Meilisearch, chờ task index/delete hoàn tất; BooksService vẫn ghi DB trước rồi log lỗi search, cần reindex khi lệch. | `src/search/search.service.ts`, `src/search/reindex.script.ts`; xem xét outbox đồng bộ search nếu cần bảo đảm tự phục hồi. | Medium; thử tạo/sửa/xóa sách và tắt/bật search, đối chiếu index với DB. |
| D1 | Public PR #11 đã merge, nhưng trang PR hiển thị “No reviews”; không có bằng chứng branch protection hoặc conflict. | Đề nghị nhóm bật review rule và lưu link PR/review mới; không tạo bằng chứng giả. | Medium; xem branch rules và review trên GitHub bằng tài khoản có quyền. |
| D2 | Compose cấu hình hợp lệ nhưng Docker API lỗi npipe; seed cũ xóa dữ liệu. | `prisma/seed.safe.ts`, `README.md`; seed cũ nay yêu cầu cờ xác nhận rõ ràng. | High; clone sạch trên máy Docker hoạt động, migrate/seed ở DB thử nghiệm, kiểm tra health. |
| D3 | Env có mẫu và ignore; thêm startup validation nhưng chưa chứng minh không có secret lịch sử. | `src/config/environment.ts`, `.env.example`; thực hiện secret scan trong repo/history bằng công cụ phù hợp. | High; kiểm tra file track và scan lịch sử mà không in giá trị secret. |
| D4 | Unit/API test chạy 185/185; E2E hiện có gọi DB thật và có cleanup, không an toàn để chạy trên DB chưa tách. Coverage hiện tại 77.72% statements (chỉ tính file được import). | `test/auth.e2e-spec.ts`, `src/common/http-policy.spec.ts`; thêm/ chạy E2E isolated cho mua hàng, broker và cache. | High; E2E pass trên database tách biệt, lưu log và coverage toàn source. |
| D5 | HEAD đã có run #78 success cho backend cũ. Workflow mới có frontend nhưng chưa được GitHub chạy. | `.github/workflows/backend-ci.yml`; push/PR branch để chạy. | High; kiểm tra run mới đủ backend + frontend jobs và fail khi test lỗi. |
| D6 | ORM, guard, exception filter và CORS có kiểm soát. Đã xử lý các advisory dependency; chưa kiểm chứng XSS/CSRF và quyền qua stack thật. | `src/auth/`, `src/orders/`, `src/config/environment.ts`; Prisma 7.10.1, source-map-js 1.2.2, bỏ dev dependency không sử dụng. | High; thử HTTP auth/ownership, review cookie/CORS và penetration test trong môi trường cho phép. |
| D7 | README cũ lẫn nội dung Redis, thông tin seed/cache lỗi thời; nay có README mới và Swagger DTO plugin. Response model tự động còn thiếu ở một số route Prisma. | `README.md`, `src/main.ts`, `nest-cli.json`, `docs/API_RESPONSE.md`; bổ sung response examples/schema. | Medium; mở `/api-docs-json` từ app thật, kiểm đủ request/response/auth từng route. |
| E1 | Dockerfile và Compose có healthcheck/volume, config --quiet đạt; daemon Windows không sẵn nên chưa build/run. | `Dockerfile`, `docker-compose.yml`, `DOCKER.md`. | High; build từ SHA chốt, chạy health và API smoke test, ghi image digest. |
| E2 | CI source đã cập nhật cho push/PR và frontend, run mới chưa có. | `.github/workflows/backend-ci.yml`. | High; xác nhận run branch mới trên GitHub. |

## IV. Bảng tổng hợp

| Mốc | ✅ | 🟡 | ❌ | ⚪ | ➖ | Tổng |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trước lượt triển khai | 6 | 15 | 2 | 0 | 0 | 23 |
| Sau lượt triển khai | 7 | 15 | 1 | 0 | 0 | 23 |

Tỷ lệ mục **đạt hoàn toàn** sau triển khai (không có N/A): công nghệ chính và lõi NestJS **4/4 = 100%**; NestJS chọn thêm **2/3 = 66,7%**; nâng cao **0/6 = 0%**; kỹ nghệ phần mềm **1/8 = 12,5%**; công cụ bổ trợ **0/2 = 0%**. Đây chỉ là tỷ lệ checklist, không phải điểm giảng viên; mục 🟡 có triển khai thực nhưng chưa được tính là đạt hoàn toàn.

## V. Việc cần làm, theo ưu tiên

| Ưu tiên | Tiêu chí | Công việc | File / bằng chứng | Xác nhận |
| --- | --- | --- | --- | --- |
| High | D6 | Kiểm chứng quyền, cookie và CSRF trong stack HTTP thật | `src/auth/`, `src/orders/` | Thử nghiệm bảo mật và ghi nhận kết quả |
| High | F5, D4, D6 | Chạy HTTP E2E với hai customer và staff trên DB riêng | `test/`, `src/orders/` | Không đọc/sửa chéo; 403/404 đúng |
| High | D2, E1, C2.1 | Bật Docker daemon, kiểm tra migration/queue cũ, build từ SHA chốt | Compose, migration, RabbitMQ | Health, broker gián đoạn/trùng, 1 notification |
| High | D5, E2, D1 | Tạo PR và xem run CI/review/branch rule | GitHub | Run mới đạt cả hai job và có review thực |
| Medium | C1.2, C1.3 | Đo EXPLAIN ANALYZE trước/sau index trên DB thử nghiệm | `docs/evidence/`, migration | Plan, time, scan type được lưu |
| Medium | C1.1, C4 | Thử Redis và Meilisearch ngắt kết nối; xác định cơ chế phục hồi | service tương ứng | API và index/cache có kết quả đo |
| Medium | C2.2, D7 | Thử cron nhiều instance; hoàn thiện response schema Swagger | cron, docs API | 1 notification/ngày, OpenAPI phản ánh HTTP thật |

## VI. Đánh giá cuối cùng và kiểm chứng

1. **NestJS là backend chính và được dùng đúng cấu trúc**: bootstrap, module, controller, provider/DI đều có mã và build đạt.
2. **Lõi bắt buộc đạt**: Module, Controller, Provider/DI. Không thấy phần chỉ khai báo dependency mà bỏ trống nghiệp vụ trong các công nghệ chính.
3. **Chọn thêm đã triển khai**: DTO/ValidationPipe, Guard, Interceptor. Guard còn cần xác minh qua JWT/DB thật.
4. **Chỉ khai báo/chưa đủ bằng chứng**: composite index mới chỉ ở schema/migration, không khẳng định đang được Postgres dùng; Swagger mới build chứ chưa kiểm HTTP trong container.
5. **Còn thiếu**: EXPLAIN ANALYZE và phép đo truy vấn; E2E tích hợp/benchmark và một số response schema API.
6. **Chưa thể xác minh thực tế**: migration đã áp, container có khớp SHA, broker/search/cache thật, cron nhiều instance, branch protection, run CI cho working tree. Docker daemon trả lỗi `npipe:////./pipe/dockerDesktopLinuxEngine`.
7. **Rủi ro khi nộp ngay**: C1.2 chắc chắn thiếu; các mục 🟡 có thể không được công nhận hoàn toàn nếu yêu cầu bằng chứng chạy thật. PR #11 có 2 checks đạt nhưng trang công khai hiển thị không có review.
8. **Để hoàn thành**: chốt commit/SHA, xem và áp migration trên DB thử nghiệm, chạy E2E và phép đo với service thật, lưu plan/CI/review. Không tự khai 100% trước khi có bằng chứng.

### Lệnh đã thực sự chạy trong working tree

| Lệnh | Kết quả |
| --- | --- |
| `backend: npm ci` | Cài lại 513 package từ lockfile, đạt; npm audit 0 |
| `backend: npm test` | 185/185 test đạt (27 file); bao gồm HTTP pipe, ownership giả lập, outbox/broker lỗi giả lập |
| `backend: npm run test:cov` | 185/185 test; statements 77.72%, branches 66.05%, functions 67.69%, lines 77.87%. Coverage chỉ tính file được import, nên không đại diện toàn bộ source. |
| `backend: npm run lint`, `npm run build` | Đạt |
| `backend: npx tsc --noEmit --incremental false` | Đạt sau sửa import type E2E |
| `backend: npx prisma validate`, `npm run prisma:generate` | Đạt; **không** áp migration |
| `frontend: npm run build` | Đạt, gồm typecheck |
| `backend: docker compose config --quiet` | Đạt về cú pháp |
| `docker ps` | Không kết nối daemon; **không** chạy E2E |
| `npm audit`, `npm audit --omit=dev` | 0 advisory sau khi cập nhật dependency và bỏ package dev không sử dụng |

### Thay đổi, dependency và migration

- Bổ sung validation phân trang, refresh token từ cookie/body có rotation, kiểm tra account/session hết hạn, CORS và biến môi trường; cron chống trùng theo ngày, chờ task Meilisearch, đăng ký role CUSTOMER theo enum, seed mẫu không xóa dữ liệu, Swagger/OpenAPI, README và CI cho mọi nhánh. Các thay đổi bảo mật/order/outbox/cache/frontend từ lượt trước vẫn ở working tree; xem `review-20261019.md`.
- Dependency mới: `@nestjs/swagger`. Nâng Prisma và adapter lên 7.10.1, source-map-js lên 1.2.2 trong lockfile; bỏ `@nestjs/mau`, `jest`, `ts-jest`, `@types/jest` không dùng. `npm audit` hiện 0 advisory. Không thêm công nghệ ngoài rubric.
- Migration mới ở lượt này: `20261019020000_order_user_created_index` và `20261019030000_user_role_default`. Migration outbox và domain enum từ lượt trước cũng **chưa được chạy**. Cần xem dữ liệu hiện tại, nhất là giá trị enum lạ, trước khi áp.
- Seed an toàn dùng `docker compose --profile tools run --rm seed-safe`, yêu cầu `SEED_SAMPLE_DATA=YES` và mật khẩu do người chạy đặt; seed cũ yêu cầu `SEED_RESET_DATA=YES_I_UNDERSTAND`. Không chạy cả hai trong lượt này.
- Tệp `.docx` untracked có sẵn của người dùng được giữ nguyên. Không push, merge, force push hoặc tạo PR.

**Kết luận:** Đã cải thiện các khoảng trống có thể sửa an toàn trong mã nguồn, nhưng chưa nghiệm thu hoàn toàn vì thiếu runtime, migration, E2E và EXPLAIN ANALYZE. Báo cáo này là kiểm tra mã nguồn/cấu hình, không thay thế pentest.

## VII. Bảng kết quả triển khai và cách kiểm chứng tiếp

| Tiêu chí | Trước triển khai | Sau triển khai | File đã sửa/tạo | Kết quả kiểm chứng |
| --- | --- | --- | --- | --- |
| F4 | 🟡 | ✅ | `src/books/dtos/books-query.dto.ts`, `src/auth/dto/refresh-token.dto.ts` | HTTP test phân trang/sách 400/201; 183 test đạt |
| F5, D6 | 🟡 | 🟡 | `src/auth/auth.service.ts`, `src/user/user.service.ts` và guard/order từ lượt trước | Rotation token, session/role/status và ownership unit/API test đạt; thiếu E2E thật |
| C1.3 | 🟡 | 🟡 | `schema.prisma`, migration `20261019020000_order_user_created_index` | Prisma validate đạt; chưa áp migration/đo plan |
| C2.2 | 🟡 | 🟡 | `src/infrastructure/cron-job/cron-job.service.ts`, `src/notifications/notifications.service.ts` | Unit test eventId/ngày và duplicate đạt; chưa chạy đa instance |
| C4 | 🟡 | 🟡 | `src/search/search.service.ts`, `src/search/reindex.script.ts`, Compose tool | Test task failed, rebuild xóa stale đạt; chưa chạy Meilisearch thật |
| D2, E1 | 🟡 | 🟡 | `prisma/seed.safe.ts`, `docker-compose.yml`, `DOCKER.md` | Compose config cả profile mặc định và tools đạt; Docker daemon không sẵn |
| D3 | 🟡 | 🟡 | `src/config/environment.ts`, `.env.example` | Test env thiếu/CORS sai và build đạt; chưa secret scan giá trị toàn lịch sử |
| D4 | 🟡 | 🟡 | `src/auth/auth.service.spec.ts`, `src/auth/auth.controller.spec.ts`, `src/config/environment.spec.ts` và test từ lượt trước | 185/185 test; E2E chưa chạy lượt này |
| D5, E2 | 🟡 | 🟡 | `.github/workflows/backend-ci.yml` | File có push/PR, backend+frontend jobs; working tree chưa có run |
| D6 | 🟡 | 🟡 | `package.json`, `package-lock.json`, auth/config | npm audit 0; chưa pentest/CSRF review đầy đủ |
| D7 | ❌ | 🟡 | `README.md`, `src/main.ts`, `nest-cli.json` | Swagger metadata được build; chưa xem JSON từ container |

**Thứ tự thử trên môi trường riêng:** chốt commit/SHA → xem và áp migration trên DB thử nghiệm → `docker compose up -d --build` → nếu cần dữ liệu mẫu chạy `docker compose --profile tools run --rm seed-safe` → kiểm `/health`, `/api-docs-json`, quyền hai customer/staff, luồng mua hàng/broker → đo EXPLAIN và cache/search. Reindex search thủ công bằng `docker compose --profile tools run --rm search-reindex`; thao tác này xây lại toàn bộ index sách và có thể gây thiếu kết quả tạm thời.
