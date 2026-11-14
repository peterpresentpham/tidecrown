> Lưu ý hiện hành: kế hoạch và điểm dừng ở [06](06-roadmap.md), bản chạy ở [08](08-prototype.md). Phần schema/chuyển ván bên dưới là lịch sử; hiện dùng schema 7 và không chuyển ván cũ.

> Cập nhật 0.6.0: schema lưu hiện tại là `nation-tech-v6`, chuyển tiếp v3–v5; tầm nhìn dùng theo từng loại trong 23 đơn vị, quân trên tàu không mở tầm nhìn riêng. Xem [15 — Bản triển khai](15-implemented-technology-and-animation.md). Nội dung dưới giữ mô tả mốc ra mắt tính năng.

# Sương mù chiến tranh và khám phá bản đồ

Phiên bản 0.4.0 bổ sung khám phá bản đồ theo cách trình bày tham khảo từ Tribal Forts: vùng chưa biết bị che đen, chỉ vùng gần quân/thành được nhìn rõ. Các bán kính và chi tiết luật dưới đây là cấu hình đang dùng của prototype, không khẳng định là thông số chính xác của game gốc.

## Ba trạng thái

| Trạng thái | Hiển thị | Thông tin và thao tác |
| --- | --- | --- |
| Chưa khám phá | Đen, viền chuyển tối dần | Không hiện địa hình, làng, quân hoặc đường biên; không cho đánh hay đi trực tiếp vào ô chưa thấy |
| Đã khám phá, ngoài tầm nhìn | Địa hình làm tối | Giữ làng và thông tin lần thấy cuối, gắn nhãn Cũ; không giữ quân địch hoặc cập nhật bí mật |
| Đang nhìn thấy | Sáng, đầy đủ | Hiện quân, làng và chỉ số hiện tại; cho di chuyển/giao chiến hợp lệ |

Quân đi tới gần mép vùng sáng để mở thêm ô mới. Vùng đã khám phá không bị quên khi quân rút đi. Biển cũng phải được khám phá; ngoài rìa vùng đã biết không hiện biển nền hoặc đảo trang trí để lộ hình dáng bản đồ.

## Tầm nhìn

- Thành/làng đang sở hữu: bán kính 2 ô, kể cả làng vừa chiếm.
- Lính chùy, lính giáo, cung thủ và quân cận chiến hiện tại: 2 ô.
- Máy bắn đá: 3 ô để có thể quan sát mục tiêu ở tầm bắn tối đa.
- Loại trinh sát cũ nếu có trong dữ liệu: 4 ô; không thêm nút tuyển mới trong bước này.
- Tầm nhìn tính theo tám hướng của lưới vuông, hợp nhất giữa mọi đơn vị/thành của cùng phe.
- Rừng/núi chưa chặn tầm nhìn trong bản này. Chúng vẫn ảnh hưởng di chuyển và đường bắn theo luật hiện có.

Thông tin được cập nhật sau mỗi lệnh thành công, khi đổi lượt, tuyển quân, xây/chiếm thành và loại đơn vị. Khi một lệnh đi qua nhiều ô, từng bước đều đóng góp vào vùng đã khám phá, kể cả vùng chỉ nhìn thấy thoáng qua giữa đường.

## Bảo vệ thông tin trong luật chơi

`src/game/visibility.ts` tạo bản quan sát riêng cho mỗi phe. Ô chưa biết chỉ có tọa độ và loại unknown; quân địch khuất tầm nhìn không nằm trong danh sách; tài nguyên, nghiên cứu và nhật ký nội bộ của phe đối phương không được cung cấp cho AI. Bộ lập kế hoạch nhận bản quan sát, không nhận toàn bộ thế giới.

Lệnh đánh kiểm tra tầm nhìn trước khi đọc HP/công sự của mục tiêu. Preview ngoài tầm nhìn không trả số HP hoặc sát thương. Vùng đi được chỉ chứa ô đang nhìn thấy. Vị trí xây thành mới cần được khảo sát đủ vùng xung quanh để không thể dùng nút xây thành dò làng ẩn.

