# Thiết kế lại toàn bộ cây công nghệ

> Mốc lịch sử 0.6.0. Điều kiện công nghệ, giao diện và lưu ván đã được thay thế ở [16 — Rà soát 0.7.0](16-technology-audit-and-ui.md).
Trạng thái: thiết kế làm cơ sở cho bản triển khai 0.6.0, ngày 14/11/2026. Xem [15 — Bản triển khai](15-implemented-technology-and-animation.md) cho thông số thực tế, các điều chỉnh và giới hạn.

## Điều chỉnh định hướng

Người dùng muốn cây phong phú, phức tạp và nhiều quân hơn Tribal Forts; yêu cầu cải thiện các nút ít hữu ích trước đó không có nghĩa là rút gọn cây. Cây chín nút hiện tại và các lựa chọn khóa vĩnh viễn không đáp ứng định hướng này.

Ảnh do người dùng cung cấp xác nhận các tên như Basic/Advanced Woodworking, Forestry Management, Archery, Crossbowmen, Mounted Archery, Siege Technology, Ballistas, Catapults, Naval Technology, Transport Ships, Warships, Basic/Advanced Agriculture, Advanced Irrigation, Basic/Advanced Metalworking, Iron Working, Spearmen, Swordsmen, Mounted Knights và Paladin’s Path. Không suy ra toàn bộ chỉ số, kỹ năng hoặc điều kiện AND/OR của game gốc chỉ từ đường nối trên ảnh. Cây dưới đây là thiết kế mới, không phải bản chép chính xác cây gốc.

Mục tiêu: **45 công nghệ, 7 nhánh, 23 loại đơn vị**, gồm 19 quân bộ/hỗ trợ trên bộ và 4 loại tàu. Danh sách và vai trò quân ở [14 — Danh mục đơn vị](14-unit-roster-redesign.md).

## Nguyên tắc

1. Mỗi nút phải mở một đơn vị, công trình, hành động hoặc nâng cấp có điều kiện sử dụng rõ. Không kéo dài cây bằng nhiều nút cộng vài phần trăm cùng một chỉ số.
2. Có công nghệ nền, nhánh chuyên môn và công nghệ giao nhau. Đơn vị mạnh cần một nền kinh tế chịu được giá tuyển/duy trì, không chỉ trả phí mở khóa.
3. Toàn bộ 45 công nghệ của cả bảy nhánh đều mở được trong cùng một ván. Không có bất kỳ cặp công nghệ, học thuyết hoặc nhánh loại trừ nhau; nghiên cứu một nút không khóa, xóa hoặc làm mất tác dụng của nút khác. Người chơi có thể phát triển đồng thời bộ binh, cung/nỏ, kỵ binh, công thành, hải quân và kinh tế. Đánh đổi nằm ở tài nguyên, thời gian và đội hình, không nằm ở khóa vĩnh viễn.
4. Không phải nghiên cứu hết để thắng. Chuyên sâu hai hoặc ba hướng phải cạnh tranh được với phát triển rộng. Mỗi nhánh là một công cụ để giải quyết tình huống, không phải nghĩa vụ mua mọi thứ.
5. Quân cũ giữ vai trò: chùy rẻ để chiếm/đồn trú; giáo cơ động hơn thương dài; cung linh hoạt hơn nỏ; máy bắn đá rẻ hơn trebuchet. Quân cấp sau không tự thay toàn bộ quân cấp trước.
6. Địa hình làm lựa chọn khác nhau: rừng hợp kiểm lâm; đồng bằng hợp kỵ binh; thành lớn cần công thành; biển cần vận tải và hộ tống. Công nghệ kinh tế phải hiện dự báo tác dụng với chính lãnh thổ hiện có.
7. Nghiên cứu hoàn tất chỉ mở quyền tuyển/xây/hành động. Không tự biến mọi quân thành quân mới. Nâng một đơn vị lên loại kế tiếp là lệnh riêng ở gần thành mình, tốn tài nguyên và mất lượt hành động.
8. Không thêm tài nguyên ngựa/sắt riêng trong bước thiết kế này. Dùng vàng, lương, gỗ, đá; công nghệ và công trình chuyên dụng thể hiện chuỗi sản xuất.

