# Cách chơi và luật hiện hành

Cập nhật 14/11/2026. Game chiến thuật 3D theo lượt: 45 công nghệ không khóa loại trừ, 23 loại quân, công trình/cải tạo lãnh thổ, sương mù, Dễ/Vừa/Khó và 1–3 AI. Số liệu thực thi nằm trong `src/data` và `src/game/engine.ts`; tài liệu này giải thích luật.

## Vào chơi

Chưa có ván lưu: chọn độ khó, số AI, kiểu Đất liền/Hai bờ biển và mã bản đồ. Có ván lưu: tiếp tục ngay. Menu → Ván mới để đổi cấu hình; chỉ thay ván khi bấm Bắt đầu. Save schema cũ không được chuyển; đổi schema thì bắt đầu ván mới. Điều kiện và giao diện hiện hành xem [công nghệ](technology.md).

Quân xanh lam/phù hiệu BẠN là quân mình; đối thủ đỏ/lục/vàng. Khởi đầu một thành và một lính chùy, 20 vàng/16 lương/5 gỗ/12 đá. Bản đồ ngẫu nhiên 33 × 25 ô, 9/12/15 thành/làng. Phe mất hết thành bị loại; người chơi thắng khi loại hết AI.

## Vòng chơi

1. Chọn quân và ô xanh để đi, tiến gần vùng đen để mở bản đồ. Làng trống chiếm bằng bộ/kỵ binh đứng kề.
2. Mở sách để xem cây công nghệ; tìm theo tên công nghệ, quân hoặc công trình, chọn một nút để xem lộ trình cần học. Trinh sát là nghiên cứu gốc rẻ/nhanh để tìm làng và địch.
3. Nghiên cứu chỉ mở quyền sử dụng. Chọn thành → Quân đội để tuyển; quân chuyên môn còn cần cơ sở như lò rèn, chuồng ngựa, xưởng hoặc cảng.
4. Thành → Công trình để xây và nâng; Lãnh thổ để chọn cải tạo rồi chọn ô vàng hợp lệ. Thu tài nguyên tự động, mỗi thành một công trình/cải tạo mỗi lượt.
5. Chọn quân chuyên môn để thấy hành động: giữ trận, dựng thương, ngắm bắn, triển khai/thu máy, chữa, sửa, lên/xuống tàu hoặc nâng loại.
6. Chọn mục tiêu viền đỏ để đánh. Quân vung/bắn, có đạn/điểm chạm và số sát thương; chờ đoạn hoạt ảnh ngắn trước lệnh tiếp.
7. Kết lượt qua các AI. Quân mới, nghiên cứu và hành động làm mới vào lượt của chính phe đó.

Rừng/đồi tốn hai bước; kiểm lâm đi rừng một bước; đường/cầu 0.5 bước. Núi không đi được. Quân bộ không đi biển nếu không lên tàu. Đơn vị có giá và duy trì riêng, hiển thị trong bảng tuyển. Thiếu vàng/lương đầu lượt sẽ chặn tuyển và hồi phục tự động.

## Điều khiển

