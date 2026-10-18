# Minh chứng tìm kiếm Meilisearch

- Thời điểm chạy: 2026-10-18T19:20:59.047Z
- Máy chủ: http://localhost:3001
- Tài khoản: evidence.tester.1792351259048@example.com

Mỗi truy vấn chạy 3 lần. `processingTimeMs` do Meilisearch trả về; `Round-trip` là tổng thời gian gọi API (client đo).

| Truy vấn | Lần | HTTP | totalHits | processingTimeMs | Round-trip (ms) |
|---|---|---|---|---|---|
| q="clean" | 1 | 200 | 2 | 77 | 192.3 |
| q="clean" | 2 | 200 | 2 | 0 | 16.5 |
| q="clean" | 3 | 200 | 2 | 0 | 28.4 |
| q="code" | 1 | 200 | 1 | 0 | 14.8 |
| q="code" | 2 | 200 | 1 | 0 | 25.9 |
| q="code" | 3 | 200 | 1 | 0 | 35.4 |
| q="javascript" | 1 | 200 | 0 | 12 | 30.2 |
| q="javascript" | 2 | 200 | 0 | 1 | 20.3 |
| q="javascript" | 3 | 200 | 0 | 0 | 22.9 |
| q="" + category="Programming" | 1 | 200 | 0 | 4 | 39.9 |
| q="" + category="Programming" | 2 | 200 | 0 | 0 | 7.6 |
| q="" + category="Programming" | 3 | 200 | 0 | 0 | 30.2 |

## Phản hồi mẫu (lần đầu của mỗi truy vấn)

### GET /search/books?q=clean&limit=5

HTTP 200

```json
{
  "success": true,
  "data": {
    "hits": [
      {
        "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "Công nghệ thông tin",
        "description": "Hướng dẫn thực hành viết mã rõ ràng, dễ kiểm thử và dễ bảo trì dành cho lập trình viên phần mềm.",
        "id": 3,
        "price": 599000,
        "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg"
      },
      {
        "title": "Atomic Habits",
        "author": "James Clear",
        "isbn": "9780735211292",
        "category": "Phát triển bản thân",
        "description": "James Clear trình bày một hệ thống thực tế để hình thành thói quen tốt thông qua những thay đổi nhỏ và bền vững.",
        "id": 4,
        "price": 219000,
        "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg"
      }
    ],
    "totalHits": 2,
    "processingTimeMs": 77,
    "page": 1,
    "limit": 5
  }
}
```

### GET /search/books?q=code&limit=5

HTTP 200

```json
{
  "success": true,
  "data": {
    "hits": [
      {
        "title": "Clean Code: A Handbook of Agile Software Craftsmanship",
        "author": "Robert C. Martin",
        "isbn": "9780132350884",
        "category": "Công nghệ thông tin",
        "description": "Hướng dẫn thực hành viết mã rõ ràng, dễ kiểm thử và dễ bảo trì dành cho lập trình viên phần mềm.",
        "id": 3,
        "price": 599000,
        "coverImageUrl": "https://covers.openlibrary.org/b/isbn/9780132350884-L.jpg"
      }
    ],
    "totalHits": 1,
    "processingTimeMs": 0,
    "page": 1,
    "limit": 5
  }
}
```

### GET /search/books?q=javascript&limit=5

HTTP 200

```json
{
  "success": true,
  "data": {
    "hits": [],
    "totalHits": 0,
    "processingTimeMs": 12,
    "page": 1,
    "limit": 5
  }
}
```

### GET /search/books?category=Programming&limit=5

HTTP 200

```json
{
  "success": true,
  "data": {
    "hits": [],
    "totalHits": 0,
    "processingTimeMs": 4,
    "page": 1,
    "limit": 5
  }
}
```