Thông tin công khai như giới hạn tọa độ bản đồ, lượt và kết quả thắng/thua vẫn được giữ. Bản client vẫn chứa mô phỏng cả hai phe; đây là giới hạn quan sát của gameplay/AI, không phải hệ thống chống gian lận multiplayer.

## Nhớ làng và mất tầm nhìn

Làng đã gặp được lưu tên, vị trí, chủ sở hữu, cấp, công sự và lượt nhìn thấy gần nhất. Khi khuất tầm nhìn, mô hình/nhãn làng dùng bản ghi này và làm tối. Nếu địch nâng làng, sửa công sự hoặc chiếm nó khi ta không nhìn thấy, thông tin của ta không tự cập nhật. Khi quay lại, bản ghi được thay bằng thông tin mới.

Quân địch không có bản ghi vị trí cũ hoặc HP cũ trên bản đồ. Đang chọn quân địch mà nó khuất tầm nhìn thì bảng chỉ số cũng không còn hiển thị. Chủ cũ vẫn được ghi nhận việc mất chính làng của mình khi lần chiếm đó làm mất nguồn tầm nhìn cuối cùng.

## AI khám phá

AI ưu tiên mục tiêu đã nhìn thấy hoặc làng đã biết. Khi chưa có mục tiêu tiếp cận được, nó tìm đường qua địa hình đã khám phá tới vùng giáp sương mù, chọn vị trí có thể mở thêm ô. AI không biết địa hình, làng mới hoặc vị trí địch trong vùng đen; thay đổi các dữ liệu đó không được làm thay đổi lệnh AI khi quan sát của nó chưa đổi.

Kinh tế, nghiên cứu, tuyển quân và giới hạn hành động vẫn theo cùng luật với người chơi. Không thêm thưởng tài nguyên để bù cho sương mù.

## Lưu ván và chuyển từ bản cũ

Từ 0.5.0 dùng schema 5, khóa `nation-world-v5`, và tầm nhìn độc lập cho 2–4 phe (xem [tài liệu 12](12-random-map-and-match-setup.md)). Bản 0.4.0 dùng schema 4, khóa `nation-fog-v4`, lưu riêng vùng đã khám phá, vùng đang thấy và thông tin làng của từng phe. Tải lại trang giữ nguyên vùng nhớ; tầm nhìn hợp lệ được kiểm tra so với vị trí quân/thành khi đọc ván lưu.

Nếu chưa có ván schema 4, bản lưu `nation-progress-v3` được chuyển tiếp: giữ tài nguyên, nghiên cứu, đội quân, thành và lượt. Vùng khám phá khởi tạo từ vị trí hiện tại, không đánh dấu toàn bản đồ là đã biết. Khóa v3 gốc vẫn được giữ. Ván mới hiện sao lưu ván hiện tại vào `nation-world-v5-backup`.

Các cơ chế sao lưu dữ liệu lỗi và tắt tự lưu khi không thể giữ bản cũ tiếp tục được áp dụng.

## Cách kiểm tra trực tiếp

Các tọa độ sau dùng cho ván cố định cũ. Ván ngẫu nhiên có tọa độ/tên làng khác, cùng luật khám phá.

1. Mở ván cũ: chỉ thấy Hải Vân và vùng gần quân xanh; chưa thấy nhãn Đồng Cỏ hoặc Hỏa Sơn.
2. Di chuyển lính chùy từ `-8,4` tới `-7,3` hoặc `-7,4`: Đồng Cỏ xuất hiện khi vào tầm nhìn.
3. Kết lượt rồi rút về `-8,4`: Đồng Cỏ làm tối, có nhãn Cũ; vùng đất đã đi qua vẫn còn.
4. Chọn làng cũ để đọc thông tin lần thấy trước, không thể tấn công khi chưa trở lại tầm nhìn.
5. Tải lại trang: vùng đã khám phá và làng cũ vẫn được giữ.

Kiểm thử tự động bao gồm mở bản đồ, nhớ làng, ẩn quân, cấm đánh mù, vùng đi, quét đường di chuyển, mất nguồn tầm nhìn, AI không dùng dữ liệu ẩn, AI khám phá, lưu ván và chuyển schema.
