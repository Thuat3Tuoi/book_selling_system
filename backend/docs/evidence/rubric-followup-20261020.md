# Đối chiếu bổ sung rubric — 20/10/2026

Đây là lần đánh giá **bản hiện tại**; file chuẩn không có nhận xét tuần 5 của nhóm 9, nên không gán trạng thái “đã sửa góp ý cũ”. [Audit gốc](rubric-audit-20261019.md) và [bằng chứng runtime 19/10](runtime-verification-20261019.md) lưu các phép đo trước thay đổi này. Các container audit dùng Compose project, cổng và volume riêng; không dùng database của project `book-selling-backend` đang chạy trên máy.

## Kết quả kiểm chứng mới

- Backend `npm run lint`, `npm run build`, `npx tsc --noEmit --incremental false`, `npx prisma validate` đều qua. `npm test`: **191/191**, 28 file. Frontend `npm run build` qua TypeScript và static generation; 7 lỗi TypeScript được nêu trong nhận xét trước không còn xuất hiện.
- Trên Compose project mới `bookaudit20261020`, `prisma migrate deploy` áp dụng **10/10** migration trên database trống, seed an toàn tạo 2 customer, 1 staff và sách mẫu. `npm run test:e2e` qua **15/15** ca trong 4 file, gồm ownership hai tài khoản, RBAC, validation sách, giỏ hàng, đơn hàng, broker, cron, cache và tìm kiếm. Database này có cờ `E2E_ISOLATED_DB=YES`.
- Migration `20261020000000_book_search_sync` thêm bảng `BookSearchSync`. Tạo/sửa/ngừng bán sách lưu cả sách và yêu cầu đồng bộ search trong **cùng transaction PostgreSQL**. Worker nhận lease, thử lại theo backoff tối đa 5 phút, và chỉ xóa yêu cầu sau khi tác vụ Meilisearch hoàn tất. Bài test unit kiểm tra lỗi, retry, sách inactive và revision mới.
- Thử gián đoạn thật trên project audit riêng `bookaudit20261019`: dừng Meilisearch, sửa sách và ghi yêu cầu đồng bộ trong một transaction trên **database audit**; worker ghi `attempts=1` và giữ bản ghi. Bật Meilisearch lại: tìm đúng tiêu đề mới và hàng đợi về `0` sau lần kiểm tra đầu tiên. Thử này kiểm tra đường retry của worker; E2E ở trên kiểm tra đường tạo/sửa sách qua HTTP khi các dịch vụ hoạt động.
- Gitleaks v8.30.1 quét toàn bộ patch history với `--log-opts=--all`, **47 commit patch, khoảng 2,59 MB**. Có 1 finding ở `backend/README.md:5` của commit khởi tạo `bf3ee2d`: tham số `token` trong badge CircleCI công khai của **upstream `nestjs/nest`**, dài 12 ký tự, không thuộc API hay dịch vụ của project; giá trị đã được che khi kiểm tra và không ghi vào báo cáo. Không có finding khác. `.env` và `frontend/.env.local` bị Git ignore, `.env.example` có sẵn và backend kiểm tra biến môi trường bắt buộc khi khởi động. Kết quả quét theo rule không chứng minh tuyệt đối mọi secret đều vắng mặt.
- Hai workflow trước thay đổi search đã hoàn tất thành công: [code SHA `2a07301`, run #79](https://github.com/Thuat3Tuoi/book_selling_system/actions/runs/39278199124) và [báo cáo SHA `b9d62e9`, run #80](https://github.com/Thuat3Tuoi/book_selling_system/actions/runs/39279124870). Workflow có backend lint/build/test và frontend build. CI cho thay đổi 20/10 cần chạy trên SHA mới sau khi push.
- Hai image Docker build từ source `2a07301` và `b9d62e9` có cùng toàn bộ RootFS layer và history; digest config khác nhau vì Compose gắn label `com.docker.compose.*`. Image mới từ working tree chạy healthy và E2E qua, nhưng cần gắn kết quả với SHA commit mới trước khi chốt E1.

## Đối chiếu 23 tiêu chí

| Tiêu chí | Trước triển khai | Hiện tại | File/chứng cứ chính |
| --- | --- | --- | --- |
| A1 NestJS | ✅ | ✅ | `src/main.ts`, container healthy |
| F1 Module | ✅ | ✅ | `src/app.module.ts`, DI runtime |
| F2 Controller | ✅ | ✅ | 28 OpenAPI operation có response schema |
| F3 Provider/DI | ✅ | ✅ | Các module khởi tạo trong container |
| F4 Validation | ✅ | ✅ | `books/dtos`, E2E 400 giá âm/field dư/thiếu và 201 hợp lệ |
| F5 Auth/RBAC | 🟡 | ✅ | Guards, hai customer/staff, E2E 401/403/404/200 |
| F6 Envelope/error | ✅ | ✅ | HTTP response và exception filter |
| C1.1 Redis | 🟡 | ✅ | TTL 300 giây, invalidation và outage/recovery |
| C1.2 EXPLAIN | ❌ | ✅ | [Plan trước/sau](explain-orders-20261019.txt): 2,416 ms → 0,339 ms trên 50.001 order audit |
| C1.3 Composite Index | 🟡 | ✅ | Migration `Order_userId_createdAt_idx`, plan dùng index |
| C2.1 RabbitMQ | 🟡 | ✅ | Order outbox, retry, consumer idempotency, DLQ; broker outage đã thử |
| C2.2 Cron | 🟡 | ✅ | Múi giờ `Asia/Ho_Chi_Minh`, hai instance một notification không rỗng |
| C4 Meilisearch | 🟡 | ✅ | Full-text/filter, create/update/delete, `BookSearchSync` tự retry sau outage |
| D1 Git workflow | 🟡 | 🟡 | Nhánh audit có commit/CI; chưa có review chéo hoặc branch protection được xác nhận |
| D2 Reproducibility | 🟡 | ✅ | Clone sạch SHA cũ và Compose một lệnh; project mới lên từ database trống |
| D3 Secret management | 🟡 | ✅ | Env/ignore/validation và Gitleaks history; 1 badge upstream đã phân loại |
| D4 Testing | 🟡 | ✅ | 191 unit/API + 15 E2E; 4 test mới cho retry search |
| D5 GitHub Actions | 🟡 | 🟡 | Run #79/#80 thành công; cần run cho SHA mới |
| D6 OWASP source review | 🟡 | ✅ | Ownership/RBAC, ORM, CORS/Origin, React escaping, lỗi 500, bỏ log địa chỉ giao hàng; đây là review mã và cấu hình, không thay thế pentest |
| D7 Documentation | 🟡 | ✅ | README, Swagger/OpenAPI, hướng dẫn recovery search |
| D8 AI Disclosure | ✅ | ✅ | `backend/docs/AI_DISCLOSURE.md`; nhóm xác nhận mức dùng thực tế |
| E1 Docker/Compose | 🟡 | 🟡 | Image working tree healthy, migration 10/10; cần build từ SHA mới |
| E2 Actions | 🟡 | 🟡 | Cùng run với D5; cần run cho SHA mới |

**Tạm thời: 19 ✅, 4 🟡, 0 ❌.** D1 cần người trong nhóm review thực tế. D5/E1/E2 chỉ nâng khi có commit, image và CI tương ứng; không lấy run của SHA cũ làm bằng chứng cho thay đổi mới.

## Giới hạn còn lại

- `BookSearchSync` chỉ ghi cho thay đổi sách đi qua API. Nếu mất toàn bộ index Meilisearch, chạy seed hoặc sửa trực tiếp PostgreSQL, vẫn cần `docker compose --profile tools run --rm search-reindex`. Trong lúc dịch vụ search dừng, API tìm kiếm không khả dụng.
- Outbox order là giao nhận ít nhất một lần, consumer giữ idempotency; DLQ cần người vận hành xem và quyết định replay. Không tuyên bố exactly-once.
- Chưa có review chéo/branch protection xác nhận cho nhánh audit; chưa thực hiện pentest độc lập. Các kết quả benchmark, outage và E2E chỉ đại diện cho môi trường audit cô lập.
- Không cài dependency mới. Migration mới đã áp dụng trên database audit, chưa áp dụng trên database mặc định của người dùng.
