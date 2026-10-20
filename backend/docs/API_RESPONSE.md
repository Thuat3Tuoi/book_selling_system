# Cấu trúc phản hồi HTTP API (Response Envelope)

Các HTTP API trả về JSON sử dụng **cấu trúc phản hồi thống nhất** cho dữ liệu và thông tin lỗi. **Mã trạng thái HTTP (HTTP status code)** là căn cứ chính xác định kết quả xử lý request.

## 1. Phản hồi thành công

Khi request thành công, API trả về `success: true`. Dữ liệu kết quả nằm trong `data`.

```json
{
  "success": true,
  "data": {
    "id": 1
  }
}
```

## 2. Phản hồi có phân trang

Với API trả về danh sách có phân trang, response có thêm `meta` chứa thông tin phân trang.

```json
{
  "success": true,
  "data": [
    { "id": 1 }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `page` | Trang hiện tại |
| `limit` | Số bản ghi tối đa trên mỗi trang |
| `total` | Tổng số bản ghi |
| `totalPages` | Tổng số trang |

## 3. Phản hồi thất bại

Khi request thất bại, API trả về `success: false` và thông tin lỗi trong `error`.

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      "email must be an email"
    ]
  }
}
```

| Trường | Ý nghĩa |
| --- | --- |
| `statusCode` | Mã trạng thái HTTP của lỗi |
| `message` | Thông báo lỗi |
| `details` | Danh sách lỗi chi tiết (không phải lúc nào cũng có) |

`details` chỉ xuất hiện khi HTTP exception cung cấp một mảng thông báo lỗi validation. Với lỗi server không mong muốn, API trả về **thông báo chung** để tránh lộ thông tin nội bộ.

## 4. Phạm vi áp dụng và truy xuất dữ liệu

- **HTTP API:** Áp dụng cấu trúc phản hồi thống nhất như trên.
- **RabbitMQ:** Giữ nguyên định dạng message hiện tại, không áp dụng response envelope.
- **Axios:** Nội dung phản hồi HTTP nằm trong `response.data`; dữ liệu nghiệp vụ của API nằm trong `response.data.data`.

Ví dụ sử dụng Axios:

```javascript
const response = await axios.get('/api/users');

// Dữ liệu trả về từ API
const users = response.data.data;

// Thông tin phân trang (nếu có)
const pagination = response.data.meta;
```
