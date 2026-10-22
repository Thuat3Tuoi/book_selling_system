# AI Disclosure - Nhóm 9

Tài liệu ghi nhận nguồn gốc các phần việc có AI hỗ trợ, phương pháp kiểm chứng và phạm vi kết quả. Nội dung khai báo công việc thuộc trách nhiệm xác nhận của từng thành viên trước khi nộp báo cáo.

## 1. Ghi nhận trước ngày 21/10/2026

Lịch sử Git lưu bản tự khai của thành viên **Viet** tại commit `d084c9a` (`backend/docs/AI_DISCLOSURE.md`). Nội dung ghi nhận việc sử dụng Claude để đọc và rà soát mã nguồn, hỗ trợ sửa DTO và Pipe, tích hợp Meilisearch, sửa chức năng sách và giỏ hàng, tạo test và giải thích lỗi. Theo bản tự khai, thành viên đã áp dụng patch, chạy unit test/E2E và kiểm tra các test mới trên mã nguồn trước và sau sửa. Nguồn của các thông tin này là **bản khai của thành viên trong lịch sử Git**; đợt hiện tại chưa kiểm chứng độc lập lại các kết quả đó. Lệnh truy xuất bản ghi là `git show d084c9a:backend/docs/AI_DISCLOSURE.md`.

## 2. Phạm vi hỗ trợ ngày 21/10/2026

- **Công cụ:** OpenAI Codex.
- **Đầu vào:** PDF hồ sơ đề tài nhóm 9, mã nguồn và tài liệu trong repository. Nội dung PDF là căn cứ đối chiếu yêu cầu đề tài.
- **Việc AI hỗ trợ:** lập bảng đối chiếu công nghệ; rà soát đường chạy Compose, CI và tài liệu; đề xuất và chỉnh script/target seed an toàn, thêm kiểm tra frontend trong CI, sửa cấu hình E2E theo origin, cập nhật README và tài liệu này.
- **Phương pháp kiểm chứng:** chạy lint, typecheck, build và unit test; build Compose trên project Docker cô lập, kiểm tra migration/seed/reindex/health/HTTP; chạy E2E với database cô lập. Kết quả và phạm vi được ghi trong [biên bản ngày 21/10/2026](evidence/audit-2026-10-21.md).
- **Thông tin môi trường thử:** script HTTP local đọc `SEED_DEFAULT_PASSWORD` từ `.env` để đăng nhập tài khoản mẫu và lấy các biến kết nối thử từ Compose; giá trị bí mật không được in vào kết quả hoặc ghi vào tài liệu.

## 3. Phạm vi kết quả và trách nhiệm xác nhận

Kết quả kiểm chứng áp dụng cho các lệnh, phiên bản mã nguồn và môi trường được ghi trong biên bản. Tính đúng đắn của từng nội dung AI hỗ trợ được xác định qua rà soát mã nguồn và kiểm thử tương ứng. Việc kiểm thử toàn bộ OWASP Top 10 chưa nằm trong kết quả đã ghi nhận. Trạng thái GitHub Actions được xác định từ lần chạy trên GitHub của commit hoặc PR tương ứng; kết quả local được ghi nhận riêng theo môi trường thực thi.

Nội dung `.env` thực tế và mật khẩu được loại khỏi báo cáo. Trách nhiệm của người duyệt cuối cùng gồm kiểm tra diff, thực hiện lại các bước kiểm chứng cần thiết và xác nhận nội dung khai báo.
