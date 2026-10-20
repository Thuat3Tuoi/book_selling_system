# Tích hợp Meilisearch trong chức năng tìm kiếm sách

Chức năng tìm kiếm sách sử dụng **Meilisearch** để lập chỉ mục và truy vấn theo từ khóa. Tài liệu trình bày vai trò của dịch vụ, môi trường triển khai, quy trình kiểm tra và cơ chế đồng bộ với PostgreSQL.

Các lệnh được thực hiện bằng **Git Bash** tại thư mục `backend`, trừ các vị trí có ghi chú riêng. Với hệ thống đã khởi động bằng Docker Compose, bước tiếp theo là [kiểm tra dịch vụ](#3-quy-trình-kiểm-tra-dịch-vụ). Việc tạo sách mẫu giới hạn trong **môi trường phát triển** do dữ liệu được ghi vào PostgreSQL.

## Mục lục

1. [Vai trò của Meilisearch](#1-vai-trò-của-meilisearch)
2. [Môi trường và quy trình khởi động](#2-môi-trường-và-quy-trình-khởi-động)
3. [Quy trình kiểm tra dịch vụ](#3-quy-trình-kiểm-tra-dịch-vụ)
4. [API tìm kiếm sách](#4-api-tìm-kiếm-sách)
5. [Đồng bộ sách từ PostgreSQL vào Meilisearch](#5-đồng-bộ-sách-từ-postgresql-vào-meilisearch)
6. [Xử lý sự cố và giới hạn vận hành](#6-xử-lý-sự-cố-và-giới-hạn-vận-hành)

## 1. Vai trò của Meilisearch

**Meilisearch** là dịch vụ tìm kiếm theo từ khóa. Các thành phần dữ liệu gồm:

- **PostgreSQL:** kho dữ liệu gốc, lưu thông tin sách.
- **Meilisearch:** dịch vụ lưu chỉ mục và truy vấn sách theo từ khóa.
- **Document:** một bản ghi sách trong Meilisearch.
- **Index:** tập hợp các document; dự án sử dụng index tên `books`.

Khi người dùng tìm sách, backend gửi truy vấn đến index `books` trong Meilisearch.

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

Khi khởi động, `SearchService` tạo index (nếu chưa có), cấu hình 5 trường tìm kiếm văn bản (`title`, `author`, `isbn`, `category`, `description`), cho phép lọc theo `category` và sắp xếp theo `price`.

PostgreSQL là nguồn dữ liệu chính. Index phục vụ tìm kiếm, không chứa `stockQuantity` hoặc `status`.

### Luồng dữ liệu

```text
Tạo / sửa sách
    → Lưu sách, sự kiện outbox và yêu cầu BookSearchSync trong cùng transaction PostgreSQL
    → Publisher gửi `book.changed` tới RabbitMQ để đồng bộ sớm
    → Worker BookSearchSync thử lại khi Meilisearch hoặc consumer gặp lỗi

Ngừng bán sách
    → Đổi status thành INACTIVE, ghi outbox và BookSearchSync
    → Consumer hoặc worker xóa document khỏi Meilisearch

GET /search/books
    → Backend truy vấn index books
    → Đối chiếu ID kết quả với sách ACTIVE trong PostgreSQL
    → Trả kết quả cho client
```

Meilisearch xử lý ghi bằng tác vụ bất đồng bộ. Consumer chờ tác vụ hoàn tất trước khi ACK. Nếu consumer lỗi liên tiếp ba lần, message được chuyển sang queue `.dead`; yêu cầu `BookSearchSync` vẫn nằm trong PostgreSQL và worker tự thử lại. Tác vụ đối soát lúc khởi động và mỗi 15 phút xử lý cả dữ liệu ghi trực tiếp/seed. Vì vậy tìm kiếm có thể chậm hơn PostgreSQL một khoảng thời gian. Kết quả từ index được kiểm tra trạng thái với PostgreSQL trước khi trả, nên sách vừa chuyển sang `INACTIVE` không còn xuất hiện trong `hits` dù index chưa xóa xong.

## 2. Môi trường và quy trình khởi động

### 2.1. Chuẩn bị

1. Môi trường sử dụng **Docker Desktop** với Docker Engine đang chạy.
2. Thư mục làm việc của **Git Bash** là `backend/`.
3. Tệp `backend/.env` được tạo từ tệp mẫu khi chưa tồn tại:

   ```bash
   cp .env.example .env
   ```

4. Các biến sau được cấu hình bằng giá trị bí mật riêng trong `.env`; `JWT_SECRET` có độ dài tối thiểu 32 ký tự:

   ```dotenv
   POSTGRES_PASSWORD=...
   RABBITMQ_PASSWORD=...
   MEILISEARCH_API_KEY=...
   JWT_SECRET=...
   ```

   Với tệp `.env` đã tồn tại, các giá trị hiện tại được giữ nguyên và các biến còn thiếu được bổ sung. Tệp `.env` được loại khỏi nội dung commit.

Trong Git Bash trên Windows, đường dẫn chứa ký tự đặc biệt như `[` hoặc `]` được đặt trong dấu nháy, ví dụ: `cd '/c/du-an/[bookstore]/backend'`.

### 2.2. Khởi động bằng Docker Compose

Trình tự kiểm tra cấu hình, xây dựng image và khởi động các dịch vụ:

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
| `migrate` | `Exited (0)` — migration hoàn tất |

- `docker compose config --quiet` không in kết quả khi cấu hình hợp lệ.
- Lần build đầu tiên có thể mất vài phút.
- Cấu hình triển khai Docker được trình bày tại [DOCKER.md](../../DOCKER.md).

### 2.3. Địa chỉ dịch vụ

| Nơi truy cập | Địa chỉ |
| --- | --- |
| Backend gọi Meilisearch trong mạng Docker | `http://meilisearch:7700` |
| Máy host gọi API backend | `http://localhost:3001` |

Meilisearch sử dụng `MEILISEARCH_API_KEY` làm **master key**. Docker Compose **không mở cổng `7700` ra máy host**. Giá trị `3001` trong các lệnh API tương ứng với cấu hình mặc định của `BACKEND_PORT`; khi thay đổi cấu hình, cổng truy cập được cập nhật tương ứng.

## 3. Quy trình kiểm tra dịch vụ

Trạng thái Meilisearch được kiểm tra từ bên trong container:

```bash
docker compose exec -T meilisearch curl --fail --silent http://127.0.0.1:7700/health
```

Kết quả mong đợi:

```json
{"status":"available"}
```

Trạng thái backend được kiểm tra qua endpoint health từ máy host:

```bash
curl -fsS 'http://localhost:3001/health'
```

Phản hồi dự kiến chứa `"status": "ok"`. Endpoint `/health` kiểm tra **PostgreSQL, Redis và Meilisearch**.

Trạng thái container và nhật ký phục vụ xác định nguyên nhân khi kiểm tra thất bại:

```bash
docker compose ps --all
docker compose logs --tail=100 backend meilisearch
```

## 4. API tìm kiếm sách

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

Trong Git Bash, URL được đặt trong dấu nháy đơn `'...'` để các ký tự như `&` được truyền nguyên vẹn đến `curl`.

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
  "success": true,
  "data": {
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
}
```

- `hits`: danh sách sách tìm được.
- `totalHits`: số lượng kết quả ước tính do Meilisearch trả về. Trong lúc đồng bộ trễ, con số này có thể bao gồm sách vừa ngừng bán, dù `hits` đã loại sách đó; một trang có thể chứa ít hơn `limit` kết quả.
- `processingTimeMs`: thời gian xử lý tìm kiếm, tính bằng mili giây.

Phản hồi `"hits": []` và `"totalHits": 0` biểu thị chưa có kết quả phù hợp, bao gồm trường hợp database mới chưa có sách hoặc dữ liệu chưa được lập chỉ mục.

### 4.4. Quy trình kiểm tra với sách mẫu

Quy trình này thực hiện trên **database phát triển**. API `POST /books` tạo bản ghi sách trong PostgreSQL và yêu cầu Bearer token của tài khoản `ADMIN` hoặc `STAFF`. Access token được lấy qua `/auth/login` và gán vào biến `token` trong shell.

Các lệnh Git Bash dưới đây tạo ISBN có dấu thời gian và gửi dữ liệu JSON bằng `curl`:

```bash
isbn="demo-meili-$(date +%s)"
token='DAN_ACCESS_TOKEN_CUA_STAFF_VAO_DAY'

curl -fsS -X POST 'http://localhost:3001/books' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $token" \
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

Phản hồi của lệnh POST chứa `id` của sách mới. Lệnh truy vấn kiểm tra dữ liệu vừa tạo:

```bash
curl -fsS 'http://localhost:3001/search/books?q=MeiliDemo'
```

Document vừa tạo dự kiến xuất hiện trong `hits` sau khi tác vụ lập chỉ mục hoàn tất. Trong thời gian chờ tác vụ trong hàng đợi, lần truy vấn đầu tiên có thể chưa trả về document này; kết quả được kiểm tra lại sau khi đồng bộ.

## 5. Đồng bộ sách từ PostgreSQL vào Meilisearch

Sách được tạo bằng seed hoặc ghi trực tiếp vào PostgreSQL được tác vụ đối soát tự đồng bộ khi backend khởi động và mỗi 15 phút. Script đối soát thủ công phục vụ đồng bộ ngay sau thay đổi dữ liệu.

Lệnh đồng bộ được thực hiện tại thư mục `backend/`:

```bash
docker compose exec -T backend node dist/search/reindex.script.js
```

Quy trình xử lý của script gồm:

1. Lấy **chỉ các sách có `status = ACTIVE`** từ PostgreSQL.
2. Gửi theo lô vào index `books` và chờ từng tác vụ hoàn tất.
3. Xóa document không còn tương ứng với sách ACTIVE.

Thông báo hoàn tất xác nhận các tác vụ Meilisearch đã thành công. Kết quả đồng bộ được kiểm tra qua API:

```bash
curl -fsS 'http://localhost:3001/search/books'
```


Lệnh đồng bộ khi backend chạy ngoài Docker:

```bash
npm run search:reindex
```

Điều kiện thực thi lệnh trên là máy chạy lệnh truy cập được **PostgreSQL và Meilisearch**. Với cấu hình Compose mặc định, hai dịch vụ này không mở cổng ra host; vị trí thực thi script là **bên trong container backend**.

## 6. Xử lý sự cố và giới hạn vận hành

| Hiện tượng | Cách kiểm tra / xử lý |
| --- | --- |
| `/health` báo lỗi | Chạy `docker compose ps --all` và kiểm tra log `backend`, `meilisearch`, `postgres`, `redis`. |
| PostgreSQL có sách nhưng tìm kiếm trả về 0 kết quả | Kiểm tra `status = ACTIVE`; chạy reindex; đợi tác vụ lập chỉ mục hoàn tất rồi tìm lại. |
| Lọc `category` không có kết quả | Kiểm tra tên thể loại có khớp chính xác với dữ liệu sách không. Hiện chỉ `category` được cấu hình làm thuộc tính lọc. |
| Vẫn tìm thấy sách đã xóa hoặc ngừng bán | Kiểm tra log consumer, queue `.dead`, bảng `BookSearchSync` và tác vụ đối soát; chạy reindex trong container backend khi cần đối soát ngay. |

### Các file mã nguồn liên quan

- [`search.service.ts`](search.service.ts) — cấu hình index, đồng bộ và truy vấn tìm kiếm.
- [`search.controller.ts`](search.controller.ts) — endpoint tìm kiếm.
- [`reindex.script.ts`](reindex.script.ts) — script lập chỉ mục lại từ PostgreSQL.
- [`books.service.ts`](../books/books.service.ts) — xử lý sách và yêu cầu đồng bộ Meilisearch.
