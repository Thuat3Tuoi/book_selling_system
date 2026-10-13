# AI Disclosure — Nhật ký làm việc cùng AI

**Người thực hiện:** @Viet  
**Nhiệm vụ đảm nhận:** Task #4 (DTO & Pipe validation), Task #5 (Meilisearch), phụ Task #6 (Kiểm thử).

## 1. Tóm tắt việc dùng AI

- **Công cụ:** Claude (dùng bản web claude.ai).
- **AI làm gì:** Giúp em đọc code, viết test case, giải thích log lỗi, review code và gợi ý cách thiết kế.
- **AI không làm gì:** AI không truy cập được vào repo GitHub, CSDL hay Google Drive của nhóm, cũng không tự chạy code được.
- **Cách gửi dữ liệu:** Em tự copy từng file code và log lỗi quăng cho AI. Không gửi file `.env` thật, chỉ gửi file mẫu `.env.example`.
- **Ai kiểm chứng:** Em tự chạy `npm run test` và `npm run test:e2e` dưới máy local, sau đó chụp log quăng lại cho AI xem.
- **Trách nhiệm:** Em đã đọc kỹ, chạy thử và chịu trách nhiệm hoàn toàn về toàn bộ code push lên Git, kể cả đoạn AI viết.

> **Lưu ý nhỏ:** Mấy link Google Drive hay repo bị lỗi 404 AI không đọc được, nó báo thẳng luôn chứ không đoán mò.

## 2. Cách làm việc hàng ngày

1. Em tả yêu cầu và quăng file code thật cho AI.
2. AI đọc code, chỉ ra chỗ chưa ổn và đưa ra phương án. Mấy chỗ có nhiều cách làm (như tạo Role mới hay dùng roleId mặc định, gọi Meilisearch trực tiếp hay qua RabbitMQ), AI sẽ phân tích pros/cons để em tự chọn.
3. AI cho đoạn code/test mẫu, em chép vào VS Code.
4. Em chạy test dưới máy. Nếu báo lỗi thì quăng log cho AI đọc, nó giải thích nguyên nhân rồi đưa code sửa.
5. Lặp lại bước 4 tới khi test xanh (pass) thì thôi.


## 3. Nhật ký làm chi tiết

*(Mấy phần câu hỏi gửi AI bên dưới là em gom tắt lại cho gọn chứ không copy nguyên văn từng từ).*

### 3.1 Task #4 — DTO và Pipe validation

**Những gì em hỏi AI:**
- Đọc giúp mấy file `main.ts`, `CreateUserDto`, `LoginDto` xem đã xài validation đúng chưa.
- Chỉ cách test DTO và Pipe: gửi dữ liệu chuẩn, thiếu trường, sai kiểu dữ liệu thì ra sao.
- Viết test case, đọc log lỗi khi chạy test và chỉ cách sửa.

**Kết quả AI chỉ ra & viết giúp:**
- Mới vào AI phát hiện ngay file `main.ts` quên bật `ValidationPipe`, làm mấy cái decorator bên DTO trước giờ vô tác dụng.
- File `LoginDto` bị copy nhầm code của `phoneNumber`/`address`, với lại chưa gắn DTO này vào `AuthController`.
- `CreateUserDto` thiếu `@IsString()` ở field `firstName`, nên truyền `12345` vào nó vẫn nhận.
- Giải thích đoạn này khá hay: Guard chạy trước Pipe, nên route `/auth/login` mà thiếu field thì nó dính Guard trả về `401` luôn chứ chưa kịp tới Pipe để ra `400`.
- Sinh ra 3 file test: `create-user.dto.spec.ts` (16 test), `login.dto.spec.ts` (6 test), và `test/auth.e2e-spec.ts` (12 test).

