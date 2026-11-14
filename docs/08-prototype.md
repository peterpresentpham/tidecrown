# Prototype hiện tại 0.7.0

Game chiến thuật 3D theo lượt, chạy cổng 3010. Bản này có cây 45 công nghệ không khóa loại trừ, 23 loại quân, công trình/cải tạo lãnh thổ và hoạt ảnh hành động nhẹ. Bản đồ, sương mù, thiết lập Dễ/Vừa/Khó và 1–3 AI tiếp tục được giữ.

## Vào chơi

Chưa có ván lưu: chọn độ khó, số AI và mã bản đồ. Có ván lưu: tiếp tục ngay. Menu → Ván mới để đổi cấu hình; chỉ thay ván khi bấm Bắt đầu. Bản 0.7.0 bắt đầu ván mới, không chuyển schema cũ. Điều kiện và giao diện hiện hành xem [16](16-technology-audit-and-ui.md).

Quân xanh lam/phù hiệu BẠN là quân mình; đối thủ đỏ/lục/vàng. Khởi đầu một thành và một lính chùy, 20 vàng/16 lương/5 gỗ/12 đá. Bản đồ ngẫu nhiên 33 × 25 ô, 9/12/15 thành/làng. Phe mất hết thành bị loại; người chơi thắng khi loại hết AI.

## Vòng chơi

1. Chọn quân và ô xanh để đi, tiến gần vùng đen để mở bản đồ. Làng trống chiếm bằng bộ/kỵ binh đứng kề.
2. Mở sách để xem cây lớn, tìm công nghệ hoặc chọn đơn vị làm mục tiêu. Trinh sát là nghiên cứu gốc rẻ/nhanh để tìm làng và địch.
3. Nghiên cứu chỉ mở quyền sử dụng. Chọn thành → Quân đội để tuyển; quân chuyên môn còn cần cơ sở như lò rèn, chuồng ngựa, xưởng hoặc cảng.
4. Thành → Công trình để xây và nâng; Lãnh thổ để chọn cải tạo rồi chọn ô vàng hợp lệ. Thu tài nguyên tự động, mỗi thành một công trình/cải tạo mỗi lượt.
5. Chọn quân chuyên môn để thấy hành động: giữ trận, dựng thương, ngắm bắn, triển khai/thu máy, chữa, sửa, lên/xuống tàu hoặc nâng loại.
6. Chọn mục tiêu viền đỏ để đánh. Quân vung/bắn, có đạn/điểm chạm và số sát thương; chờ đoạn hoạt ảnh ngắn trước lệnh tiếp.
7. Kết lượt qua các AI. Quân mới, nghiên cứu và hành động làm mới vào lượt của chính phe đó.

Rừng/đồi tốn hai bước; kiểm lâm đi rừng một bước; đường/cầu 0.5 bước. Núi không đi được. Quân bộ không đi biển nếu không lên tàu. Đơn vị có giá và duy trì riêng, hiển thị trong bảng tuyển. Thiếu vàng/lương đầu lượt sẽ chặn tuyển và hồi phục tự động.

## Điều khiển

Click mô hình/phù hiệu để chọn, click ô xanh để đi, click mục tiêu đỏ để đánh/chiếm. Kéo nền để pan, cuộn hoặc +/− để zoom, Q/E xoay; nút tâm ngắm về quân mình. Cây nghiên cứu có cuộn, tìm kiếm, lọc, đường nối có mũi tên, màu trạng thái và làm sáng toàn bộ chuỗi điều kiện khi chọn công nghệ. Nút Chỉ xem đường này gom riêng các điều kiện cần học. Escape hủy hành động đang chọn hoặc đóng bảng. Giao diện quản lý chỉ mở khi được chọn.

## Phạm vi và giới hạn

Kế hoạch hoàn thiện và điểm dừng bản đầu ở [06 — Kế hoạch 1.0](06-roadmap.md); đối chiếu hiện trạng ở [17 — Kiểm kê](17-implementation-audit.md). Các phần có code dưới đây chưa đồng nghĩa đã qua nghiệm thu cân bằng/AI/hiệu năng.

Cả 45 nút và 23 quân có hành vi trong mô phỏng; chi tiết giá/chỉ số, công trình, tàu và hoạt ảnh ở [15 — Bản triển khai](15-implemented-technology-and-animation.md). Đã có thuyền, vận tải và đổ bộ trên vùng nước hiện tại; bộ sinh bản đồ vẫn là đất liền có biển bao quanh, chưa phải bộ sinh quần đảo riêng.

AI dùng luật chung và hành động chuyên môn ở mức cơ bản; chưa tối ưu phối hợp nhiều quân/hộ tống. Chưa có âm thanh, multiplayer, chiến dịch có cốt truyện hay benchmark trên nhiều thiết bị. Đồ họa là mô hình low-poly tự dựng, không tuyên bố clone đầy đủ mọi chi tiết của Tribal Forts.

## Lưu và kiểm tra

Khóa mới `nation-tech-v7`, dự phòng `nation-tech-v7-backup`; không chuyển ván phiên bản cũ. Bắt đầu lại từ thiết lập ván. Mở hết cây trong một ván là trường hợp được kiểm tra tự động, không bị bộ đọc save từ chối vì học thuyết khác nhau.

```bash
npm run dev
npm test
npm run build
```

Mở `http://127.0.0.1:3010/`. Bản này chạy cục bộ, không deploy.
