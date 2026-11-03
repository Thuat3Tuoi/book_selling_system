# Sử dụng AI và khai báo phạm vi hỗ trợ

Tài liệu hướng dẫn sử dụng AI trong quá trình phát triển và kiểm tra mã nguồn. Thành viên chịu trách nhiệm đọc, chỉnh sửa và xác nhận nội dung trước khi đưa vào dự án.

## 1. Công cụ và phạm vi hỗ trợ

Các công cụ hỗ trợ dự án gồm Claude và OpenAI Codex. Phạm vi hỗ trợ gồm đọc và giải thích mã nguồn, đề xuất sửa DTO/Pipe, tích hợp tìm kiếm, rà soát chức năng sách và giỏ hàng, tạo test, kiểm tra cấu hình Docker/CI và soạn hướng dẫn.

Khi khai báo phần việc có AI hỗ trợ, nêu công cụ, mục đích, các tệp liên quan và phần chỉnh sửa do thành viên thực hiện. Không coi mã hoặc nội dung AI sinh ra là kết quả được bảo đảm đúng.

## 2. Quy trình áp dụng đề xuất

1. Cung cấp yêu cầu, đoạn mã và lỗi cần xử lý; loại bỏ token, mật khẩu, nội dung `.env` và dữ liệu cá nhân.
2. Đọc đề xuất, đối chiếu với mã nguồn và xác định các thay đổi cần áp dụng.
3. Kiểm tra diff, kiểu dữ liệu, quyền truy cập và cách xử lý lỗi.
4. Chạy lint, typecheck, build và các test liên quan theo [hướng dẫn kiểm thử](TESTING.md).
5. Với thay đổi liên quan database hoặc dịch vụ ngoài, chạy thử trên môi trường riêng cho kiểm thử.
6. Review thay đổi qua pull request và đọc kết quả GitHub Actions trước khi merge.

## 3. Cách ghi nhận trong pull request

Mô tả vấn đề, hành vi sau thay đổi, phần AI hỗ trợ và các lệnh dùng để kiểm tra. Phân biệt kết quả local với kết quả CI; chỉ ghi kết quả từ lệnh thực sự được thực hiện. Nếu còn lỗi hoặc giới hạn chưa xử lý, nêu rõ phạm vi ảnh hưởng.

Lưu đầu ra kiểm thử hoặc phép đo trong `backend/artifacts/` khi cần đối chiếu. Thư mục này được Git bỏ qua; không chép log chạy hoặc thông tin bí mật vào tài liệu hướng dẫn.
