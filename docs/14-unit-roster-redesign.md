# Danh mục đơn vị đề xuất

Trạng thái: danh mục thiết kế đã dùng cho prototype 0.6.0, ngày 14/11/2026; thông số/hành vi thực tế ở [tài liệu 15](15-implemented-technology-and-animation.md). Đi cùng [16 — Cây công nghệ hiện hành](16-technology-audit-and-ui.md); 23 loại đã có định nghĩa, tuyển và mô hình trong bản chạy. Mục tiêu **23 loại: 19 đơn vị trên bộ và 4 tàu**.

## Đơn vị và vai trò

Các mức nhanh/chậm, rẻ/đắt là quan hệ tương đối cần cân bằng; chưa phải thông số đã kiểm thử. Một đơn vị phải có thể bị khắc chế hoặc bị vượt qua bằng chiến thuật/kinh tế, không chỉ bởi một loại quân duy nhất.

| # | Đơn vị | Công nghệ mở | Vai trò và hành động đặc trưng | Yếu điểm/đánh đổi |
| --- | --- | --- | --- | --- |
| 1 | Lính chùy | Có từ đầu | Rẻ nhất; chiếm làng, đồn trú, giữ chỗ cho cung thủ | Thua quân chuyên nghiệp khi đánh trực diện; vẫn đáng tuyển cuối trận vì chi phí thấp |
| 2 | Trinh sát bộ | C1 | Tầm nhìn lớn, nhiều bước; tìm làng, đường đi và đội hình địch; có thể chiếm làng trống | Máu/giáp thấp; không dùng để phá thành hoặc đấu quân chính |
| 3 | Lính khiên | I1 | Che tuyến cung/máy chiến tranh; lệnh giữ trận tăng chống đạn trong lượt đối phương | Sát thương thấp; giữ trận phải bỏ di chuyển/tấn công, không miễn nhiễm nỏ |
| 4 | Lính giáo | I2 | Chống kỵ binh với giá vừa; hộ tống và chiếm đất | Chống bộ binh không bằng kiếm; chống tên kém khiên |
| 5 | Kiếm binh | I3 | Áp sát bộ binh, tiến vào thành sau khi mở đường | Dễ bị bắn nếu thiếu khiên; không tự xuyên tường còn nguyên công sự |
| 6 | Thương binh dài | I4 | Giữ cửa hẹp; lệnh dựng thương chặn thưởng xung phong | Chậm hơn giáo; yếu trước bắn xa và vòng sườn |
| 7 | Bộ binh giáp nặng | I5 | Giữ thành, hấp thụ sát thương và đánh tuyến trước dài hơi | Chậm, đắt; nỏ và công thành chống quân vẫn có thể gây thiệt hại |
| 8 | Cung thủ | R1 | Bắn xa linh hoạt, chống quân nhẹ sau tuyến khiên | Kém hiệu quả với giáp nặng; dễ bị kỵ binh áp sát |
| 9 | Kiểm lâm | R2 | Đi rừng ít tốn bước hơn; tầm nhìn khá, bắn rồi đổi vị trí theo phần bước còn lại | Đắt hơn cung; giáp thấp, không thay lính nỏ chống giáp |
| 10 | Lính nỏ | R3 | Xuyên giáp; đứng sau bộ binh để chống quân nặng; R4 mở ngắm bắn | Không bắn rồi rút như kiểm lâm; ngắm bắn cần đứng yên; dễ bị quân nhanh bắt |
| 11 | Kỵ binh nhẹ | C2 | Đi nhanh trên đất trống, vòng sườn, săn cung/máy, chiếm làng xa | Giáp vừa/thấp; rừng/đồi làm chậm; giáo/thương chặn đột kích |
| 12 | Cung kỵ | C3 | Quấy rối và rút sau bắn bằng phần bước còn lại | Đắt, yếu trước nỏ/cung có vị trí tốt; không được nhận thêm bước miễn phí sau đánh |
| 13 | Kỵ sĩ | C4 | Cận chiến cơ động, xung phong và chiếm thành đã vỡ tường | Cần đường chạy trống để có thưởng xung phong; bị giáo/thương khắc chế |
| 14 | Kỵ sĩ giáp nặng | C5 | Đòn xung phong mạnh vào tuyến nhẹ, chịu tên tốt | Chậm/đắt hơn kỵ sĩ; nỏ, thương dài và địa hình chật làm giảm giá trị |
| 15 | Paladin | C6 | Kỵ binh tinh nhuệ; chọn đánh hoặc cứu chữa một đồng minh bộ/kỵ gần bên | Giá/duy trì rất cao; chữa tốn lương, thay thế đòn đánh; không chữa máy/tàu và không tự hồi vô hạn |
| 16 | Ballista | S2 | Máy bắn tên chống đơn vị, nhất là mục tiêu nặng ở đường bắn thẳng | Chậm, cần đường bắn; phá công sự kém catapult; không đánh sau di chuyển |
| 17 | Catapult | S3 | Phá tường/công sự với chi phí thấp hơn trebuchet | Tầm bắn ngắn hơn trebuchet, yếu khi áp sát; không tự chiếm thành; không đánh sau di chuyển |
| 18 | Trebuchet | S5 | Công thành tầm xa; lệnh triển khai/thu máy, cần tuyến bảo vệ | Phải bỏ lượt triển khai, di chuyển rất chậm; không thay ballista chống quân |
| 19 | Công binh | S8 | Sửa máy/công sự, xây cầu ngắn và công trình tuyến trước | Không chiếm thành; công việc tốn tài nguyên và hành động; yếu khi bị săn |
| 20 | Thuyền trinh sát | N1 | Rẻ, nhanh, mở sương mù ven bờ, theo dõi tàu vận tải | Không chở quân; hỏa lực rất thấp; yếu khi gặp chiến hạm |
| 21 | Tàu vận tải | N2 | Chở đơn vị bộ, là công cụ mở đảo/đổ bộ | Không phải chiến hạm; dễ bị chặn nếu thiếu hộ tống; số chỗ hữu hạn |
| 22 | Chiến hạm | N4 | Bắn xa trên biển, hộ tống, chặn tàu vận tải và hỗ trợ ven bờ | Đắt hơn thuyền trinh sát, không tự chiếm thành trên đất |
| 23 | Chiến hạm hạng nặng | N5 | Hỏa lực ballista chống tàu/giáp và ép bờ | Chậm, đắt, không thay tàu vận tải; kém cơ động hơn chiến hạm thường |

