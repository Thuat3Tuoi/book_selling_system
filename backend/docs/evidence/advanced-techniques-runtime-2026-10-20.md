# Kiểm chứng kỹ thuật nâng cao — 2026-10-20

Môi trường thử độc lập: PostgreSQL 17 (`review2`), Redis 7, RabbitMQ 3 và Meilisearch 1.15 trong các container tạm **không gắn volume project**; backend chạy tại `127.0.0.1:53001` với cấu hình riêng cho bài kiểm tra. Không dùng dữ liệu hoặc secrets của project. Container và dữ liệu tạm được dọn sau kiểm thử.

| Luồng kiểm thử | Kết quả quan sát |
| --- | --- |
| `GET /books?page=1&limit=10` hai lần | Log `CACHE MISS` rồi `CACHE HIT`; key Redis có TTL 300 giây. |
| Sửa giá sách qua `PATCH /books/2` | Request mới đọc key `books:page:1:limit:10:rev:1` thay `rev:0`; giá trả về 95. |
| Dừng Redis rồi gọi `GET /books/1` | API vẫn trả thành công từ PostgreSQL, tồn kho 10; request đo được 1897 ms. |
| Tạo sách và cập nhật giá | Outbox `book.changed` được publish; `GET /search/books` với q/category/sort trả document đã cập nhật. |
| Tạo order | API trả order id 1; tồn kho 12 → 10; outbox order được publish và tạo một notification. Sau khi chuyển cache sang key phiên bản, tạo order id 2 làm phiên bản giỏ của user 1 tăng từ chưa có lên 1, tồn kho sách còn 9. |
| Gửi lại cùng `order.created` | Notification có `eventKey=order.created:1` vẫn chỉ có 1 hàng. |
| Gửi message `order.created` tham chiếu user không tồn tại | Sau ba lần xử lý thất bại, queue `review_book_queue.dead` có 1 message; queue chính không còn message chờ. |
| Dừng RabbitMQ rồi tạo sách | API vẫn tạo sách id 2, outbox `book.changed` ở trạng thái chưa publish. Sau khi broker khởi động lại, outbox được publish và sách xuất hiện trong tìm kiếm. |
| Chèn document tìm kiếm cũ id 999, xóa document id 1 rồi chạy `npm run search:reindex` | Script hoàn tất; index chỉ còn id 1 và 2, khớp hai sách ACTIVE trong PostgreSQL. |
| Lặp lại thao tác trên rồi khởi động backend | `SearchReconcileService` đối soát lúc khởi động; index trở lại id 1 và 2. |
| Dừng Meilisearch | `GET /search/books` trả HTTP 503; `GET /books` vẫn thành công với tổng 2 sách. |
| Gọi tác vụ low stock hai lần trong Nest application context | Chỉ có một notification với `eventKey=low-stock:2026-10-20:1`. Lịch tự chạy đúng 08:00 chưa được quan sát trực tiếp. |

Đây là kiểm thử trên dữ liệu tạm và cấu hình local. Các số liệu phản hồi ở đây chỉ là quan sát của lần chạy đó; không thể suy rộng thành hiệu năng production.
