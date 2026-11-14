# Đồ họa và giao diện web

> Tài liệu ý tưởng ban đầu, có các luật/phạm vi đã thay đổi. Không dùng làm checklist bắt buộc cho bản đầu. Phạm vi và điểm dừng hiện hành ở [06 — Kế hoạch 1.0](06-roadmap.md); bản đang chạy ở [08](08-prototype.md).
## Hướng mỹ thuật

Phong cách sa bàn trung cổ 3D, hình khối gọn, chất liệu có màu và độ nhám rõ. Màu chủ đạo: biển xanh lam ngọc, đất xanh rêu, cát kem, đá xám ấm, mái ngói đất nung. Màu phe nằm trên cờ, khiên, mái phụ và viền chọn, không nhuộm toàn bộ cảnh.

Mục tiêu là cảnh đẹp khi quan sát gần và chiến trường dễ hiểu khi thu nhỏ. Mô hình phức tạp hoặc hiệu ứng không giúp nhận biết tình huống sẽ được giảm trước.

## Camera và bản đồ

Camera trực giao nghiêng khoảng 45 độ; kéo chuột phải để dịch, Q/E xoay từng nấc 60 độ, con lăn zoom. Cho phép đổi phím khi phát triển sau MVP. Giới hạn camera trong vùng bản đồ, không lật xuống dưới đất.

Địa hình dùng ô lục giác với cao độ rời rạc. Viền ô chỉ hiện khi chọn quân hoặc bật lớp chiến thuật. Đường tiếp viện, tầm bắn và lãnh thổ là các lớp riêng có nút bật tắt.

Mây sương mù có chuyển động nhẹ; khi bật giảm chuyển động, dùng lớp mờ tĩnh. Cây và nhà che đơn vị được làm mờ trong lúc chọn quân đó.

## Đọc hình dáng đơn vị

| Đơn vị | Dấu hiệu chính |
| --- | --- |
| Trinh sát | Áo choàng ngắn, túi hành trang, cờ nhỏ |
| Khiên | Khiên lớn phía trước, đội hình chắc |
| Giáo | Giáo dài vươn cao, dễ thấy khi zoom xa |
| Cung | Cung cong và bao tên, tư thế giương cung |
| Kỵ binh | Ngựa và cờ dài, diện tích hình lớn hơn bộ binh |
| Máy bắn đá | Tay đòn cao, bánh xe và khung gỗ |
| Vận tải | Thân rộng, biểu tượng hàng/quân đang chở |
| Chiến thuyền | Thân dài, khiên dọc mạn, cờ chiến |

Một thực thể gameplay có thể biểu diễn bằng 3–5 lính; số người trang trí không quyết định HP. HP thể hiện bằng thanh và số khi chọn, tránh làm người chơi suy luận sai số quân.

## Thành và hiệu ứng

Ba bộ hình thành: trại có hàng rào gỗ, thành có tường đá, pháo đài có tháp cao. Chợ, nông trại, xưởng và cảng có phần mô hình gắn thêm để đọc được chuyên môn từ cảnh.

Công sự có ba trạng thái hình: nguyên vẹn, hư hại, sụp. Đòn đánh có chuẩn bị ngắn, hiệu ứng trúng, phản ứng và số sát thương. Di chuyển và chiến đấu có nút tăng tốc; chuyển động trang trí không chặn lượt.

Thời lượng mục tiêu cho một đòn đánh thông thường là 0,4–0,8 giây. Cho phép bỏ qua hoạt ảnh AI. Âm thanh phân biệt bước chân, tên, va khiên, đá và chuông chiếm thành; luôn có tùy chọn tắt.

## Bố cục desktop

```text
┌──────────────────────────────────────────────────────────┐
│ Vàng + ròng │ Lương + ròng │ Gỗ + ròng │ Lượt │ Mục tiêu  │
├──────────────────────────────────────────────┬───────────┤
│                                              │ Bảng chọn │
│               BẢN ĐỒ 3D                      │ thành hoặc│
│                                              │ quân      │
│                                              │           │
├────────────┬─────────────────────────────────┼───────────┤
│ Bản đồ nhỏ │ Lệnh theo ngữ cảnh               │ Kết lượt  │
└────────────┴─────────────────────────────────┴───────────┘
```

Thanh tài nguyên thể hiện kho hiện tại và thu nhập ròng; tooltip tách thu nhập với duy trì. Bảng phải rộng vừa đủ, tự thu khi bỏ chọn. Cây công nghệ là màn phủ riêng; mở hoặc đóng không làm mất vị trí camera.

## Luồng tương tác

1. Chọn quân: hiện ô đi được, mục tiêu đánh được và trạng thái tiếp viện.
2. Trỏ ô: xem đường đi, chi phí hoặc preview chiến đấu.
3. Click ô hợp lệ: gửi lệnh; click mục tiêu đánh cần xác nhận lần hai qua nút Tấn công trong preview.
4. Escape: hủy preview hoặc bỏ chọn, không kết thúc lượt.
5. Kết lượt: cảnh báo nhẹ khi còn quân chưa hành động; cho phép bỏ cảnh báo các lần sau.

Preview giao chiến phải ghi HP trước/sau dự kiến, phản kích, thưởng địa hình, tác động lên công sự và việc đơn vị mất khả năng di chuyển. Không hiện dữ liệu quân địch ngoài tầm nhìn.

Không có hoàn tác di chuyển trong MVP vì khám phá sương mù có thể lộ thông tin không thể thu hồi. Đường đi preview và xác nhận đòn đánh giúp tránh thao tác nhầm.

## Trạng thái bắt buộc có giao diện

Thiếu tài nguyên; không có ô tuyển; quân đã hành động; nghiên cứu bị hủy do mất thành; thành đang ổn định; quân mất tiếp viện; tàu chở quân; đường bắn bị chắn; đang xử lý lượt AI; lưu thất bại; chiến thắng/thua; tiếp tục ván lưu không tương thích.

Thông báo ghi nguyên nhân và cách xử lý khi có thể, ví dụ “Cảng bị phong tỏa — đưa chiến thuyền địch ra khỏi vùng đánh dấu để nối tiếp viện”. Không đưa log hay chi tiết kỹ thuật vào thông báo người chơi.

## Asset và chất lượng

Asset cần nguồn và giấy phép rõ ràng. Ảnh Tribal Forts chỉ dùng tham khảo trong tài liệu, không dùng làm texture, icon hoặc tài sản phát hành.

Mốc hình ảnh MVP: một bộ địa hình, ba cấp thành, bốn mô hình công trình gắn thêm, sáu quân bộ, hai tàu, icon cho 12 công nghệ và ba tài nguyên. Dùng material dùng chung, instancing cho vật trang trí và mức chi tiết theo khoảng cách. Mục tiêu hiệu năng được kiểm tra theo tài liệu kỹ thuật.
