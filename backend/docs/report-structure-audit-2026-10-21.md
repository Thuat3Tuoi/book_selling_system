# Đối chiếu cấu trúc báo cáo - 21/10/2026

Nguồn yêu cầu chính: `../Requirements/03_cau_truc_bao_cao.pdf` (14 trang, nằm ngoài repo). Tra bổ sung `01_Danh_muc_cong_nghe_Goi_y.pdf`, F2 tr. 12 và D tr. 20. Đây là tiêu chí so sánh được người dùng yêu cầu, không phải lệnh thao tác từ tài liệu.

## Phạm vi và kết luận

Backend không có thư mục tên `report`; có hai báo cáo Word. Bản `REPORT_CCNLTHD_NHOM_9_CAP_NHAT_20261020.docx` đã có 4 phần, Chương 1–14, mục 12.3 và 13.3 cùng 3 phụ lục; phù hợp hơn bản tên dài (bản đó đặt bảng phủ ở 12.4 và thiếu mục AI Disclosure đúng vị trí). Chương chọn thêm 5–10 là cách tổ chức của nhóm, không phải số kỹ thuật/chương tối thiểu do PDF bắt buộc.

Đã lưu bản chỉnh riêng `backend/REPORT_CCNLTHD_NHOM_9_DUNG_CAU_TRUC_20261021.docx`; giữ nguyên cả hai bản nguồn. Đủ khung không có nghĩa là đã đủ nội dung hoặc sẵn sàng nộp.

## Đã sửa

- Chuyển hướng dẫn kiểm chứng đang đứng trước Lời mở đầu thành Phụ lục 5.
- Làm rõ mục tiêu lõi/chọn thêm, bảng kế hoạch đủ 12 tuần và 4 cột theo tr. 2–3; đánh dấu phân công chưa có nguồn.
- Thêm bảng lõi Chương 4 gồm yêu cầu, cơ chế, mã/kết quả và ý nghĩa theo tr. 6; Provider/DI là một nhóm F2, tách hai tiểu mục khi trình bày.
- Làm rõ lý do, cơ chế, kết quả và ứng dụng cho các chương chọn thêm.
- Giữ bảng phủ đúng 12.3, 7 cột; phân biệt SHA tham chiếu với SHA niêm phong cuối kỳ.
- Tách AI Disclosure thành 4 mục; giữ hai lỗi AI có nguồn, đánh dấu thiếu prompt nguyên văn và tự đánh giá.
- Thêm khung Weekly Log 12 tuần; giữ mốc Git riêng, không gán ngày commit thành tuần học khi chưa có lịch.
- Bỏ câu yêu cầu tỷ lệ đóng góp vì tr. 14 quy định không nộp bảng % đóng góp cá nhân.
- Tự kiểm Tầng 2 có đúng 8 mục áp dụng; thêm Phụ lục 4 ghi rõ thiếu sót và hồ sơ phải nộp.
- Sửa thông tin đã cũ: lab đã có tại `HANDS_ON_LAB.md`, PR #13 có merge trong Git cục bộ, slide đã có trong `outputs/`.

## Còn thiếu hoặc chưa đủ minh chứng

| Yêu cầu | Nguồn PDF | Nội dung cần bổ sung |
| --- | --- | --- |
| Thông tin bìa/nhóm | tr. 1, 14 | Trường/khoa, lớp, giảng viên, thành viên/MSSV và người điều phối có xác nhận. |
| Kế hoạch phân công | tr. 2–3 | Người phụ trách thực và lịch tuần học; bảng mới chỉ sửa khung. |
| So sánh đối thủ bằng trải nghiệm | tr. 4, mục 1.3 | Chưa có ứng dụng đối chứng/biên bản nhóm thử hoặc đo NestJS với Express; bảng lý thuyết chưa đủ. |
| Khảo sát vị thế | tr. 4, Chương 2 | Có nguồn/ngày hệ sinh thái nhưng nhận định còn chung; nên thêm quan sát/số liệu phù hợp từ 1–2 nguồn. |
| Ảnh lỗi và mã sửa | tr. 10, mục 13.2 | Đã có 2 lỗi và mã sửa; chưa có ảnh log lỗi gốc. Ba ảnh hiện tại là sơ đồ. |
| AI Disclosure | tr. 10, mục 13.3 | Hai lỗi có nguồn lịch sử; thiếu prompt gốc/ảnh hội thoại, xác nhận vùng mã AI hỗ trợ cao và tự đánh giá không AI. |
| Weekly Log | tr. 12, PL1 | Thiếu 12 tuần dữ liệu thật có người thực hiện/kết quả khớp commit; chưa có Excel/Sheet chi tiết. |
| Minh chứng nhóm | tr. 12, PL2 | Thiếu ảnh Insights/Contributors và ảnh 10–20 commit; cần hồ sơ phân công/MSSV. |
| Chấm chéo lab | tr. 2, tuần 11 | Có file lab 40 phút, starter, 3 bài + đáp án và lỗi thường gặp; chưa có biên bản chấm chéo. |
| Khóa hồ sơ | tr. 8–9, 14 | Chưa có xác nhận SHA/version cuối, thời điểm nộp và bảo vệ đủ khoảng cách >=24 giờ. |
| Gói nộp | tr. 14 | Cần báo cáo PDF toàn văn, Excel/Sheet, source+SHA, slide 5–7 trang, lab, ZIP/RAR. Video 2–3 phút là khuyến khích. |