## Cách đọc điều kiện

Tất cả mã ở cột điều kiện của một nút đều bắt buộc (AND), trừ khi ghi OR rõ ràng. Dấu “—” là nút gốc. Mã chỉ dùng cho tài liệu/schema; giao diện hiển thị tên và hình minh họa.

Điều kiện tiên quyết chỉ quy định thứ tự nghiên cứu. Các đường rẽ đều có thể đi tiếp, không phải lựa chọn chỉ được lấy một bên. Khi đủ điều kiện, tài nguyên và thời gian, một phe có thể hoàn thành toàn cây; không có hạn mức tổng số công nghệ hoặc khóa theo phe/lối chơi. Hạn chế địa hình, vị trí cảng hay ô công trình chỉ ảnh hưởng nơi sử dụng công nghệ, không cấm nghiên cứu nhánh đó.

Cấp I: nền tảng; II: đầu trận; III: giữa trận; IV: cuối trận. Cấp chỉ là nhóm trình bày và khung cân bằng, không phải khóa thời đại bắt mua mọi công nghệ cấp trước.

## A — Lương thực, thương mại và hạ tầng: 8 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| E1 | Nông nghiệp | I | — | Mở nông trại trên đất phù hợp; tạo nguồn lương để nuôi đội quân lớn |
| E2 | Kho lương | II | E1 | Mở kho lương tại thành; giảm phần lương duy trì của chính thành đó |
| E3 | Thâm canh | III | E2 | Cho nâng nông trại thành ruộng thâm canh, dùng thêm vàng/gỗ để tăng sản lượng |
| E4 | Thủy lợi | IV | E3, M5 | Mở nâng cấp mạng tưới cho cụm ruộng liền kề; tác dụng theo số ruộng được nối, không cộng đều toàn đế quốc |
| E5 | Chăn nuôi | II | E1 | Mở đồng cỏ chăn nuôi; phương án lương cho vùng nhiều đồng bằng, nền cho nhánh ngựa |
| E6 | Thuần dưỡng ngựa | II | E5 | Mở chuồng ngựa, là điều kiện tuyển kỵ binh tại thành có chuồng |
| E7 | Thương mại | II | E2 | Mở chợ; thu nhập phụ theo số thành mình được nối đường, có giới hạn |
| E8 | Đường bộ | III | E7, M5 | Cho công binh/thành xây đường trong lãnh thổ; đường giảm chi phí di chuyển, nối chợ và đưa máy công thành ra tuyến trước |

Không mô phỏng nước mặn thành nguồn tưới: Thủy lợi là nâng cấp ruộng theo cụm, không tự thưởng vì gần biển. Tác dụng chính xác của mạng tưới và thương mại phải có giới hạn để tránh tăng sản lượng vô hạn.

## B — Gỗ, khai khoáng và luyện kim: 8 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| M1 | Chế biến gỗ | I | — | Mở xưởng gỗ và nền chế tạo cung, khiên, tàu |
| M2 | Quản lý rừng | II | M1 | Cho trồng/phục hồi rừng ở ô phù hợp và khai thác bền vững; mở hướng kiểm lâm |
| M3 | Mộc cao cấp | III | M2 | Mở xưởng cơ khí gỗ; điều kiện cho nỏ, máy chiến tranh và thân tàu lớn |
| M4 | Khai khoáng | I | — | Mở mỏ trên đồi; tăng nguồn đá theo địa hình thực tế |
| M5 | Chế tác đá | II | M4 | Mở mỏ đá nâng cao và nền đường bộ, tường thành, máy bắn đá |
| M6 | Luyện kim | II | M4 | Mở lò rèn và vũ khí đầu kim loại; dẫn tới lính giáo và nỏ |
| M7 | Rèn sắt | III | M6 | Nâng lò rèn, mở điều kiện kiếm binh và cơ cấu nỏ tinh xảo |
| M8 | Luyện thép | IV | M7, M3 | Mở xưởng thép; nền bộ binh/kỵ binh nặng và máy vây hãm lớn |

