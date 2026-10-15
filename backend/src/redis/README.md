# Redis — Hướng dẫn sử dụng cache cho sách và giỏ hàng

Redis được sử dụng để **lưu tạm dữ liệu sách và giỏ hàng**, giúp backend phản hồi nhanh hơn và giảm số lần truy vấn PostgreSQL.

> **Dành cho người mới bắt đầu**
>
> - Tất cả lệnh trong tài liệu dùng **Git Bash**, chạy tại thư mục `backend`, trừ khi có ghi chú khác.
> - Nếu hệ thống đã chạy bằng Docker Compose, có thể bắt đầu từ [Bước 2: Kiểm tra Redis](#4-bước-2-kiểm-tra-redis).
> - Các ví dụ thêm sản phẩm vào giỏ sẽ **thay đổi dữ liệu thật**. Chỉ thử trên môi trường phát triển hoặc tài khoản thử nghiệm.

## Mục lục

1. [Redis là gì?](#1-redis-là-gì)
2. [Dự án đang cache những gì?](#2-dự-án-đang-cache-những-gì)
3. [Bước 1: Khởi chạy hệ thống](#3-bước-1-khởi-chạy-hệ-thống)
4. [Bước 2: Kiểm tra Redis](#4-bước-2-kiểm-tra-redis)
5. [Bước 3: Thử cache hit và cache miss](#5-bước-3-thử-cache-hit-và-cache-miss)
6. [Khi dữ liệu thay đổi, cache được xử lý thế nào?](#6-khi-dữ-liệu-thay-đổi-cache-được-xử-lý-thế-nào)
7. [Lỗi thường gặp](#7-lỗi-thường-gặp)

## 1. Redis là gì?

**Redis** là dịch vụ lưu dữ liệu theo dạng **key → value** (khóa → giá trị) và có tốc độ truy xuất nhanh.

Trong dự án:

- **PostgreSQL:** nơi lưu dữ liệu gốc của sách và giỏ hàng.
- **Redis:** nơi giữ bản sao tạm thời của dữ liệu backend đã đọc từ PostgreSQL.
- **Cache:** bản sao tạm thời đó, dùng để tránh truy vấn PostgreSQL nhiều lần cho cùng dữ liệu.

### Ví dụ: Xem chi tiết sách `id = 3`

```text
Lần đầu gọi GET /books/3
    → Redis chưa có key book:3 (CACHE MISS)
    → Backend đọc sách từ PostgreSQL
    → Lưu bản sao vào Redis (key book:3)
    → Trả thông tin sách

Lần tiếp theo gọi GET /books/3
    → Redis đã có key book:3 (CACHE HIT)
    → Backend trả dữ liệu từ Redis
    → Không cần truy vấn lại PostgreSQL cho dữ liệu đã cache
```

### TTL là gì?

**TTL (Time To Live)** là thời gian một key còn hiệu lực. Cache sách và giỏ hàng trong dự án có TTL **300 giây (5 phút)**.

- Khi TTL hết, Redis tự loại bỏ key.
- Lần đọc tiếp theo sẽ lấy dữ liệu từ PostgreSQL và tạo cache mới.
- Nếu Redis mất cache hoặc container bị tạo lại, **dữ liệu gốc trong PostgreSQL vẫn còn**.

## 2. Dự án đang cache những gì?

| Chức năng | Key Redis | Cách sử dụng |
| --- | --- | --- |
| Danh sách sách | `books:page:<page>:limit:<limit>` | `GET /books` đọc hoặc lưu kết quả theo trang trong 300 giây. **Cần đăng nhập.** |
| Chi tiết sách | `book:<id>` | `GET /books/:id` đọc hoặc lưu thông tin một sách trong 300 giây. Khi sửa/ngừng bán, backend xóa key chi tiết tương ứng. |
| Giỏ hàng | `cart:user:<userId>` | `GET /carts` đọc hoặc lưu giỏ hàng trong 300 giây. Thêm/sửa/xóa sản phẩm hoặc đặt hàng thành công sẽ xóa key. **Cần đăng nhập.** |

`RedisService` chuyển dữ liệu thành **JSON** khi lưu và chuyển JSON thành object khi đọc.

> **Lưu ý:** Backend gửi lệnh `PING` để kiểm tra Redis lúc khởi động. Nếu Redis không sẵn sàng, backend có thể không khởi động được. Hiện tại các thao tác đọc/ghi cache **không có cơ chế tự bỏ qua Redis** khi Redis gặp lỗi.

## 3. Bước 1: Khởi chạy hệ thống

### 3.1. Chuẩn bị

1. Cài và mở **Docker Desktop**, đảm bảo Docker Engine đang chạy.
2. Mở **Git Bash** tại thư mục `backend` của dự án.
3. Nếu chưa có file `backend/.env`, tạo từ file mẫu:

   ```bash
   cp .env.example .env
   ```

4. Mở `.env` và cấu hình các biến bí mật cần thiết:

   ```dotenv
   POSTGRES_PASSWORD=...
   RABBITMQ_PASSWORD=...
   MEILISEARCH_API_KEY=...
   JWT_SECRET=...
   ```

   Nếu `.env` đã tồn tại, **giữ các giá trị cũ**, chỉ bổ sung biến còn thiếu. Không commit `.env` lên Git.

> **Đường dẫn Git Bash trên Windows:** Nếu thư mục có ký tự đặc biệt như `[` hoặc `]`, hãy đặt đường dẫn trong dấu nháy đơn, ví dụ: `cd '/c/du-an/[bookstore]/backend'`.

### 3.2. Chạy Docker Compose

```bash
docker compose config --quiet
docker compose up -d --build
docker compose ps --all
```

Kết quả mong đợi:

| Dịch vụ | Trạng thái |
| --- | --- |
| `redis` | `healthy` |
| `postgres` | `healthy` |
| `meilisearch` | `healthy` |
| `rabbitmq` | `healthy` |
| `backend` | `healthy` |
| `migrate` | `Exited (0)` — bình thường |

`docker compose config --quiet` không in gì nếu cấu hình hợp lệ. Lần build đầu tiên có thể mất vài phút.

### 3.3. Redis chạy ở đâu?

| Thành phần | Địa chỉ |
| --- | --- |
| Backend truy cập Redis trong mạng Docker | `redis:6379` |
| Máy host truy cập backend API | `http://localhost:3001` |

- Backend nhận `REDIS_HOST=redis` và `REDIS_PORT=6379`.
- Docker Compose **không mở cổng `6379` ra máy host**; sử dụng `docker compose exec` để kiểm tra Redis.
- Redis trong cấu hình Compose hiện tại **không đặt mật khẩu** và **không có volume lưu cache**.
- Nếu sửa `BACKEND_PORT` trong `.env`, thay `3001` trong các ví dụ bằng cổng mới.

Xem thêm [DOCKER.md](../../DOCKER.md).

## 4. Bước 2: Kiểm tra Redis

**Kiểm tra Redis từ container:**

```bash
docker compose exec -T redis redis-cli ping
```

Kết quả mong đợi:

```text
PONG
```

**Kiểm tra API health của backend:**

```bash
curl -fsS 'http://localhost:3001/health'
```

Phản hồi dự kiến chứa `"status": "ok"` khi **cả PostgreSQL, Redis và Meilisearch** đều hoạt động.

Nếu có lỗi, kiểm tra trạng thái và log:

```bash
docker compose ps --all
docker compose logs --tail=100 redis backend
```

## 5. Bước 3: Thử cache hit và cache miss

### 5.1. Thử cache chi tiết sách (không cần đăng nhập)

Cần có ít nhất một sách trong PostgreSQL. Nếu chưa có, hãy tạo sách mẫu trên **database phát triển** theo phần [tạo sách để thử tìm kiếm](../search/README.md#44-tạo-sách-mẫu-để-thử-tìm-kiếm), sau đó lấy `id` trả về từ API.

Ví dụ này sử dụng sách có `id = 3`. **Thay `3` bằng ID thực tế của bạn.**

```bash
BOOK_ID=3

# Xóa bản sao cache cũ để tạo CACHE MISS
docker compose exec -T redis redis-cli DEL "book:$BOOK_ID"

# Lần đầu: CACHE MISS, đọc PostgreSQL rồi lưu Redis
curl -fsS "http://localhost:3001/books/$BOOK_ID"

# Lần hai: CACHE HIT, đọc dữ liệu từ Redis
curl -fsS "http://localhost:3001/books/$BOOK_ID"

# Xem thời gian còn lại và dữ liệu đã cache
docker compose exec -T redis redis-cli TTL "book:$BOOK_ID"
docker compose exec -T redis redis-cli GET "book:$BOOK_ID"

# Xem log cache của backend
docker compose logs --tail=30 backend
```

**Kết quả cần quan sát:**

- `DEL` chỉ xóa **bản sao trong Redis**, **không xóa sách trong PostgreSQL**.
- Log backend dự kiến ghi `CACHE MISS: book:3` rồi `CACHE HIT: book:3` (nếu dùng ID `3`).
- `GET` từ Redis trả về dữ liệu JSON của sách.
- `TTL` thông thường trả về số giây còn lại, trong khoảng **0–300**.

| Giá trị TTL | Ý nghĩa |
| --- | --- |
| `0` đến `300` | Key còn hiệu lực, sắp hết hạn khi tiến về `0`. |
| `-2` | Key không tồn tại: chưa tạo, đọc thất bại hoặc đã hết hạn. |
| `-1` | Key tồn tại nhưng không có TTL; **không phải trạng thái mong đợi** với cache mới tạo của tính năng này. |

### 5.2. Thử cache danh sách và giỏ hàng (cần đăng nhập)

Hai route `GET /books` và `GET /carts` yêu cầu tài khoản đã có trong hệ thống.

> **Chú ý:** Database mới sau migration chưa có tài khoản mẫu. Seed có thể tạo dữ liệu thử nhưng **xóa dữ liệu cũ**, vì vậy chỉ chạy seed ở database phát triển có thể xóa.

**Bước A — Đăng nhập bằng `curl`**

Thay email và mật khẩu của tài khoản thử nghiệm:

```bash
curl -fsS -X POST 'http://localhost:3001/auth/login' \
  -H 'Content-Type: application/json' \
  -d '{"email":"email-cua-ban@example.com","password":"mat-khau-cua-ban"}'
```

Từ JSON trả về, lấy `accessToken` và `user.id`. Gán vào biến Git Bash để dùng ở các lệnh tiếp theo:

```bash
ACCESS_TOKEN='dan-accessToken-tu-ket-qua-dang-nhap'
USER_ID='dan-user.id-tu-ket-qua-dang-nhap'
```

> Không chia sẻ access token, không đưa token hoặc mật khẩu thật vào README/Git. Cách gán thủ công này **không cần cài thêm `jq` hay Node.js trên máy host**.

**Bước B — Thử cache danh sách sách**

```bash
# Xóa cache của trang 1, giới hạn 10 sách
docker compose exec -T redis redis-cli DEL 'books:page:1:limit:10'

# Lần đầu: CACHE MISS
curl -fsS 'http://localhost:3001/books?page=1&limit=10' \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Lần hai: CACHE HIT
curl -fsS 'http://localhost:3001/books?page=1&limit=10' \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Kiểm tra TTL và log
docker compose exec -T redis redis-cli TTL 'books:page:1:limit:10'
docker compose logs --tail=30 backend
```

**Bước C — Thử cache giỏ hàng**

```bash
# Đọc giỏ hàng để backend tạo cache nếu chưa có
curl -fsS 'http://localhost:3001/carts' \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# Xem TTL của cache giỏ hàng
docker compose exec -T redis redis-cli TTL "cart:user:$USER_ID"
```

Cache danh sách và giỏ hàng đều có TTL **300 giây**. Giỏ hàng được lưu theo `user.id`, nên mỗi người dùng có key riêng.

### 5.3. Thử xóa cache khi thêm sản phẩm vào giỏ

Dùng tài khoản và biến `ACCESS_TOKEN`, `USER_ID` từ mục 5.2. Thay `BOOK_ID` bằng ID sách hợp lệ (ví dụ `3`).

```bash
BOOK_ID=3

# Thêm một sản phẩm vào giỏ hàng thật
curl -fsS -X POST 'http://localhost:3001/carts/items' \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"bookId\":$BOOK_ID,\"quantity\":1}"

# Key giỏ hàng vừa bị xóa: dự kiến trả -2
docker compose exec -T redis redis-cli TTL "cart:user:$USER_ID"

# Đọc lại giỏ hàng: lấy dữ liệu mới từ PostgreSQL và cache lại
curl -fsS 'http://localhost:3001/carts' \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Sau thao tác thêm sản phẩm, backend xóa key `cart:user:<userId>`; vì vậy `TTL` dự kiến trả `-2` **nếu chưa có yêu cầu khác tạo lại cache**. Lần đọc giỏ hàng tiếp theo sẽ tạo cache mới.

> Lệnh `POST /carts/items` **thay đổi giỏ hàng thật** của tài khoản đang dùng.

## 6. Khi dữ liệu thay đổi, cache được xử lý thế nào?

| Thao tác | Backend làm gì với cache? |
| --- | --- |
| Tạo sách | Lưu PostgreSQL; sách mới chưa có cache chi tiết để xóa. |
| Sửa/ngừng bán sách | Cập nhật PostgreSQL rồi xóa `book:<id>` tương ứng. |
| Thêm/sửa/xóa sản phẩm giỏ hàng | Cập nhật PostgreSQL rồi xóa `cart:user:<userId>`. |
| Đặt hàng thành công | Xóa cache giỏ hàng sau khi giao dịch database hoàn tất. |
| TTL hết 300 giây | Redis tự xóa key; lần đọc sau tải lại dữ liệu từ PostgreSQL. |

### Giới hạn hiện tại: Cache danh sách có thể bị cũ

Cache danh sách được lưu bằng key:

```text
books:page:<page>:limit:<limit>
```

Nhưng khi tạo/sửa/ngừng bán sách, code hiện tại lại xóa key:

```text
books:list
```

**Hai key không trùng nhau**, nên các trang danh sách đã cache **không được xóa ngay**. Kết quả `GET /books` có thể là dữ liệu cũ trong tối đa khoảng **300 giây** kể từ lần cache gần nhất, tùy TTL còn lại.

Ngoài ra, thay đổi tồn kho khi đặt hàng **chưa chủ động xóa cache chi tiết sách**.

Khi cần kiểm tra dữ liệu mới ngay trong môi trường phát triển, xóa **đúng key**:

```bash
# Ví dụ xóa cache danh sách trang 1, 10 sách/trang
docker compose exec -T redis redis-cli DEL 'books:page:1:limit:10'

# Ví dụ xóa cache chi tiết sách id = 3
docker compose exec -T redis redis-cli DEL 'book:3'
```

Không dùng lệnh xóa toàn bộ Redis (`FLUSHALL`, `FLUSHDB`) trên môi trường có dữ liệu cần giữ.

## 7. Lỗi thường gặp

| Hiện tượng | Cách hiểu và kiểm tra |
| --- | --- |
| `redis-cli ping` không trả `PONG` | Kiểm tra `docker compose ps --all` và `docker compose logs --tail=100 redis`. |
| `/health` lỗi dù Redis có `PONG` | Endpoint còn kiểm tra PostgreSQL và Meilisearch; xem log backend và trạng thái hai service này. |
| Không thấy key sau khi gọi API | Kiểm tra API có trả thành công, sách/tài khoản có tồn tại, tên key đúng và key chưa hết TTL 300 giây. |
| Không thấy `CACHE HIT` trong log | Kiểm tra có gọi lại **cùng API và tham số** khi key còn hiệu lực; xem `docker compose logs --tail=100 backend`. |
| Danh sách sách trả dữ liệu cũ | Cache đang lưu theo `books:page:<page>:limit:<limit>`, nhưng code lại xóa `books:list`; kiểm tra TTL của key từng trang. |
| API trả `401 Unauthorized` | `GET /books`, `GET /carts` yêu cầu token đăng nhập hợp lệ; kiểm tra `ACCESS_TOKEN`. |

### Mã nguồn liên quan

- [`redis.service.ts`](redis.service.ts) — đọc/ghi cache Redis.
- [`books.service.ts`](../books/books.service.ts) — cache danh sách và chi tiết sách.
- [`carts.service.ts`](../carts/carts.service.ts) — cache giỏ hàng.
- [`orders.service.ts`](../orders/orders.service.ts) — xóa cache giỏ hàng sau khi đặt hàng.
