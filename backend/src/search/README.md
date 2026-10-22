# Meilisearch: tìm sách và tạo lại index

Meilisearch phục vụ `GET /search/books` qua index `books`. PostgreSQL lưu dữ liệu sách gốc. Hướng dẫn này dùng Bash (Linux hoặc Git Bash); chạy các lệnh Docker tại **thư mục gốc repository** sau khi đã [khởi động toàn hệ thống](../../../README.md).

## Kiểm tra dịch vụ

```bash
docker compose ps meilisearch backend
docker compose exec -T meilisearch curl --fail --silent http://127.0.0.1:7700/health
curl -fsS http://localhost:3001/health
```

Meilisearch trả `{"status":"available"}`. Endpoint `/health` của backend còn kiểm tra PostgreSQL và Redis. Compose kết nối backend đến `http://meilisearch:7700` và không mở cổng 7700 ra máy host; `MEILISEARCH_API_KEY` trong `.env` ở thư mục gốc là master key của dịch vụ.

## Tìm sách qua API

```bash
curl -fsS 'http://localhost:3001/search/books?q=Clean&page=1&limit=10'
curl -fsS 'http://localhost:3001/search/books?q=Clean&category=Software'
```

Hai ví dụ trên dùng sách `Clean Code` của seed mẫu. Thay `q` bằng từ khóa có trong tên sách, tác giả, ISBN, thể loại hoặc mô tả. `category` lọc theo đúng tên thể loại; giá trị có khoảng trắng cần URL encode. `page` bắt đầu từ 1, `limit` từ 1 đến 100. Kết quả gồm `hits`, `totalHits`, `processingTimeMs`, `page` và `limit`. Có thể thử tham số khác trong [Swagger UI](http://localhost:3001/api-docs).

Compose ở thư mục gốc tự chạy seed an toàn và reindex khi khởi động. Nếu dùng file Compose riêng của backend hoặc ghi sách trực tiếp vào PostgreSQL, chạy reindex để sách xuất hiện trong tìm kiếm.

## Đồng bộ thay đổi sách

Khi tạo, sửa hoặc ngừng bán sách qua API, backend ghi thay đổi sách và yêu cầu `BookSearchSync` trong cùng transaction PostgreSQL. Backend thử cập nhật index ngay; nếu Meilisearch gián đoạn, worker thử lại mỗi 5 giây với khoảng chờ tăng dần, tối đa 5 phút. Sách `INACTIVE` được xóa khỏi index. Khi search ngừng hoạt động, endpoint tìm kiếm có thể trả lỗi cho đến khi dịch vụ phục hồi.

Để xem tiến độ sau một lần cập nhật sách:

```bash
docker compose logs --tail=100 backend meilisearch
curl -fsS 'http://localhost:3001/search/books?q=tu-khoa-moi'
```

## Tạo lại index khi cần

Chạy khi index bị mất hoặc dữ liệu sách bị sửa trực tiếp trong PostgreSQL. Tại thư mục gốc:

```bash
docker compose run --rm search-reindex
```

Lệnh lấy các sách `ACTIVE` từ PostgreSQL, **xóa toàn bộ document hiện có trong index `books`**, rồi thêm lại theo lô và chờ từng tác vụ hoàn tất. Tìm kiếm có thể tạm thiếu kết quả trong lúc chạy; tránh cập nhật sách đồng thời với reindex. Sau khi lệnh kết thúc, gọi lại `GET /search/books` để kiểm tra.

Các thay đổi đi qua API thường được `BookSearchSync` tự thử lại. Reindex toàn bộ dành cho trường hợp dữ liệu index bị mất hoặc thay đổi không đi qua API.

## Xử lý sự cố

| Hiện tượng | Thực hiện |
| --- | --- |
| Meilisearch không healthy | Chạy `docker compose ps --all` và `docker compose logs --tail=100 meilisearch backend`. |
| Có sách trong PostgreSQL nhưng `hits` rỗng | Kiểm tra sách còn `ACTIVE`, thử đúng từ khóa, rồi chạy reindex nếu sách đến từ seed hoặc cập nhật ngoài API. |
| Sách vừa sửa chưa xuất hiện | Đợi worker thử lại và xem log backend; khi dịch vụ đã phục hồi mà index vẫn thiếu dữ liệu, chạy reindex. |
| Lọc thể loại không có kết quả | Kiểm tra giá trị `category` và URL encode; chỉ `category` được cấu hình để lọc. |

Mã nguồn: [SearchService](search.service.ts), [BookSearchSyncService](book-search-sync.service.ts), [script reindex](reindex.script.ts).