## C — Bộ binh: 6 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| I1 | Khiên trận | II | M1 | Mở lính khiên, có lệnh giữ trận chống tên |
| I2 | Giáo binh | II | M6 | Mở lính giáo chống kỵ binh, cơ động vừa |
| I3 | Kiếm thuật | III | I2, M7 | Mở kiếm binh đánh bộ binh và tiến chiếm thành |
| I4 | Thương dài | III | I2, M3 | Mở thương binh chậm nhưng chặn xung phong; không thay toàn bộ lính giáo |
| I5 | Bộ binh giáp nặng | IV | I3, M8 | Mở bộ binh nặng để giữ cửa thành và tuyến hẹp |
| I6 | Con đường Paladin | IV | I5, C5 | Mở Paladin, kỵ binh tinh nhuệ có hành động cứu chữa hạn chế; giá và duy trì cao |

## D — Cung và nỏ: 4 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| R1 | Cung thuật | II | M1 | Mở cung thủ đánh xa cơ bản |
| R2 | Kiểm lâm | III | R1, M2 | Mở kiểm lâm: đi rừng nhẹ hơn, đánh linh hoạt, yếu trước giáp nặng |
| R3 | Chế tạo nỏ | III | R1, M3, M6 | Mở lính nỏ xuyên giáp tốt, kém cơ động |
| R4 | Xạ kích chính xác | IV | R3, M7 | Mở lệnh ngắm bắn cho lính nỏ: bỏ di chuyển để tăng xuyên giáp; không tự làm mọi cung thủ chậm lại |

## E — Trinh sát và kỵ binh: 5 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| C1 | Trinh sát | I | — | Mở trinh sát bộ giá thấp, tầm nhìn lớn; lựa chọn sớm để tìm làng và đối thủ |
| C2 | Kỵ binh nhẹ | II | C1, E6 | Mở kỵ binh nhẹ, vòng sườn và săn cung/máy chiến tranh |
| C3 | Kỵ xạ | III | C2, R2 | Mở cung kỵ; có thể dùng phần bước còn lại sau bắn theo giới hạn riêng |
| C4 | Kỵ sĩ | III | C2, I3 | Mở kỵ sĩ cân bằng để đột kích và chiếm đất |
| C5 | Thiết kỵ | IV | C4, M8 | Mở kỵ sĩ giáp nặng; xung phong mạnh nhưng tốn lương và dễ bị thương dài khắc chế |

C1 phải rẻ và nhanh hơn các nhánh quân nâng cao. Việc tìm đối thủ không được bắt người chơi đầu tư hết chuỗi nông nghiệp → ngựa.

## F — Công thành, phòng thủ và công binh: 8 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| S1 | Kỹ thuật công thành | III | M3, M6 | Mở xưởng công thành, cần có xưởng ở thành để tuyển máy |
| S2 | Ballista | III | S1, R3 | Mở máy bắn tên chống đơn vị; ít hiệu quả với tường |
| S3 | Máy bắn đá | III | S1, M5 | Mở catapult để phá công sự |
| S4 | Hậu cần vây hãm | IV | S1, E8 | Mở lắp/thu trận địa công thành: đổi một lượt chuẩn bị lấy khả năng đưa máy đi theo đường và triển khai ở tuyến trước |
| S5 | Trebuchet | IV | S3, S4, M8 | Mở máy bắn đá đối trọng tầm xa; phải triển khai, yếu khi bị áp sát |
| S6 | Tường thành | II | M5 | Cho xây/nâng tường độc lập với cấp kinh tế của làng |
| S7 | Tháp canh | III | S6, R1 | Mở tháp phòng thủ, chỉ bắn trong tầm nhìn; cần nguồn lực duy trì |
| S8 | Công binh | IV | S4, S6 | Mở công binh sửa máy/công sự, làm cầu ngắn và công trình tuyến trước |