**Thực tế em test dưới máy:**
- Unit test 2 file DTO: Pass sạch 22/22 (`login` 6/6, `create-user` 16/16).
- Chạy `npm run test` toàn bộ project: Ban đầu pass 28/33. Mấy test của em sửa xong thì lên 30/33. Còn 3 test tạch là do code sẵn của module Orders/OrderItems thiếu mock provider. AI sửa file spec giúp em thì chạy ngon lại.
- Lúc đọc tới module Orders, AI ké mắt soi ra 2 bug thật của nhóm: một chỗ gán nhầm `book.id = orderItem.bookId` thay vì so sánh `==` trong `orders.service.ts`, và thiếu `ParseIntPipe` chỗ `@Param("id")` bên controller.
- E2E test: Mấy lần đầu dính lỗi `ETIMEDOUT` do không cắm được vào Supabase (lỗi mạng/DB chứ không phải code). Chỉnh lại connection string xong thì chạy pass 10/13, rồi 11/13.
- Mấy test không đụng tới DB (như thiếu field, sai format, sai pass) pass hết, đúng như AI giải thích đoạn Guard chạy trước Pipe.
- Lần chạy e2e gần nhất còn vướng 2 test lỗi (báo 409 và login trả về status 201 thay vì 200). AI bảo do NestJS mặc định method POST sẽ trả về HTTP 201, muốn 200 phải gắn `@HttpCode(200)`. Em đã sửa trong controller rồi nhưng **chưa kịp chạy lại test e2e**.

### 3.2 Task #5 — Tích hợp Meilisearch

**Những gì em hỏi AI:**
- Cần lấy những file nào trong project để làm chức năng tìm kiếm Meilisearch.
- So sánh giùm 2 cách đồng bộ dữ liệu: gọi trực tiếp vs bắn qua RabbitMQ. Cách nào dễ làm hơn?
- Viết module search kèm test, làm sao để sau này có đổi cách đồng bộ.

**Kết quả AI chỉ ra & viết giúp:**
- AI kêu gửi mấy file `docker-compose.yml`, `package.json`, `src/books/*`. Lúc kiểm tra mới biết dự án chưa hề có file `docker-compose.yml` với folder `src/search/`.
- Phân tích 2 cách: Cách A (gọi trực tiếp) và Cách B (dùng RabbitMQ). 
- AI sinh trọn bộ folder `src/search/*` (service, controller, module, dto, script reindex, 2 file test), sửa lại `books.service.ts` và mấy file config liên quan.
- Bắt lỗi đồng bộ Meilisearch bằng `try/catch` để nếu Meilisearch có sập thì API thêm/sửa/xóa sách bên Postgres vẫn chạy bình thường.

**Thực tế em test dưới máy:**
- Check version `meilisearch@0.62.0` trên npm chuẩn rồi.
- Chạy thử script `npm run search:reindex` thì dính lỗi DI bên `OrdersService`. Do script cũ load nguyên cái `AppModule` nên bị vướng module khác. AI sửa lại script cho nó chỉ load mỗi `PrismaModule` với `SearchModule` thôi.

## 4. Mấy cú AI làm sai nhưng đã bị phát hiện ra

| # | AI làm sai / hiểu nhầm | Em phát hiện kiểu gì | Cách xử lý |
|---|---|---|---|
| 1 | Tự cho là project xài Jest nên đưa lệnh `npx jest` | Chạy báo lỗi; soi file `package.json` thấy xài Vitest | Bảo AI viết lại lệnh chạy bằng Vitest (`npm run test`) |
| 2 | Nhét file unit test vào folder `test/` | Soi lại structure project thấy spec của người khác nằm chung folder với file code trong `src/` | Nhắc AI dời file về `src/user/dto/` và `src/auth/dto/` |
| 3 | Test login lại đi dùng user seed sẵn mà không check có trong DB chưa | Chạy test bị dính 401 | Kêu AI sửa lại: Viết hàm tự đẻ user rác ở `beforeAll` rồi tự dọn ở `afterAll