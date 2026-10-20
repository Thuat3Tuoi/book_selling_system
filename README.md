# Hệ thống bán sách trực tuyến - Nhóm 9

Hệ thống bán sách trực tuyến gồm backend NestJS tại `backend/` và frontend Next.js tại `frontend/`. Nội dung đối chiếu giữa hồ sơ đề tài và mã nguồn được trình bày trong [biên bản ngày 21/10/2026](backend/docs/evidence/audit-2026-10-21.md). Tài liệu này trình bày cấu hình triển khai toàn hệ thống bằng **Compose tại thư mục gốc**. Cấu hình triển khai riêng backend được trình bày tại [backend/DOCKER.md](backend/DOCKER.md).

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

Compose chờ PostgreSQL, Redis, RabbitMQ và Meilisearch sẵn sàng, áp dụng migration, chạy `prisma/seed.safe.ts`, xây dựng lại chỉ mục sách rồi khởi động backend và frontend. Seed bổ sung các bản ghi mẫu còn thiếu vào database của Compose project và giữ nguyên dữ liệu, mật khẩu đã tồn tại. Dữ liệu mẫu gồm các vai trò `ADMIN`, `STAFF`, `CUSTOMER`; các tài khoản `staff@bookstore.example.com`, `customer-a@bookstore.example.com`, `customer-b@bookstore.example.com`; và sách *Clean Code*. Mật khẩu khởi tạo của ba tài khoản được lấy từ `SEED_DEFAULT_PASSWORD`. Phạm vi sử dụng seed là môi trường phát triển và kiểm thử. Khi tái sử dụng volume cũ, mật khẩu tài khoản đã tồn tại được giữ nguyên.

## 2. Địa chỉ truy cập và vận hành

| Thành phần | Địa chỉ |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API | `http://localhost:3001` |
| Health | `http://localhost:3001/health` |
| Swagger UI / OpenAPI JSON | `http://localhost:3001/api/docs` / `http://localhost:3001/api/docs-json` |
| PostgreSQL, Redis, RabbitMQ, Meilisearch | Chỉ trong mạng Compose, không mở cổng host |

API `/auth/login` trả access token sau khi đăng nhập. Tài khoản staff phục vụ thao tác tạo và sửa sách; hai tài khoản customer phục vụ kiểm thử phân quyền sở hữu giỏ hàng và đơn hàng. Nhật ký các dịch vụ được truy xuất bằng `docker compose logs --tail=100 migrate seed-safe search-reindex backend frontend`. Lệnh `docker compose down` dừng hệ thống và giữ dữ liệu. Lệnh `docker compose down -v` **xóa các volume dữ liệu** của Compose project đang chọn.

## 3. Công nghệ và vị trí triển khai

| Yêu cầu trong hồ sơ | Vị trí triển khai và kiểm chứng |
| --- | --- |
| NestJS Module, Controller, Provider/DI | `backend/src/app.module.ts` và các module nghiệp vụ |
| DTO/Pipe, Guard, Interceptor | `backend/src/main.ts`, `backend/src/guards/`, `backend/src/common/interceptors/` |
| Redis cache | `backend/src/redis/`, cache sách và giỏ; [tài liệu kỹ thuật](backend/src/redis/README.md) |
| PostgreSQL `EXPLAIN ANALYZE`, index tổ hợp | `backend/prisma/schema.prisma`, migrations; [kết quả đo](backend/docs/evidence/postgres-explain-2026-10-20.md) |
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

Điều kiện chạy `npm run test:e2e` tại `backend/` gồm database **kiểm thử riêng**, các dịch vụ phụ thuộc và biến môi trường `E2E_ISOLATED_DB=YES`. Trong Bash, đặt biến cho riêng lệnh bằng cú pháp `E2E_ISOLATED_DB=YES npm run test:e2e` sau khi đã cấu hình đầy đủ môi trường kiểm thử. Database có dữ liệu thực tế nằm ngoài phạm vi chạy E2E. [Backend CI](.github/workflows/backend-ci.yml) sử dụng Bash trên Ubuntu, tạo database và thông tin xác thực dùng một lần, áp dụng migration, khởi tạo dữ liệu mẫu rồi chạy E2E.

Kiểm tra frontend từ thư mục gốc:

```bash
cd frontend
npm ci
npm run lint
npm run build
cd ..
```

## 5. Nội dung thực hành và gói bàn giao

Thư mục **[hands-on-lab/](hands-on-lab/README.md)** chứa bài thực hành 40 phút về RabbitMQ, gồm retry có giới hạn, dead queue và ACK/NACK. Gói thực hành gồm starter code, ba bài tập, bốn test, đáp án và biểu mẫu kết quả phục vụ thực hành và chấm chéo. Môi trường chạy sử dụng Node.js và npm, độc lập với backend và các dịch vụ Docker.

Trình tự khởi chạy bài thực hành từ thư mục gốc:

```bash
cd hands-on-lab
npm ci
npm test
```

Trạng thái kiểm thử ban đầu của starter là 1 test thành công và 3 test thất bại. Tiêu chí hoàn thành là 4/4 test thành công. Gói bàn giao gồm toàn bộ thư mục `hands-on-lab/`, được nộp cùng báo cáo và loại trừ `node_modules/`.

## 6. Biện pháp bảo mật và phạm vi kiểm chứng

Backend giới hạn CORS theo origin, sử dụng DTO validation, guard phân quyền, bcrypt cho mật khẩu và Prisma cho truy vấn dữ liệu. Frontend hiển thị văn bản qua React JSX. Phạm vi kiểm chứng hiện tại bao gồm các biện pháp được ghi nhận trong mã nguồn; việc kiểm thử toàn bộ OWASP Top 10 chưa được thực hiện. Lịch sử Git từng chứa tệp `.env` gốc. Thay thế toàn bộ khóa và mật khẩu đã xuất hiện trong lịch sử là điều kiện trước khi triển khai thực tế. Phạm vi sử dụng AI và phương pháp kiểm chứng được ghi trong [AI Disclosure](backend/docs/AI_DISCLOSURE.md).

Các kết quả runtime trong `backend/docs/evidence/` được ghi nhận theo ngày, phiên bản và phạm vi kiểm thử riêng. Minh chứng cho phiên bản bàn giao được xác lập bằng kết quả kiểm chứng trên commit tương ứng.