Không bắt học Ballista để mở Trebuchet. Đó là hai nhánh chống quân và phá thành khác nhau. Đường bộ có thể do thành xây trong lãnh thổ từ E8; chưa cần S8 chỉ để dùng công nghệ E8.

## G — Hàng hải và đổ bộ: 6 nút

| Mã | Công nghệ | Cấp | Điều kiện | Tác dụng cần triển khai |
| --- | --- | --- | --- | --- |
| N1 | Hàng hải | II | M1 | Mở cảng và thuyền trinh sát ven bờ |
| N2 | Tàu vận tải | II | N1 | Mở tàu chở quân; quân bộ không tự biến thành tàu |
| N3 | Buồm và đóng tàu | III | N1, M3 | Mở hành trình xa bờ cho tàu đủ loại và nâng xưởng cảng |
| N4 | Chiến hạm | III | N3, R1 | Mở chiến hạm bắn xa, hộ tống tàu vận tải |
| N5 | Chiến hạm hạng nặng | IV | N4, S2 | Mở chiến hạm mang ballista, chống tàu và ép bờ; chậm/đắt hơn tàu thường |
| N6 | Chiến thuật đổ bộ | IV | N2, S8 | Mở lệnh đổ bộ có tổ chức cho tàu vận tải, giảm bất lợi lên bờ; không cho đánh miễn phí ngay khi lên bờ |

Nhánh này chỉ phát huy khi có bản đồ biển/đảo, cảng, chở quân và hải chiến thật. Không đưa nút mua được nhưng chưa có tác dụng vào bản chơi.

## Ví dụ đường phát triển

- Mở đất sớm: Trinh sát → tìm làng → Nông nghiệp/Kho lương → tăng quân chùy/giáo. Chưa cần luyện thép hoặc tàu.
- Giữ đất rừng: Gỗ → Quản lý rừng + Cung thuật → Kiểm lâm; thêm Khiên trận và thương mại khi mở rộng.
- Phản công kỵ binh: Khai khoáng → Luyện kim → Giáo binh; muốn giữ nút giao thì thêm Mộc cao cấp → Thương dài.
- Đánh thành: phát triển gỗ/kim loại → Xưởng công thành → Catapult; nâng hậu cần/đường trước khi đầu tư Trebuchet.
- Đột kích đồng bằng: Chăn nuôi → Ngựa + Trinh sát → Kỵ binh nhẹ; chọn Kỵ xạ hoặc Kỵ sĩ theo loại địch.
- Bản đồ đảo: Gỗ → Hàng hải → Vận tải để lấy đất; thêm Chiến hạm để bảo vệ tuyến chở quân; bộ binh vẫn cần để chiếm thành.

## Thành và công trình

Cơ chế một specialty duy nhất mỗi thành hiện tại không đủ cho cây này. Thiết kế mới tách công trình kinh tế, cơ sở quân sự và phòng thủ: thành có thể có chợ/kho, lò rèn/chuồng ngựa/xưởng công thành, cảng nếu giáp nước và tường/tháp theo điều kiện. Mỗi nhóm có giới hạn ô hoặc cấp để thành phải chuyên môn hóa; không mở mọi công trình vô hạn trong một làng nhỏ. Cần chốt số ô cùng giá/duy trì, không áp luôn giới hạn cứng tùy ý trong bước thiết kế cây.

