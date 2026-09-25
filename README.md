<div align="center">

# 📚 BOOKSTORE BACKEND

**Hệ thống backend cho website bán sách trực tuyến**

<kbd>NestJS</kbd> <kbd>TypeScript</kbd> <kbd>Node.js</kbd> <kbd>Đang phát triển</kbd>

**[Tổng quan](#tong-quan) · [Công nghệ](#cong-nghe) · [Cài đặt](#cai-dat) · [Kiến trúc](#kien-truc) · [Nhóm thực hiện](#nhom-thuc-hien)**

</div>

---

<a id="tong-quan"></a>
## ✨ Tổng quan

**Bookstore Backend** là đề tài tìm hiểu và xây dựng backend cho hệ thống bán sách trực tuyến bằng **NestJS** và **TypeScript**. Dự án tập trung vào tổ chức mã nguồn theo module, xây dựng RESTful API, xử lý nghiệp vụ và thực hành quy trình phát triển phần mềm.

> **Phạm vi tài liệu:** README này được biên soạn từ *hồ sơ đề tài*, chưa đối chiếu với repository. Các chức năng, tích hợp và cấu hình ghi **dự kiến** hoặc **tùy chọn** cần được cập nhật sau khi triển khai thực tế.

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
