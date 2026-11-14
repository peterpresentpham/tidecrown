# Lộ trình phát triển

Cập nhật 14/11/2026. Đây là nguồn duy nhất về việc đang làm, việc tiếp theo và những gì để sau. Luật hiện hành ở [gameplay.md](gameplay.md); nội dung ở [technology.md](technology.md) và [units.md](units.md).

## Đích đến

Game chiến thuật 3D theo lượt, chơi đơn trên web: một thành/một lính → khám phá → chiếm làng → nghiên cứu, phát triển quân → đánh bại 1–3 AI. Một ván phải có khai cuộc, chạm trán, giao tranh, công thành và **kết thúc rõ ràng** trong thời lượng hợp lý. Chạy cục bộ; chưa có backend, tài khoản, multiplayer hoặc phát hành công khai.

## Hiện trạng

Đã có và chạy được:

- Bản đồ 33 × 25 ô vuông (Đất liền / Hai bờ biển), sinh theo mã; sương mù và ký ức bản đồ; Dễ/Vừa/Khó; 1–3 AI.
- 45 công nghệ, 7 nhánh, không khóa loại trừ; 23 đơn vị (19 bộ, 4 tàu); 14 công trình và cải tạo ô.
- Chiến đấu xác định: sát thương theo HP, vùng khống chế, giữ trận/dựng thương/ngắm bắn, Nghỉ, vây thành, tháp/tường; vận tải và đổ bộ.
- AI dùng observation như người chơi: khám phá, phát triển, đội hình bộ, hải quân.
- Đi–đánh một lần bấm, dự báo hai phía, hoàn tác bước đi, vùng nguy hiểm, tóm tắt lượt AI; cảm ứng chọn rồi xác nhận.
- Mô hình low-poly cho đủ quân/công trình, hoạt ảnh hành động, ba mức đồ họa, tốc độ AI Nhanh.
- Lưu cục bộ schema 8; cây công nghệ dạng làn theo nhánh, có lộ trình và chỉ số quân được mở.

Chưa được kiểm chứng bằng người chơi thật: thời lượng ván, độ khó, khả năng nhận dạng quân, điện thoại thật.

## Vấn đề đã biết

Đo bằng `npm run selfplay` (mọi phe do AI điều khiển dưới sương mù), 30 ván ở Dễ/Vừa/Khó, 1–3 AI, Đất liền và Hai bờ biển, giới hạn 160 lượt:

| Chỉ số | Kết quả |
| --- | --- |
| Ván chạm giới hạn, không ai thắng | **27/30** |
| Ván có kết quả | lượt 88, 100, 147 |
| Vàng tồn trung bình mỗi lượt | trung vị ~670, có phe > 6.000 |
| Số thành ngừng thay đổi | thường từ lượt 30–40, dù giao chiến tiếp diễn |

Nguyên nhân quan sát được trong code và trace:

1. **Trần quân AI cố định** (`DIFFICULTIES.maxArmy` 6/8/12) không tăng theo kinh tế; tài nguyên dư không có chỗ tiêu.
2. **AI đưa quân tới từng đơn vị**, không tập hợp trước khi công thành.
3. **Mục tiêu AI dao động** giữa vây và phòng thủ mỗi lượt (`armyIntent`) khi một quân lẻ tới gần thành nhà.
4. **Thủ phủ quá bền:** công sự tới 50 (cấp 3 + tường), tháp bắn mỗi lượt, sửa +2/lượt; quân thường chỉ phá 1 công sự/đòn.
5. Lính chùy khởi đầu có 1 bước nên không vào được rừng/đồi (tốn 2).
6. Khởi đầu 5 gỗ, thu 0 gỗ, xưởng gỗ cần 6 gỗ: chưa xây được ngay.
7. Cây công nghệ: 27/57 điều kiện đi qua nhánh khác; một số quân cần 10–12 công nghệ cộng chuỗi công trình.

## Việc tiếp theo

Theo thứ tự ưu tiên. Mỗi mục đo lại bằng `npm run selfplay` và test liên quan.

### 1. Ván phải kết thúc được

- Trần quân AI theo số thành/thu nhập; tiêu tài nguyên dư vào quân, nâng quân hoặc nâng thành.
- AI tập hợp quân ở điểm cách mục tiêu 3–4 ô trước khi công thành; giữ mục tiêu vây tối thiểu vài lượt.
- Hạ công thành dễ hơn: chặn sửa khi có địch kề thành, hoặc quân cận chiến phá 2 công sự/đòn, hoặc thành bị vây mất công sự mỗi lượt. Chọn một, đo, rồi mới thêm.
- Cân nhắc điều kiện thắng sớm (mất thủ phủ thì đầu hàng, hoặc giữ 2/3 số thành trong 5 lượt).
- Thêm test: ≥ 80% ván self-play kết thúc trước lượt 100 trên tập seed cố định.

### 2. Gọn cây công nghệ

Đề xuất ~27 nút, 6 nhánh tự đứng được, tối đa một điều kiện từ nhánh khác mỗi nút; giữ đủ 23 đơn vị (một số công nghệ mở hai quân: Giáo binh → giáo + thương dài; Thiết kỵ → thiết kỵ + Paladin; Hàng hải → thuyền trinh sát + vận tải; Đường bộ → công binh). Quân cấp I–II không cần công trình riêng. Giao diện cây đã tự xếp theo dữ liệu nên chỉ cần đổi `technologies.ts`, công trình, AI và test.

Kèm theo: hàng đợi nghiên cứu theo lộ trình đã chọn (hiện mỗi lần chỉ chọn được một công nghệ).

### 3. Khai cuộc và quyết định mỗi lượt

- Lính chùy 2 bước; đủ gỗ để xây xưởng gỗ sớm.
- Cảnh báo kết lượt khi còn quân/thành chưa dùng.
- Bảng tuyển chỉ hiện quân tuyển được ngay và 1–2 quân sắp mở.
- Hiện lợi thế khắc chế trong dự báo giao chiến (ví dụ "Giáo +3 vs kỵ").

### 4. Sức khỏe code

- Tách `src/game/engine.ts` theo hệ thống: di chuyển, chiến đấu, kinh tế, thành, lượt.
- AI kiểm tra lệnh bằng `execute()` (clone toàn bộ state); tách hàm validate không clone.
- `src/ui/App.tsx` còn 11 cảnh báo React hooks (setState trong effect, đọc ref khi render): tách luồng state.

## Để sau

Không thuộc các mục trên; chỉ làm khi có phản hồi chơi thật hoặc nhu cầu rõ:

- Yếu tố ngẫu nhiên có kiểm soát (sượt/dao động), cựu binh, tổn thất khi chiếm thành.
- Môi trường động, tự chọn cấu hình đồ họa theo thiết bị, đóng gói app điện thoại.
- Âm thanh, chiến dịch cốt truyện, multiplayer, phát hành công khai.
- Đổi tên sản phẩm (repo GitHub đang tên `tidecrown`; tên trong game vẫn là Vương Quốc Eo Biển).

## Nguyên tắc

- Sửa luật ở engine/data trước; UI và AI dùng chung điều kiện.
- Mỗi thay đổi luật/cân bằng phải đo lại bằng self-play và test; không dùng số đo của luật cũ.
- Kết quả mô phỏng không thay cho playtest; số lượt không quy đổi thành phút chơi.
- Không thêm hệ thống mới để che một vấn đề cân bằng khi chỉnh tham số là đủ.
