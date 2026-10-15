# Meilisearch — Hướng dẫn tìm kiếm sách

Tài liệu hướng dẫn chạy, kiểm tra và sử dụng tính năng tìm kiếm sách bằng **Meilisearch** trong dự án.

> **Dành cho người mới bắt đầu**
>
> - Các lệnh bên dưới chạy bằng **Git Bash**, tại thư mục `backend`, trừ khi có ghi chú khác.
> - Nếu hệ thống đã chạy bằng Docker Compose, có thể bắt đầu từ [Bước 2: Kiểm tra dịch vụ](#3-bước-2-kiểm-tra-dịch-vụ).
> - Chỉ tạo sách mẫu trên **môi trường phát triển** vì dữ liệu được lưu thật vào PostgreSQL.

## Mục lục

1. [Meilisearch là gì?](#1-meilisearch-là-gì)
2. [Bước 1: Khởi chạy hệ thống](#2-bước-1-khởi-chạy-hệ-thống)
3. [Bước 2: Kiểm tra dịch vụ](#3-bước-2-kiểm-tra-dịch-vụ)
4. [Bước 3: Thử tìm kiếm sách](#4-bước-3-thử-tìm-kiếm-sách)
5. [Đồng bộ sách từ PostgreSQL vào Meilisearch](#5-đồng-bộ-sách-từ-postgresql-vào-meilisearch)
6. [Lỗi thường gặp và giới hạn](#6-lỗi-thường-gặp-và-giới-hạn)

## 1. Meilisearch là gì?

**Meilisearch** là dịch vụ tìm kiếm theo từ khóa. Có thể hình dung:

- **PostgreSQL:** kho dữ liệu gốc, lưu thông tin sách.
- **Meilisearch:** mục lục để tìm sách nhanh theo từ khóa.
- **Document:** một bản ghi sách trong Meilisearch.
- **Index:** tập hợp các document; dự án sử dụng index tên `books`.

Khi người dùng tìm sách, backend truy vấn Meilisearch thay vì tự tìm trên từng dòng của PostgreSQL.

### Thông tin được lập chỉ mục

Mỗi document trong index `books` chứa các trường:

| Trường | Mục đích |
| --- | --- |
| `id` | Định danh sách |
| `title` | Tên sách, có thể tìm theo từ khóa |
| `author` | Tác giả, có thể tìm theo từ khóa |
| `isbn` | Mã ISBN, có thể tìm theo từ khóa |
| `category` | Thể loại, có thể tìm và lọc |
| `description` | Mô tả, có thể tìm theo từ khóa |
| `price` | Giá sách trong kết quả |
| `coverImageUrl` | Ảnh bìa trong kết quả |

Khi khởi động, `SearchService` tạo index (nếu chưa có), cấu hình 5 trường tìm kiếm văn bản (`title`, `author`, `isbn`, `category`, `description`) và cho phép lọc theo `category`.

> **Lưu ý:** PostgreSQL vẫn là nguồn dữ liệu chính. Index phục vụ tìm kiếm, không chứa `stockQuantity` hoặc `status`.

### Luồng dữ liệu

```text
Tạo / sửa sách
    → Lưu vào PostgreSQL
    → Gửi yêu cầu thêm / cập nhật document trong Meilisearch

Ngừng bán sách
    → Đổi status thành INACTIVE trong PostgreSQL
    → Gửi yêu cầu xóa document khỏi Meilisearch

GET /search/books
    → Backend truy vấn index books
    → Trả kết quả cho client
```

Meilisearch xử lý các yêu cầu ghi bằng **tác vụ bất đồng bộ**. Log có `taskUid` chỉ cho biết Meilisearch đã nhận tác vụ, **chưa có nghĩa tác vụ đã hoàn tất**. Vì vậy, sách mới có thể chưa xuất hiện ngay trong kết quả tìm kiếm. Nếu đồng bộ lỗi, `BooksService` ghi log nhưng thao tác lưu PostgreSQL vẫn có thể thành công.

## 2. Bước 1: Khởi chạy hệ thống

### 2.1. Chuẩn bị

1. Cài và mở **Docker Desktop**; đảm bảo Docker Engine đang chạy.
2. Mở **Git Bash** trong thư mục `backend` của dự án.
3. Nếu chưa có `backend/.env`, tạo từ file mẫu:

   ```bash
   cp .env.example .env
   ```

4. Mở `.env` và đặt giá trị bí mật riêng, đủ dài cho các biến:

   ```dotenv
   POSTGRES_PASSWORD=...
   RABBITMQ_PASSWORD=...
   MEILISEARCH_API_KEY=...
   JWT_SECRET=...
   ```

   Nếu đã có `.env`, **giữ nguyên các giá trị hiện tại**, chỉ bổ sung biến còn thiếu. Không commit `.env` lên Git.

> **Git Bash trên Windows:** Nếu đường dẫn chứa ký tự đặc biệt như `[` hoặc `]`, hãy đặt toàn bộ đường dẫn trong dấu nháy, ví dụ: `cd '/c/du-an/[bookstore]/backend'`.

### 2.2. Chạy Docker Compose

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Kết quả mong đợi:

| Dịch vụ | Trạng thái mong đợi |
| --- | --- |
| `meilisearch` | `healthy` |
| `postgres` | `healthy` |
| `redis` | `healthy` |
| `rabbitmq` | `healthy` |
| `backend` | `healthy` |
| `migrate` | `Exited (0)` — bình thường |

- `docker compose config --quiet` không in kết quả khi cấu hình hợp lệ.
- Lần build đầu tiên có thể mất vài phút.
- Hướng dẫn Docker đầy đủ: [DOCKER.md](../../DOCKER.md).

### 2.3. Địa chỉ dịch vụ

| Nơi truy cập | Địa chỉ |
| --- | --- |
| Backend gọi Meilisearch trong mạng Docker | `http://meilisearch:7700` |
| Máy host gọi API backend | `http://localhost:3001` |

Meilisearch sử dụng `MEILISEARCH_API_KEY` làm **master key**. Docker Compose **không mở cổng `7700` ra máy host**. Nếu thay đổi `BACKEND_PORT` trong `.env`, hãy thay `3001` trong những lệnh bên dưới bằng cổng tương ứng.

## 3. Bước 2: Kiểm tra dịch vụ

Kiểm tra Meilisearch từ bên trong container:

```bash
docker compose exec -T meilisearch curl --fail --silent http://127.0.0.1:7700/health
```

Kết quả mong đợi:

```json
{"status":"available"}
```

Kiểm tra endpoint health của backend từ máy host:

```bash
curl -fsS 'http://localhost:3001/health'
```

Phản hồi dự kiến chứa `"status": "ok"`. Endpoint `/health` kiểm tra **PostgreSQL, Redis và Meilisearch**.

Nếu có lỗi, kiểm tra trạng thái và log:

```bash
docker compose ps --all
docker compose logs --tail=100 backend meilisearch
```

## 4. Bước 3: Thử tìm kiếm sách

### 4.1. Gọi API tìm kiếm

**Tìm sách theo từ khóa `Clean Code`:**

```bash
curl -fsS 'http://localhost:3001/search/books?q=Clean%20Code&page=1&limit=10'
```

**Tìm `Clean` và lọc thể loại `Công nghệ thông tin`:**

```bash
curl -fsS 'http://localhost:3001/search/books?q=Clean&category=C%C3%B4ng%20ngh%E1%BB%87%20th%C3%B4ng%20tin'
```

**Xem danh sách document trong index (không truyền từ khóa):**

```bash
curl -fsS 'http://localhost:3001/search/books'
```

> **Lưu ý với Git Bash:** Luôn đặt URL trong dấu nháy đơn `'...'`, đặc biệt khi URL có ký tự `&`, để shell không tách lệnh.

### 4.2. Tham số tìm kiếm

| Tham số | Ý nghĩa | Mặc định |
| --- | --- | --- |
| `q` | Từ khóa; bỏ trống để xem các document trong index | Trống |
| `category` | Lọc theo tên thể loại **đúng như dữ liệu sách** | Không lọc |
| `page` | Số trang, bắt đầu từ `1` | `1` |
| `limit` | Số kết quả mỗi trang, tối đa `100` | `20` |

Ví dụ: `page=2&limit=10` lấy từ kết quả thứ 11. Truy vấn nhiều từ sử dụng `matchingStrategy: all`, nghĩa là tất cả từ truy vấn đều phải khớp với document. Route `GET /search/books` hiện **không yêu cầu đăng nhập**.

### 4.3. Ví dụ kết quả

Khi index đã có sách phù hợp, phản hồi có dạng (dữ liệu minh họa):

```json
{
  "hits": [
    {
      "id": 3,
      "title": "Clean Code",
      "author": "Robert C. Martin",
      "isbn": "9780132350884",
      "category": "Công nghệ thông tin",
      "description": "...",
      "price": 599000,
      "coverImageUrl": "https://example.com/clean-code.jpg"
    }
  ],
  "totalHits": 1,
  "processingTimeMs": 2,
  "page": 1,
  "limit": 10
}
```

- `hits`: danh sách sách tìm được.
- `totalHits`: số lượng kết quả ước tính do Meilisearch trả về.
- `processingTimeMs`: thời gian xử lý tìm kiếm, tính bằng mili giây.

Database mới có thể trả `"hits": []` và `"totalHits": 0`. Đây là kết quả hợp lệ khi chưa có sách hoặc dữ liệu chưa được lập chỉ mục.

### 4.4. Tạo sách mẫu để thử tìm kiếm

> **Chỉ thực hiện trên database phát triển.** API bên dưới tạo một sách thật trong PostgreSQL. Route `POST /books` hiện không có guard đăng nhập.

Dùng Git Bash tạo ISBN có dấu thời gian, sau đó gửi JSON bằng `curl`:

```bash
isbn="demo-meili-$(date +%s)"

curl -fsS -X POST 'http://localhost:3001/books' \
  -H 'Content-Type: application/json' \
  --data-binary @- <<EOF
{
  "title": "MeiliDemo",
  "isbn": "$isbn",
  "description": "Sach mau de thu tim kiem",
  "author": "Nhom Bookstore",
  "category": "Demo",
  "price": 100000,
  "stockQuantity": 3,
  "coverImageUrl": "https://example.com/book.jpg"
}
EOF
```

Phản hồi của lệnh POST chứa `id` của sách mới. Kiểm tra tìm kiếm:

```bash
curl -fsS 'http://localhost:3001/search/books?q=MeiliDemo'
```

Document vừa tạo dự kiến xuất hiện trong `hits`. Nếu chưa thấy, thử gọi lại sau một chút vì Meilisearch xử lý tác vụ theo hàng đợi.

## 5. Đồng bộ sách từ PostgreSQL vào Meilisearch

Nếu sách được tạo **trước khi Meilisearch chạy**, được thêm bằng **seed**, hoặc được ghi trực tiếp vào **PostgreSQL**, chúng sẽ không tự động xuất hiện trong index.

Chạy lệnh đồng bộ từ thư mục `backend`:

```bash
docker compose exec -T backend node dist/search/reindex.script.js
```

Script sẽ:

1. Lấy **chỉ các sách có `status = ACTIVE`** từ PostgreSQL.
2. Gửi từng sách vào index `books`.
3. In số lệnh gửi thành công và thất bại.

Thông báo `dong bo thanh cong` chỉ xác nhận Meilisearch **đã nhận yêu cầu**, không đảm bảo việc lập chỉ mục đã xong. Sau đó, kiểm tra lại:

```bash
curl -fsS 'http://localhost:3001/search/books'
```

> **Giới hạn:** Script reindex hiện **không xóa** những document cũ đã không còn tương ứng với sách trong PostgreSQL.

Nếu backend chạy ngoài Docker, có thể dùng:

```bash
npm run search:reindex
```

Tuy nhiên, máy chạy lệnh phải truy cập được **PostgreSQL và Meilisearch**. Trong cấu hình Compose mặc định, hai dịch vụ này không được mở cổng ra host, vì vậy chạy script **bên trong container backend** là cách đơn giản nhất.

## 6. Lỗi thường gặp và giới hạn

| Hiện tượng | Cách kiểm tra / xử lý |
| --- | --- |
| `/health` báo lỗi | Chạy `docker compose ps --all` và kiểm tra log `backend`, `meilisearch`, `postgres`, `redis`. |
| PostgreSQL có sách nhưng tìm kiếm trả về 0 kết quả | Kiểm tra `status = ACTIVE`; chạy reindex; đợi tác vụ lập chỉ mục hoàn tất rồi tìm lại. |
| Lọc `category` không có kết quả | Kiểm tra tên thể loại có khớp chính xác với dữ liệu sách không. Hiện chỉ `category` được cấu hình làm thuộc tính lọc. |
| Vẫn tìm thấy sách đã xóa hoặc ngừng bán | Kiểm tra log `Dong bo Meilisearch that bai`. Script reindex hiện không tự xóa document cũ. |

### Các file mã nguồn liên quan

- [`search.service.ts`](search.service.ts) — cấu hình index, đồng bộ và truy vấn tìm kiếm.
- [`search.controller.ts`](search.controller.ts) — endpoint tìm kiếm.
- [`reindex.script.ts`](reindex.script.ts) — script lập chỉ mục lại từ PostgreSQL.
- [`books.service.ts`](../books/books.service.ts) — xử lý sách và yêu cầu đồng bộ Meilisearch.