Click mô hình/phù hiệu để chọn, click ô xanh để đi, click mục tiêu đỏ để đánh/chiếm. Kéo nền để pan, cuộn hoặc +/− để zoom, Q/E xoay; nút tâm ngắm về quân mình. Cây công nghệ chia làn theo nhánh; chọn một công nghệ làm sáng toàn bộ chuỗi điều kiện và liệt kê lộ trình theo thứ tự (xem [công nghệ](technology.md#giao-diện-cây-công-nghệ)). Escape hủy hành động đang chọn hoặc đóng bảng. Giao diện quản lý chỉ mở khi được chọn.

## Thiết lập và bản đồ

- Dễ/Vừa/Khó, 1–3 AI đối địch lẫn nhau; người chơi lam, đối thủ đỏ/lục/vàng. Mọi phe khởi đầu cùng tài nguyên và luật.
- Hai kiểu bản đồ 33 × 25 ô: **Đất liền** có hành lang nối các thành; **Hai bờ biển** có eo biển rộng ba ô, không có đường bộ đi vòng. Muốn sang bờ bên kia phải dùng tàu.
- Có 9/12/15 thành và làng theo số AI. Làng đầu cách thủ phủ bốn ô và có đường để quân khởi đầu chiếm trong hai lượt. Đây là khả năng của đường đi, không bảo đảm mọi lựa chọn của người chơi đều đạt hai lượt.
- Cùng mã + kiểu bản đồ + số AI tái tạo bố cục trong cùng generator; độ khó không đổi tài nguyên xuất phát hoặc cấp tầm nhìn miễn phí. Save chứa địa hình thật, không dựng lại từ mã khi tải.
- AI Dễ/Vừa/Khó có mục tiêu quy mô 6/8/12 quân cùng chính sách phát triển/chiến thuật khác nhau. Đây là mục tiêu tuyển AI, không phải trần quân của người chơi. Độ khó thực tế còn cần chơi thử.

## Lượt và thắng/thua

Thứ tự lam → đỏ → lục → vàng, bỏ qua phe đã bị loại. Mỗi phe nhận thu nhập, tiến nghiên cứu/công trình và làm mới quân ở đầu lượt chính mình. Quân mới phải đợi lượt sau. Mất thành cuối thì phe đó bị loại, quân còn lại bị xóa. Người chơi thắng khi tất cả AI bị loại; mất thành cuối là thua. Không thắng bằng điểm, số lượt hoặc nghiên cứu hết cây.

## Kinh tế, xây dựng và lãnh thổ

Thành hỗ trợ nhiều công trình. Có 14 công trình thuộc nhóm kinh tế, quân sự và phòng thủ. Mỗi thành có 2 + cấp thành chỗ kinh tế và 2 + cấp thành chỗ quân sự. Tường/tháp dùng nhóm phòng thủ riêng. Lò rèn → lò sắt → xưởng thép dùng chung một chỗ; cảng → xưởng đóng tàu dùng chung một chỗ. Cơ sở nâng cao đáp ứng điều kiện của cơ sở trước.

Mỗi thành xây hoặc cải tạo một lần/lượt. Nâng cấp kinh tế tăng thu nhập và chỗ xây, không tự thêm công sự. Giới hạn công sự cấp 1/2/3 là 20/25/30; tường cộng thêm 20 và bổ sung 20 khi xây. Thành cấp 2–3 còn công sự bắn công 3, tầm 2 ở đầu lượt; tháp thay phát bắn thành bằng công 5/tầm 3, chỉ một phát mỗi thành mỗi lượt, duy trì thêm 1 vàng. Tường phản kích tối thiểu 2 HP khi bị cận chiến đánh, lấy mức cao hơn với phản kích đồn trú, không cộng hai lần; máy được miễn phản kích tường.

Cải tạo ô: ruộng 3 lương, thâm canh 5, tưới 5 + số ruộng kề (tối đa +3), đồng cỏ 3; khai thác rừng 3 gỗ (+1 khi có Quản lý rừng), mỏ đồi 3 đá, mỏ đá 5. Ô chỉ đóng góp cho thành gần nhất trong bán kính 2, tránh đếm đôi vùng chồng lấn. Trồng rừng thay đổi địa hình thật. Thành làm việc trong vùng sở hữu; công binh có thể làm việc ở ô kề đang thấy, không có địch sát công trường.

Đường tiêu 0.5 bước/ô. Chợ được thêm 2 vàng cho mỗi thành nối bằng đường cùng phe, thưởng tối đa +4. Cầu chỉ bắc qua một ô nước với hai bờ đất đối diện, cần công binh, tài nguyên và hành động; tàu không đi xuyên cầu.

Thành có thể nâng tới cấp 3. Xây thành mới tốn 45 vàng/20 lương/30 gỗ/15 đá, cần vị trí đã khảo sát hợp lệ và hoàn tất vào lượt sau. Sửa thành tốn 5 vàng/5 đá, hồi **2 công sự**, giới hạn theo lượt và công sự tối đa. Giá hiện hành lấy từ [balance.ts](../src/data/balance.ts), [buildings.ts](../src/data/buildings.ts) và [engine.ts](../src/game/engine.ts).

Thời lượng ván chưa được nghiệm thu bằng người chơi thật; vấn đề ván kéo dài và cách đo ghi trong [lộ trình](roadmap.md#vấn-đề-đã-biết).

## Chiến đấu

Chọn mục tiêu trong khả năng đi–đánh để tự đi tới vị trí hợp lệ rồi đánh/chiếm; chuỗi dừng nếu lộ địch mới hoặc dự báo xấu đi. Engine vẫn thực thi từng bước và đòn đánh riêng. Máy không vừa đi vừa bắn. Preview và thực thi dùng cùng phép tính. Quân sống sót có thể phản kích trong điều kiện hợp lệ; sát thương xác định: lấy sát thương sau giáp/địa hình/tư thế rồi nhân `0.6 + 0.4 × HP/HP tối đa`, làm tròn, tối thiểu 1. Phản kích dùng HP sau khi trúng đòn. Phá công sự dùng cùng hệ số; không gieo xúc xắc. Cận chiến có khả năng chiếm mới chiếm được thành hết công sự và không còn quân giữ. Máy, công binh và tàu không tự chiếm.

Kỹ năng, xung phong, xuyên giáp, giữ trận, triển khai, chữa/sửa và nâng quân ở [units.md](units.md). Giữ các lợi thế có điều kiện (đồi, giáo chống kỵ, kiếm chống bộ, xung phong bị dựng thương chặn); không cộng thêm một tầng chí mạng ngẫu nhiên.

Vùng khống chế gồm tám ô kề quân cận chiến có vũ khí, đang thấy, cùng môi trường bộ/biển. Đi vào vùng này dùng hết bước còn lại nhưng giữ quyền đánh; được rời vùng từ ô xuất phát. Rừng bỏ khống chế của kỵ binh. Quân trên tàu và quân bắn xa không khống chế. Khi lộ quân kiểm soát mới giữa đường, lệnh đi dừng tại ô vừa vào.

**Nghỉ:** quân bị thương chưa đi/hành động, không kề địch, không trên tàu và không thiếu tiếp tế hồi 2 HP (3 tại thành mình), dùng hành động. Nghỉ không cộng thêm hồi thành thụ động vào lượt kế tiếp; Paladin vẫn là lệnh hỗ trợ riêng, mọi hồi máu bị chặn tại HP tối đa.

**Vây thành:** ít nhất hai quân địch bộ có vũ khí chiếm ít nhất nửa số ô đất tiếp cận quanh thành; cần ít nhất hai ô đất có thể tiếp cận. Sản lượng giảm 50%, áp dụng trước hệ số ổn định. Không tự vây bởi tập ô rỗng, núi/nước hoặc chỉ tàu. Không thêm tiêu hao HP hay phí chiếm thành.

## Sương mù và khám phá

| Vùng | Hiển thị và thông tin |
| --- | --- |
| Chưa khám phá | Đen; không lộ địa hình, thành, quân hoặc biên giới |
| Đã khám phá, ngoài tầm nhìn | Địa hình/thành theo lần thấy cuối, làm tối; không cập nhật bí mật hoặc giữ quân địch cũ |
| Đang nhìn thấy | Thông tin hiện tại; có thể chọn mục tiêu và thực hiện lệnh hợp lệ |

Tầm nhìn thành thường 2 ô, tháp 3; quân dùng `sight` theo [danh mục](units.md). Tầm nhìn theo tám hướng, rừng/núi không che tầm nhìn; đường bắn có luật riêng. Di chuyển nhiều ô ghi nhận cả vùng từng đi qua. Không đánh/preview mục tiêu khuất tầm nhìn, không dùng xây thành để dò làng ẩn. AI nhận observation đã lọc, không được dùng quân/tài nguyên/nghiên cứu bí mật của đối thủ.

## Hải quân

Cảng chỉ xây tại thành kề nước; tàu tuyển trên ô nước trống kề thành. Thuyền trinh sát và vận tải đi ven bờ (cách đất tối đa 2 ô) trước khi có Buồm và đóng tàu. Sau đó tàu đi được xa bờ. Bốn tàu có mô hình, chuyển động, chiến đấu/khả năng chuyên biệt thật.

Tàu vận tải có 6 chỗ: bộ thường 1, quân nặng/kỵ 2, máy 3. Lên tàu dùng hành động của quân còn bước, cần tàu cùng phe kề bên. Quân trên tàu không chiếm ô riêng, không tự mở thêm tầm nhìn và không lộ danh sách cho đối thủ chỉ vì thấy tàu. Tàu đi thì hành khách đi theo. Đổ bộ cần ô bờ trống kề tàu, dùng hết lượt; chưa có Chiến thuật đổ bộ thì chịu -1 giáp cho tới đầu lượt sau. Tàu chìm thì quân trên tàu mất theo.

Trên Hai bờ biển, thủ phủ ven nước xây được cảng. Học Chế biến gỗ → Hàng hải → Tàu vận tải, xây cảng, tuyển tàu và quân chiếm đất. Lên tàu từ ô kề, đi tới bờ đối diện, đổ bộ vào ô trống hợp lệ rồi chiếm thành từ lượt sau. Thành trung lập/địch không phải bãi đổ bộ. AI có trinh sát, vận tải, hộ tống, chọn bãi và quay về đón quân.

## Giao diện và hiệu năng

Menu có **Lượt AI: Bình thường/Nhanh** và **Đồ họa: Đầy đủ/Vừa/Thấp**, đổi tại chỗ và giữ thiết lập sau reload. Nhanh chỉ rút trình bày AI, không bỏ lệnh hoặc thay luật. Thấp giảm DPR, bóng và trang trí; giữ quân/công trình/fog. Giảm chuyển động ưu tiên theo hệ điều hành.

Bảng thành/hành động ghi điều kiện thiếu. Lên/xuống tàu hoặc hỗ trợ tô đích hợp lệ màu vàng. Menu đóng bảng quản lý để tránh che thao tác trên màn hẹp. Hoạt ảnh đi/đánh/bắn/trúng/chết/chữa/sửa dựa trên event hành động; quân đứng yên không có vòng idle liên tục.

Quân có HP số, ký hiệu phe ●/▲/■/◆, dự báo hai phía và đường đi vàng. Cảm ứng chọn rồi xác nhận; chuột có thể bật cùng cách thao tác trong Menu. Hoàn tác chỉ bước đi gần nhất, không đổi knowledge/quân địch thấy được, không có lệnh khác chen vào; không lưu snapshot hay lệnh chờ qua reload. Vùng nguy hiểm chỉ ước lượng từ địch đang thấy, không bảo đảm ô khác an toàn. Tóm tắt giữ tối đa 12 sự kiện giao chiến/đổ bộ đã quan sát, focus theo vị trí sự kiện.

Zoom xa chuyển sang ký hiệu chiến lược. Thấp giữ hình dạng/vũ khí/công trình, tắt bóng và bớt trang trí; Vừa giữ trang trí nhưng không bóng, DPR 1; Đầy đủ bật bóng, DPR tối đa 1.5. Renderer chỉ dựng hình học từ observation/ký ức và gộp hình tĩnh bằng màu đỉnh.

## Lưu và tiếp tục

Schema 8: `nation-tech-v8`, backup `nation-tech-v8-backup`; tùy chọn UI lưu riêng ở `nation-ui-preferences-v1`. Không chuyển schema cũ trong giai đoạn phát triển. Save được kiểm tra trước khi render; dữ liệu lỗi được giữ dự phòng, tự lưu bị tắt nếu không thể bảo vệ bản cũ. Ván mới chỉ thay ván khi bấm Bắt đầu. Lưu/đọc cùng phiên bản vẫn phải đúng lượt, quân, tài nguyên, nghiên cứu và fog.

## Trạng thái và giới hạn

Chưa có âm thanh, multiplayer, chiến dịch cốt truyện hoặc phát hành công khai. Không tuyên bố sao chép đầy đủ luật Tribal Forts. Thời lượng ván, độ khó và điện thoại thật chưa được kiểm chứng bằng người chơi; việc tiếp theo ở [lộ trình](roadmap.md).
