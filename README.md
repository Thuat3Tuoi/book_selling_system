<div align="center">

# 📚 BOOKSTORE BACKEND

**Hệ thống backend cho website bán sách trực tuyến**

<kbd>NestJS</kbd> <kbd>TypeScript</kbd> <kbd>Node.js</kbd> <kbd>Đang phát triển</kbd>

**[Tổng quan](#tong-quan) · [Công nghệ](#cong-nghe) · [Cài đặt](#cai-dat) · [Kiến trúc](#kien-truc) · [Nhóm thực hiện](#nhom-thuc-hien)**

</div># Redis — Hướng dẫn sử dụng cache cho sách và giỏ hàng

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


---

<a id="tong-quan"></a>
## ✨ Tổng quan

**Bookstore Backend** là đề tài tìm hiểu và xây dựng backend cho hệ thống bán sách trực tuyến bằng **NestJS** và **TypeScript**. Dự án tập trung vào tổ chức mã nguồn theo module, xây dựng RESTful API, xử lý nghiệp vụ và thực hành quy trình phát triển phần mềm.

> **Phạm vi tài liệu:** README này được biên soạn từ *hồ sơ đề tài*, chưa đối chiếu với repository. Các chức năng, tích hợp và cấu hình ghi **dự kiến** hoặc **tùy chọn** cần được cập nhật sau khi triển khai thực tế.

**Hướng dẫn đã đối chiếu mã nguồn:** [Meilisearch: tìm kiếm sách](backend/src/search/README.md) · [Redis: cache sách và giỏ hàng](backend/src/redis/README.md). Hai hướng dẫn này có bước chạy và kết quả minh họa cho người mới bắt đầu.

### 🎯 Mục tiêu

- Nắm vững **Module, Controller, Provider** và **Dependency Injection** của NestJS.
- Xây dựng các API có cấu trúc rõ ràng; nghiên cứu **DTO, Validation Pipe, Guard** và **Interceptor**.
- Khảo sát **cache, tối ưu truy vấn, hàng đợi xử lý nền** và **tìm kiếm nâng cao**.
- Thực hành **Git, kiểm thử, Docker, CI/CD, bảo mật** và tài liệu API.

<a id="chuc-nang"></a>
## 🛒 Chức năng dự kiến

| Người dùng | Quản trị viên |
| :-- | :-- |
| Đăng ký, đăng nhập | Quản lý sách và danh mục |
| Xem danh sách và chi tiết sách | Quản lý người dùng |
| Tìm kiếm sách | Quản lý đơn hàng |
| Quản lý giỏ hàng, đặt hàng | Cập nhật trạng thái đơn hàng |
| Xem lịch sử mua hàng | — |

> Đây là **phạm vi chức năng đề xuất**, không phải danh sách tính năng đã hoàn thành.

<a id="cong-nghe"></a>
## 🧰 Công nghệ

| Nhóm | Công nghệ / kỹ thuật | Vai trò |
| :-- | :-- | :-- |
| **Cốt lõi** | NestJS · TypeScript · Node.js | Xây dựng backend theo kiến trúc module |
| **Dữ liệu & hiệu năng** | PostgreSQL · Redis | Lưu trữ, phân tích truy vấn và cache |
| **Xử lý nền** | RabbitMQ · tác vụ định kỳ | Xử lý công việc bất đồng bộ |
| **Tìm kiếm** | Meilisearch | Tìm kiếm sách nâng cao |
| **Hạ tầng** | Docker · Docker Compose | Đóng gói, tái lập môi trường |
| **Tự động hóa** | GitHub Actions | Chạy build và test khi push |

**NestJS là công nghệ chính.** Các công nghệ ở những nhóm còn lại thuộc phạm vi nghiên cứu, mở rộng hoặc công cụ hỗ trợ; chỉ giữ lại trong danh sách triển khai khi dự án đã tích hợp thực tế.

<a id="kien-truc"></a>
## 🏗️ Kiến trúc NestJS

```text
HTTP Request
     │
     ▼
   Guard ──► Validation Pipe ──► Controller
                                    │
                                    ▼
                              Service / Provider
                                    │
                                    ▼
                               Data / Services
                                    │
                                    ▼
                              HTTP Response
```

*Sơ đồ minh họa các thành phần NestJS; vị trí và phạm vi áp dụng thực tế phụ thuộc cấu hình của từng route.*

| Thành phần | Vai trò |
| :-- | :-- |
| **Module** | Gom các thành phần thuộc cùng một chức năng. |
| **Controller** | Tiếp nhận request và trả response. |
| **Provider / Service** | Chứa logic nghiệp vụ, được cấp phát qua Dependency Injection. |
| **DTO + Validation Pipe** | Định nghĩa và kiểm tra dữ liệu đầu vào. |
| **Guard** | Kiểm soát quyền truy cập API. |
| **Interceptor** | Can thiệp vào luồng xử lý request/response, ví dụ chuẩn hóa kết quả. |

<details>
<summary><strong>📁 Cấu trúc thư mục minh họa</strong></summary>

```text
src/
├── main.ts
├── app.module.ts
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── dto/
├── users/
├── books/
├── categories/
├── carts/
├── orders/
└── common/
    ├── guards/
    ├── interceptors/
    └── filters/
test/
Dockerfile
docker-compose.yml
package.json
README.md
```

Cần thay cấu trúc minh họa bằng cây thư mục thực tế của repository.

</details>

<a id="cai-dat"></a>
## 🚀 Cài đặt & chạy dự án

### 1. Chuẩn bị môi trường

- **Node.js và npm** tương thích với phiên bản NestJS của dự án.
- **Git** để tải mã nguồn.
- **Docker và Docker Compose** nếu chạy bằng container.

### 2. Tải mã nguồn và cài dependencies

```bash
git clone <REPOSITORY_URL>
cd <PROJECT_DIRECTORY>
npm install
```

Thay hai giá trị trong dấu `<>` bằng URL và tên thư mục thực tế.

### 3. Thiết lập biến môi trường

Nếu repository cung cấp `.env.example`:

```bash
cp .env.example .env
```

Điền các biến môi trường theo cấu hình của mã nguồn (cổng ứng dụng, cơ sở dữ liệu và các dịch vụ được sử dụng). **Không commit `.env`, mật khẩu hoặc API key.**

### 4. Khởi chạy

Với các script NestJS thông dụng trong `package.json`:

```bash
# Chế độ phát triển
npm run start:dev

# Build và chạy bản production
npm run build
npm run start:prod
```

> Kiểm tra `package.json` và khởi động các dịch vụ phụ thuộc trước khi chạy. Cổng truy cập API cần được bổ sung theo cấu hình thực tế: `<API_BASE_URL>`.

<details>
<summary><strong>🐳 Chạy với Docker Compose (nếu đã cấu hình)</strong></summary>

```bash
# Khởi động
docker compose up --build -d

# Xem log
docker compose logs -f

# Dừng hệ thống
docker compose down
```

Các lệnh chỉ áp dụng khi repository có `Dockerfile` và file Compose hợp lệ. Nếu đã cấu hình seed dữ liệu hoặc tài khoản thử nghiệm, bổ sung cách chạy và thông tin test tại đây.

</details>

<a id="nang-cao"></a>
## ⚡ Hướng nghiên cứu & mở rộng

| Hạng mục | Kỹ thuật | Ví dụ ứng dụng |
| :-- | :-- | :-- |
| Cache và tối ưu truy vấn | Redis, `EXPLAIN ANALYZE`, index tổ hợp | Cache danh sách sách được xem nhiều; phân tích truy vấn lọc sách. |
| Xử lý nền và hàng đợi | RabbitMQ, tác vụ định kỳ | Đưa công việc gửi thông báo đơn hàng vào hàng đợi. |
| Tìm kiếm nâng cao | Meilisearch | Tìm sách theo từ khóa. |

*Các ví dụ trên chỉ mô tả cách có thể áp dụng công nghệ, không xác nhận rằng hệ thống đã triển khai chúng.*

<a id="chat-luong"></a>
## 🧪 Kiểm thử, CI/CD & bảo mật

**Kiểm thử dự kiến:** unit test, kiểm thử API và/hoặc một luồng end-to-end.

```bash
npm run test
npm run test:e2e
```

*Chỉ sử dụng những lệnh đã được khai báo trong `package.json`.*

**CI/CD dự kiến:** GitHub Actions tự động chạy **build** và **test** sau mỗi lần push. Workflow được đặt trong `.github/workflows/` khi đã thiết lập.

**Yêu cầu bảo mật:** quản lý bí mật bằng biến môi trường, hash mật khẩu nếu tự quản lý tài khoản, kiểm tra input, kiểm soát quyền truy cập, phòng chống SQL injection và XSS, cấu hình CORS phù hợp và nhận biết OWASP Top 10.

**Tài liệu API:** bổ sung đường dẫn Swagger/tài liệu API tự động sau khi tích hợp: `<API_DOCS_URL>`.

<a id="lam-viec-nhom"></a>
## 🌿 Quy trình làm việc nhóm

`Tạo nhánh` → `Phát triển & kiểm thử` → `Push` → `Pull Request` → `Review chéo` → `Merge`

Không commit trực tiếp vào `main`; xử lý xung đột trước khi merge.

<a id="ai-disclosure"></a>
## 🤖 AI Disclosure

AI có thể được sử dụng để hỗ trợ giải thích kiến thức, phân tích lỗi, gợi ý test, review code và biên soạn tài liệu. Nhóm cần **tự kiểm chứng kết quả** trước khi đưa vào dự án.

> **Khai báo thực tế:** [Điền tên công cụ, công việc đã sử dụng AI và phương pháp kiểm chứng; xóa nội dung không áp dụng.]


<a id="tai-lieu"></a>
## 📖 Tài liệu tham khảo

[NestJS](https://docs.nestjs.com/) · [TypeScript](https://www.typescriptlang.org/docs/) · [Node.js](https://nodejs.org/en/docs) · [PostgreSQL](https://www.postgresql.org/docs/) · [Redis](https://redis.io/docs/) · [RabbitMQ](https://www.rabbitmq.com/docs) · [Meilisearch](https://www.meilisearch.com/docs) · [Docker](https://docs.docker.com/) · [GitHub Actions](https://docs.github.com/en/actions)

---
