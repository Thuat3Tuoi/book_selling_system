# Minh chứng thao tác giỏ hàng

- Thời điểm chạy: 2026-10-18T19:20:59.047Z
- Máy chủ: http://localhost:3001
- Tài khoản: evidence.tester.1792351259048@example.com

| # | Thao tác | HTTP |
|---|---|---|
| 1 | Xem giỏ ban đầu | 200 |
| 2 | Thêm sách id=10 (số lượng 1) | 201 |
| 3 | Xem giỏ sau khi thêm | 200 |
| 4 | Đổi số lượng mục 14 thành 2 | 200 |
| 5 | Xem giỏ sau khi đổi số lượng | 200 |
| 6 | Thêm sách không tồn tại (mong đợi lỗi) | 404 |
| 7 | Thêm số lượng vượt tồn kho (mong đợi lỗi) | 400 |
| 8 | Gửi số lượng sai kiểu (mong đợi 400) | 400 |
| 9 | Sửa mục giỏ không tồn tại hoặc không thuộc user (mong đợi 404) | 404 |
| 10 | Xóa mục 14 | 200 |
| 11 | Xem giỏ sau khi xóa | 200 |

## Chi tiết

### 1. Xem giỏ ban đầu

`GET /carts` → HTTP 200

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 7,
    "userId": 31,
    "cartItems": []
  }
}
```

### 2. Thêm sách id=10 (số lượng 1)

`POST /carts/items` → HTTP 201

Body gửi lên:

```json
{
  "bookId": 10,
  "quantity": 1
}
```

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 14,
    "cartId": 7,
    "bookId": 10,
    "quantity": 1
  }
}
```

### 3. Xem giỏ sau khi thêm

`GET /carts` → HTTP 200

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 7,
    "userId": 31,
    "cartItems": [
      {
        "id": 14,
        "cartId": 7,
        "bookId": 10,
        "quantity": 1,
        "book": {
          "id": 10,
          "title": "Ikigai: The Japanese Secret to a Long and Happy Life",
          "isbn": "9780143130727",
          "description": "Khám phá triết lý ikigai của Nhật Bản để tìm ý nghĩa, niềm vui và sự cân bằng trong cuộc sống hằng ngày.",
          "author": "Héctor García, Francesc Miralles",
          "category": "Phát triển bản thân",
          "price": "199000",
          "stockQuantity": 30,
          "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg",
          "status": "ACTIVE",
          "createdAt": "2026-01-19T02:00:00.000Z",
          "updatedAt": "2026-10-18T07:01:46.097Z"
        }
      }
    ]
  }
}
```

### 4. Đổi số lượng mục 14 thành 2

`PATCH /carts/items/14` → HTTP 200

Body gửi lên:

```json
{
  "quantity": 2
}
```

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 14,
    "cartId": 7,
    "bookId": 10,
    "quantity": 2
  }
}
```

### 5. Xem giỏ sau khi đổi số lượng

`GET /carts` → HTTP 200

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 7,
    "userId": 31,
    "cartItems": [
      {
        "id": 14,
        "cartId": 7,
        "bookId": 10,
        "quantity": 2,
        "book": {
          "id": 10,
          "title": "Ikigai: The Japanese Secret to a Long and Happy Life",
          "isbn": "9780143130727",
          "description": "Khám phá triết lý ikigai của Nhật Bản để tìm ý nghĩa, niềm vui và sự cân bằng trong cuộc sống hằng ngày.",
          "author": "Héctor García, Francesc Miralles",
          "category": "Phát triển bản thân",
          "price": "199000",
          "stockQuantity": 30,
          "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780143130727-L.jpg",
          "status": "ACTIVE",
          "createdAt": "2026-01-19T02:00:00.000Z",
          "updatedAt": "2026-10-18T07:01:46.097Z"
        }
      }
    ]
  }
}
```

### 6. Thêm sách không tồn tại (mong đợi lỗi)

`POST /carts/items` → HTTP 404

Body gửi lên:

```json
{
  "bookId": 999999,
  "quantity": 1
}
```

Phản hồi:

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Không tìm thấy sách hoặc sách không còn hoạt động"
  }
}
```

### 7. Thêm số lượng vượt tồn kho (mong đợi lỗi)

`POST /carts/items` → HTTP 400

Body gửi lên:

```json
{
  "bookId": 10,
  "quantity": 1030
}
```

Phản hồi:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Chỉ còn 30 cuốn trong kho"
  }
}
```

### 8. Gửi số lượng sai kiểu (mong đợi 400)

`POST /carts/items` → HTTP 400

Body gửi lên:

```json
{
  "bookId": 10,
  "quantity": "abc"
}
```

Phản hồi:

```json
{
  "success": false,
  "error": {
    "statusCode": 400,
    "message": "Validation failed",
    "details": [
      "quantity must not be less than 1",
      "quantity must be an integer number"
    ]
  }
}
```

### 9. Sửa mục giỏ không tồn tại hoặc không thuộc user (mong đợi 404)

`PATCH /carts/items/999999` → HTTP 404

Body gửi lên:

```json
{
  "quantity": 1
}
```

Phản hồi:

```json
{
  "success": false,
  "error": {
    "statusCode": 404,
    "message": "Cart item not found"
  }
}
```

### 10. Xóa mục 14

`DELETE /carts/items/14` → HTTP 200

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 14,
    "cartId": 7,
    "bookId": 10,
    "quantity": 2
  }
}
```

### 11. Xem giỏ sau khi xóa

`GET /carts` → HTTP 200

Phản hồi:

```json
{
  "success": true,
  "data": {
    "id": 7,
    "userId": 31,
    "cartItems": []
  }
}
```

