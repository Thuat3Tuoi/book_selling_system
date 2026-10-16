# Cấu trúc phản hồi HTTP API (Response Envelope)

Tất cả HTTP API trả về JSON đều sử dụng **một cấu trúc phản hồi thống nhất** để frontend dễ xử lý dữ liệu và lỗi. **Mã trạng thái HTTP (HTTP status code)** vẫn là căn cứ chính để xác định request thành công hay thất bại.

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

## 4. Lưu ý khi sử dụng

- **HTTP API:** Áp dụng cấu trúc phản hồi thống nhất như trên.
- **RabbitMQ:** Giữ nguyên định dạng message hiện tại, không áp dụng response envelope.
- **Axios:** Nội dung response HTTP nằm trong `response.data`, nên dữ liệu thực tế của API nằm trong `response.data.data`.

Ví dụ sử dụng Axios:

```javascript
const response = await axios.get('/api/users');

// Dữ liệu trả về từ API
const users = response.data.data;

// Thông tin phân trang (nếu có)
const pagination = response.data.meta;
```