Các ruộng, đồng cỏ, rừng khai thác và mỏ dùng ô địa hình trong vùng sở hữu; công trình trong thành dùng ô công trình. Người chơi cần thấy dự báo thu nhập, điều kiện địa hình và chi phí duy trì trước khi xây. Giảm thao tác lặp bằng tự thu tài nguyên mỗi lượt, không điều khiển từng nông dân.

## Nghiên cứu và giao diện

Giữ một nghiên cứu chính đang chạy mỗi phe trước mắt. Có thể đặt hàng đợi, nhưng công nghệ sau chỉ trừ tiền khi thực sự bắt đầu và phải kiểm tra lại điều kiện. Chưa thêm nhiều hàng nghiên cứu song song khi kinh tế chưa được cân bằng.

Khi thay hệ thống hiện tại, bỏ `choiceGroup` và mọi kiểm tra khóa loại trừ trong mô phỏng, giao diện, AI và bộ đọc ván lưu. Ván lưu phải chấp nhận toàn bộ công nghệ đã hoàn thành cùng tồn tại. Cần kiểm tra tự động rằng có thể nghiên cứu hết 45 nút theo thứ tự điều kiện mà không công nghệ nào trở nên vĩnh viễn không thể mở.

Giá/thời gian phải tăng theo bậc, chi phí thường gồm vàng và tài nguyên phù hợp (gỗ cho cơ cấu, đá cho phòng thủ, lương cho huấn luyện). Chưa chốt bảng giá hoặc HP/công/giáp trước khi duyệt vai trò và các đường mở quân.

Màn nghiên cứu mở theo yêu cầu, dùng cây lớn kéo/thu phóng thay cho ba cột danh sách. Có bảy nhánh, đường nối rõ, bộ lọc quân/công trình/kinh tế, tìm kiếm và nút về vị trí hiện tại. Click nút hiện điều kiện còn thiếu, chi phí, lượt và tác dụng cụ thể. Có thể chọn một đơn vị làm mục tiêu để làm sáng đường mở khóa. Không cần bật popup liên tiếp để đọc từng nút.

Nút chưa làm xong không xuất hiện như công nghệ đang có thể mua. Nếu phát hành theo giai đoạn, ghi rõ phạm vi bản đó; tài liệu toàn cây vẫn giữ đầy đủ đích đến.

## Thứ tự triển khai sau khi duyệt

1. Chốt roster/khắc chế và tách tường thành khỏi nâng kinh tế. Chốt các hành động mới, quy tắc chiếm thành và chở quân.
2. Làm tầng nền và quân bộ: chùy, trinh sát, khiên, giáo, kiếm, cung, kiểm lâm, nỏ; công trình và tác dụng nghiên cứu tương ứng.
3. Làm kỵ binh, thương dài, bộ binh nặng và cơ chế xung phong/chặn xung phong.
4. Làm ballista, catapult, trebuchet, tháp/công binh, đường và hậu cần.
5. Làm cảng, bản đồ biển/đảo, bốn tàu và vận tải/đổ bộ. Đặt nhánh hàng hải vào UI mua được cùng lúc các hành động này thực sự hoạt động.
6. Hoàn thiện Paladin, xạ kích, các nâng cấp kinh tế cuối; cân bằng toàn ván và AI cho mọi nhánh.

Đây là thứ tự sản xuất, không phải đề nghị rút cây còn tám hay chín nút. Không gọi bản đầy đủ cho tới khi mọi nút và đơn vị trong phạm vi đã duyệt có hành vi thật và AI biết dùng.

## Ghi nhận playtest riêng

Người dùng chơi Vừa/1 AI và lâu chưa gặp địch; đây là ghi nhận, chưa yêu cầu sửa ngay. Cần đo lượt chạm trán đầu trên nhiều mã, số làng đã chiếm trước chạm trán và khả năng AI khám phá. Xem lại khoảng cách xuất phát, tốc độ đi và C1 Trinh sát; không mở vị trí địch xuyên sương mù để giải quyết.