## Giới hạn phiên bản

Phần kỹ thuật bản nguồn giữ mốc bb7593c và biên bản 19–20/10. HEAD cục bộ khi đối chiếu là 2e41eb295a7ceb9eb378b3db2b49cdab35c07c50, có diff chưa commit. Lượt này không chạy lại test ứng dụng hay kiểm tra GitHub trực tuyến. Đường Swagger hiện tại `/api/docs` khác mốc cũ `/api-docs`; Compose gốc hiện có frontend. Trước niêm phong cần đồng bộ báo cáo, code, sơ đồ/lệnh và bằng chứng cùng phiên bản. Báo cáo `audit-2026-10-21.md` là nguồn riêng, không gán số liệu của nó vào mốc bb7593c.

## Kiểm tra bản chỉnh

- DOCX hợp lệ; có 4 phần, 14 chương đúng thứ tự, 12.1–12.3, 13.1–13.3 và đủ bốn mục con AI Disclosure.
- Có hai bảng 12 tuần (kế hoạch và khung nhật ký), bảng phủ 7 cột với 11 nội dung, ba phụ lục bắt buộc và hai phụ lục bổ sung.
- Giữ nguyên byte của 3 ảnh gốc; có 7 comment tại các vị trí cần giải thích/bổ sung. Hai báo cáo nguồn không thay đổi.
- Đã xuất bằng Microsoft Word và kiểm tra ảnh dàn trang 27 trang; sửa thụt đầu dòng trong bảng, dòng bị tách và trang gần trống. `render_docx.py` không chạy được vì máy thiếu LibreOffice, nên dùng Word và Poppler để kiểm tra thay thế.
- Không chạy lại test backend/frontend trong lượt chỉnh tài liệu này. Các ô thiếu dữ liệu thật vẫn được đánh dấu, không dùng kết quả kiểm tra hình thức để kết luận hồ sơ đã đủ điều kiện nộp.

## Chỉnh văn phong theo yêu cầu của người dùng

Bản Word đã được viết lại theo giọng báo cáo sinh viên: trình bày mục tiêu, giải pháp, quá trình thực hiện, kết quả và hạn chế; giữ nguyên mốc kỹ thuật bb7593c và các số liệu thực nghiệm có nguồn. Các câu mệnh lệnh/rà soát, nhãn yêu cầu bổ sung và bảy comment Word đã được gỡ khỏi bản trình bày. Phụ lục 4 (bảng thiếu sót/hồ sơ nộp) và Phụ lục 5 (hướng dẫn đối chiếu phiên bản) được tách khỏi báo cáo; nội dung rà soát vẫn lưu ở các mục phía trên trong file này. Ba phụ lục bắt buộc, bảng phủ kỹ thuật và bốn nội dung AI Disclosure được giữ lại.

Thông tin danh tính/phân công và nhật ký chưa có nguồn được để dưới dạng trường trống; các hạn chế về thực nghiệm, khảo sát và tự đánh giá AI được diễn đạt thành giới hạn nghiên cứu. Việc sửa văn phong không làm các mục còn thiếu tự trở thành hoàn tất. Các số liệu/kiểm tra 27 trang ở mục trước mô tả bản chỉnh cấu trúc trước khi sửa văn phong.

Bản sau chỉnh văn phong đã được xuất bằng Microsoft Word và kiểm tra dàn trang 24 trang. Kiểm tra cấu trúc xác nhận giữ 4 phần, 14 chương, 3 phụ lục bắt buộc, bảng phủ và bốn nội dung AI Disclosure; không còn comment Word, nhãn yêu cầu bổ sung hoặc câu mở đầu kiểu người rà soát. Ba ảnh gốc và các số liệu thực nghiệm chính được giữ nguyên. Không chạy lại kiểm thử ứng dụng trong lượt sửa văn phong.