## Công binh

Mở ở S8, không phải chiến binh tuyến đầu. Dùng lượt để sửa máy hoặc công sự, làm cầu qua đoạn nước hẹp một ô và đặt công trình tuyến trước; mọi công việc tốn tài nguyên và cần vị trí hợp lệ. Không sửa và đánh trong cùng lượt; không xây cầu ra biển sâu hoặc dựng công sự ngay bên cạnh quân địch mà không kiểm tra. Quân nhanh có thể săn công binh; giữ công binh ở phía sau giúp đối thủ có mục tiêu đánh vào.

Đường bộ E8 có thể xây từ thành trong lãnh thổ trước khi có công binh, nên S8 không trở thành nút bắt buộc chỉ để sử dụng đường. Tháp canh là công trình, không tính là loại quân có thể di chuyển.

## Các quy tắc phải chốt trước khi làm chỉ số

- Mỗi đơn vị có HP, công, giáp, bước, tầm đánh, tầm nhìn, giá tuyển, duy trì và khả năng chiếm thành. Thêm hiệu ứng bằng thuộc tính/luật riêng, không sao chép nhiều engine chiến đấu.
- Quân cận chiến bộ và kỵ có thể chiếm thành hết công sự; máy, tàu và công binh không tự chiếm. Tàu vận tải cần đưa quân bộ lên bờ.
- Không có mua sức mạnh rồi dùng kỹ năng miễn phí vô hạn: giữ trận, dựng thương, ngắm bắn, triển khai máy, chữa và sửa đều dùng hành động với giới hạn rõ.
- Xung phong chỉ có thưởng nếu đi liên tục đủ ô trên đất trống trước đòn đánh; không được cộng khi đứng kề hoặc qua rừng/đồi. Dựng thương chặn thưởng đó, không tự tiêu diệt kỵ binh bất kể HP/giáp.
- Bắn rồi rút chỉ dùng phần bước chưa tiêu, không làm mới lượt. Đơn vị thường đánh xong kết thúc di chuyển, trừ loại có đặc tính cơ động tương ứng.
- Nỏ xuyên một phần giáp, không bỏ qua toàn bộ giáp/công sự. Công thành có sát thương đơn vị và sát thương công sự riêng để tránh một máy giải quyết mọi mục tiêu.
- Không thêm sát thương diện rộng cho catapult trong đợt đầu: cần kiểm tra đội hình và giao diện preview trước, tránh gây sát thương đồng đội ngoài dự đoán.
- Lên/xuống tàu phải có ô hợp lệ, sức chứa và thời điểm dùng lượt. Đơn vị nặng chiếm nhiều chỗ hơn quân nhẹ. Không cho một tàu chở quân vô hạn.
- Mất tàu vận tải: cần báo rõ rủi ro trước khi chở. Đề xuất quân trên tàu mất theo tàu; không sinh quân lên ô đất tùy tiện. Đây là quyết định thiết kế cần được duyệt trước khi thực hiện.
- Nâng loại quân cần ở thành mình có công trình tương ứng, trả phần chi phí quy định và dùng lượt; không tự nâng toàn bộ đội quân khi nghiên cứu xong. HP sau nâng không được tự chữa đầy miễn phí.

## Khắc chế và đội hình

| Tình huống | Công cụ có lợi | Đối thủ có thể phản ứng |
| --- | --- | --- |
| Địch nhiều kỵ binh | Giáo/thương giữ vị trí, nỏ sau tuyến | Dùng cung/máy bắn để phá thương trước khi xung phong |
| Địch nhiều cung | Khiên che quân, kỵ nhẹ vòng sườn | Giáo bảo vệ cung, chặn đường vòng |
| Địch nhiều giáp nặng | Nỏ, ballista và kiểm soát đường tiếp cận | Kỵ binh/kiểm lâm săn tuyến bắn |
| Thành nhiều công sự | Catapult/trebuchet, bộ binh bảo vệ | Đánh ra săn máy, sửa tường bằng nguồn lực hữu hạn |
| Vùng rừng dày | Trinh sát, kiểm lâm, bộ binh | Giữ đường trống/nút giao, tránh đuổi kỵ binh vào rừng |
| Đổ bộ qua biển | Vận tải + chiến hạm + quân bộ | Trinh sát biển, chặn vận tải hoặc giữ bãi đổ bộ |

Không dùng quan hệ khắc chế cứng “A luôn thắng B”. HP còn lại, số lượng, địa hình, vị trí, công nghệ và khả năng trả duy trì đều ảnh hưởng kết quả.

## Điều kiện nghiệm thu cho từng đơn vị

Mỗi loại cần mô hình/biểu tượng dễ phân biệt, preview đúng sát thương và hành động, giá/duy trì thật, công nghệ và công trình tuyển đúng điều kiện, AI biết tuyển và dùng, lưu/tải được, cùng ít nhất một tình huống kiểm tra vai trò lẫn cách khắc chế. Không tính đổi tên/màu hoặc chỉ tăng HP là đã thêm một loại quân có vai trò mới.
