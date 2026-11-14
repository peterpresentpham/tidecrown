# Trang kiểm tra trực quan

Chạy dev ở cổng riêng để không đụng ván lưu trên 3010: `npx vite --host 127.0.0.1 --port 3012`.

- `/tests/v2/showcase.html`: gallery bộ/kỵ/máy/tàu, 23 đơn vị, 14 công trình, cảnh 60 quân. Chọn cảnh/chất lượng rồi **Dựng cảnh**; chọn asset để nhìn gần. Bộ lọc xám và mô phỏng màu chỉ dùng QA. Nút đo camera cần giữ tab hoạt động 4 giây; so sánh kết quả ở cùng kích thước viewport. Nút **Đo hoạt ảnh / idle (12 cấu hình)** chạy các tổ hợp đồ họa × tốc độ AI × giảm chuyển động bằng event tổng hợp.
- `/tests/v2/play.html`: fixture đủ công nghệ và tài nguyên để thử tuyển/xây/đi–đánh/chiếm. **Chỉ dùng ở cổng riêng**: trang ghi đè save của origin mỗi lần tải. Muốn kiểm tra lưu/tải lại, thao tác xong chuyển về `/` rồi reload.
- `node --import tsx tests/v2/healing.ts`: in áp lực hỏa lực khi có Nghỉ và truy đuổi (cùng scenario với `tests/v2-healing.test.ts`).

Các trang này không vào bản production. Luật, sương mù, save và AI được kiểm tra bằng `npm test`; nhịp cả ván đo bằng `npm run selfplay`.
