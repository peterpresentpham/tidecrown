# Tầm nhìn Vương Quốc Eo Biển

> Tài liệu ý tưởng ban đầu, có các luật/phạm vi đã thay đổi. Không dùng làm checklist bắt buộc cho bản đầu. Phạm vi và điểm dừng hiện hành ở [06 — Kế hoạch 1.0](06-roadmap.md); bản đang chạy ở [08](08-prototype.md).
## Trải nghiệm cốt lõi

Người chơi khởi đầu với một thành nhỏ và mở rộng thành vương quốc trên quần đảo. Chiến thắng đến từ chọn đúng mục tiêu, giữ tiếp viện và phối hợp quân bộ với tàu biển. Một đội quân đông có thể phải rút lui khi cảng phía sau bị chiếm.

Game giữ nhịp suy nghĩ theo lượt và cảm giác phát triển lãnh thổ của Tribal Forts. Cải tiến được đề xuất phải chứng minh bằng trải nghiệm chơi; chưa có cơ sở coi chúng là tốt hơn trước khi kiểm thử.

## Ba trụ cột

1. **Chiến trường dễ đọc:** nhìn bản đồ nhận ra điểm nghẽn, mục tiêu, quân chủ lực và đơn vị đang thiếu tiếp viện.
2. **Phát triển thay đổi cách đánh:** nghiên cứu mở đội hình, công thành, vận tải hoặc phong tỏa; hạn chế nâng cấp chỉ cộng phần trăm.
3. **Có cơ hội phản công:** tiến sâu, bỏ trống cảng hoặc chiếm quá nhiều thành đều tạo điểm yếu cụ thể.

## Vòng chơi

Khám phá → chiếm điểm kinh tế → chọn công nghệ → tuyển quân → giữ tuyến tiếp viện → công thành hoặc đổ bộ → ổn định lãnh thổ → giữ mục tiêu để thắng.

Trong một lượt, người chơi quyết định nên dùng tiền cho quân mới, nghiên cứu hay nâng thành. Trong vài lượt tiếp theo, họ lựa chọn hướng tiến công và cách bảo vệ hậu phương.

## Bối cảnh và hình ảnh

Các tiểu vương quốc tranh quyền kiểm soát một quần đảo trung cổ hư cấu. Công nghệ phát triển từ gỗ, cung và thuyền vận tải đến thành đá, quân chuyên nghiệp và hạm đội. MVP không có thuốc súng, phép thuật hoặc anh hùng có kỹ năng riêng.

Hình ảnh là sa bàn 3D: đảo có vách đá và bãi cát, thành nhỏ có dân cư, quân có cờ và hình dáng rõ ràng. Cảm giác mong muốn là một bàn chiến thuật sống động, có thể quan sát thoải mái bằng chuột.

## Tình huống đại diện

Đối thủ bảo vệ máy bắn đá để ép thành ven biển. Người chơi cố thủ ở cổng, đưa lính giáo chặn kỵ binh, rồi dùng tàu chở quân chiếm cảng hậu phương. Đối thủ mất khả năng hồi phục ngoài tiền tuyến và phải chọn đánh liều, chia quân hoặc rút lui.

Tình huống này cần có thể xảy ra trong bản đầu, không phụ thuộc sự kiện được viết sẵn.

## Phạm vi MVP

| Hạng mục | Quyết định |
| --- | --- |
| Chế độ | Một người đấu hai AI theo lượt tuần tự |
| Bản đồ | Lưới lục giác 3D, 3–5 đảo, một kích thước tiêu chuẩn |
| Thành | 7 thành tổng cộng; 3 thành khởi đầu, 4 thành trung lập |
| Mục tiêu | 3 thành trọng yếu được chỉ định khi sinh bản đồ |
| Kinh tế | Vàng, lương thực, gỗ |
| Quân | Trinh sát, khiên, giáo, cung, kỵ binh, máy bắn đá |
| Tàu | Vận tải, chiến thuyền |
| Phát triển | 3 cấp thành, 12 công nghệ |
| Lưu game | Tự lưu cục bộ, tiếp tục ván đang chơi |
| Nền tảng đầu | Trình duyệt desktop, chuột và bàn phím |

## Sau MVP

Multiplayer, chiến dịch cốt truyện, phe có cơ chế riêng, chuyên môn công nghệ loại trừ nhau, công trình tự đặt trên từng ô, ngoại giao, thời tiết và hỗ trợ cảm ứng đầy đủ.

## Cách đánh giá

- Người mới thực hiện di chuyển, tuyển quân và kết thúc lượt mà không cần người hướng dẫn trực tiếp.
- Người chơi giải thích được lý do thắng hoặc thua một giao chiến từ thông tin trên UI.
- Có nhiều đường phát triển hữu ích theo vị trí bản đồ; không có một khai cuộc bắt buộc.
- Người đang bị ép có thể nêu một phương án phản công khả thi.
- Thời lượng ván và thời gian chờ AI được đo, không suy ra từ số lượt.
