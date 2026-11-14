# Hướng dẫn chơi và luật hiện hành

Game chiến thuật 3D theo lượt, chạy cổng 3010. Bản này có cây 45 công nghệ không khóa loại trừ, 23 loại quân, công trình/cải tạo lãnh thổ và hoạt ảnh hành động nhẹ. Bản đồ, sương mù, thiết lập Dễ/Vừa/Khó và 1–3 AI tiếp tục được giữ.

Nhịp khai cuộc: [bước 1 — Nhịp khai cuộc và AI khám phá](reports/step1-pace.md). Map mới có làng/hành lang trung tâm; muốn dùng bố trí mới hãy bắt đầu ván mới. AI dùng đường hợp lệ với số bước của từng quân và trinh sát ưu tiên khám phá thay vì phá tường. UI tốc độ nhanh và chất lượng thấp đã ghép; xem [báo cáo UI/hiệu năng](reports/step5-ui-performance.md).

## Vào chơi

Chưa có ván lưu: chọn độ khó, số AI, kiểu Đất liền/Hai bờ biển và mã bản đồ. Có ván lưu: tiếp tục ngay. Menu → Ván mới để đổi cấu hình; chỉ thay ván khi bấm Bắt đầu. Bản 0.7.0 bắt đầu ván mới, không chuyển schema cũ. Điều kiện và giao diện hiện hành xem [công nghệ](technology.md).

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

Mỗi thành xây hoặc cải tạo một lần/lượt. Nâng cấp kinh tế tăng thu nhập và chỗ xây, không tự thêm công sự. Tường riêng tăng giới hạn công sự từ 20 lên 40 và bổ sung 20 khi xây; tháp cần tường, bắn một quân đối địch đang nhìn thấy trong tầm 3 ở đầu lượt, duy trì thêm 1 vàng.

Cải tạo ô: ruộng 3 lương, thâm canh 5, tưới 5 + số ruộng kề (tối đa +3), đồng cỏ 3; khai thác rừng 3 gỗ (+1 khi có Quản lý rừng), mỏ đồi 3 đá, mỏ đá 5. Ô chỉ đóng góp cho thành gần nhất trong bán kính 2, tránh đếm đôi vùng chồng lấn. Trồng rừng thay đổi địa hình thật. Thành làm việc trong vùng sở hữu; công binh có thể làm việc ở ô kề đang thấy, không có địch sát công trường.

Đường tiêu 0.5 bước/ô. Chợ được thêm 2 vàng cho mỗi thành nối bằng đường cùng phe, thưởng tối đa +4. Cầu chỉ bắc qua một ô nước với hai bờ đất đối diện, cần công binh, tài nguyên và hành động; tàu không đi xuyên cầu.

Thành có thể nâng tới cấp 3. Xây thành mới tốn 45 vàng/20 lương/30 gỗ/15 đá, cần vị trí đã khảo sát hợp lệ và hoàn tất vào lượt sau. Sửa thành tốn 5 vàng/5 đá, hồi **2 công sự**, giới hạn theo lượt và công sự tối đa. Giá hiện hành lấy từ [balance.ts](../src/data/balance.ts), [buildings.ts](../src/data/buildings.ts) và [engine.ts](../src/game/engine.ts).

Ba hướng mở đầu đã mô phỏng: mở rộng/trinh sát, kinh tế rồi quân, quân sớm. Các kết quả và ván kéo dài nằm trong [báo cáo cân bằng](reports/step4-balance.md); mục tiêu thời lượng 25–40 phút chưa được nghiệm thu bằng người chơi thật.

## Chiến đấu

Di chuyển và đánh là lệnh riêng; quân còn quyền hành động có thể đi rồi đánh theo luật từng loại. Preview và thực thi dùng cùng phép tính. Quân sống sót có thể phản kích trong điều kiện hợp lệ; sát thương bản hiện tại xác định, không có gieo xúc xắc hoặc giảm sức đánh theo tỷ lệ HP. Cận chiến có khả năng chiếm mới chiếm được thành hết công sự và không còn quân giữ. Máy, công binh và tàu không tự chiếm.

Kỹ năng, xung phong, xuyên giáp, giữ trận, triển khai, chữa/sửa và nâng quân ở [units.md](units.md). Không thêm luật v2 vào bản hiện tại chỉ vì xuất hiện trong đề xuất.

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

Trên Hai bờ biển, thủ phủ ven nước xây được cảng. Học Chế biến gỗ → Hàng hải → Tàu vận tải, xây cảng, tuyển tàu và quân chiếm đất. Lên tàu từ ô kề, đi tới bờ đối diện, đổ bộ vào ô trống hợp lệ rồi chiếm thành từ lượt sau. Thành trung lập/địch không phải bãi đổ bộ. AI có trinh sát, vận tải, hộ tống, chọn bãi và quay về đón quân; bằng chứng ở [báo cáo hải quân](reports/step3-navy.md).

## Giao diện và hiệu năng

Menu có **Lượt AI: Bình thường/Nhanh** và **Đồ họa: Đầy đủ/Thấp**, đổi tại chỗ và giữ thiết lập sau reload. Nhanh chỉ rút trình bày AI, không bỏ lệnh hoặc thay luật. Thấp giảm DPR, bóng và trang trí; giữ quân/công trình/fog. Giảm chuyển động ưu tiên theo hệ điều hành.

Bảng thành/hành động ghi điều kiện thiếu. Lên/xuống tàu hoặc hỗ trợ tô đích hợp lệ màu vàng. Menu đóng bảng quản lý để tránh che thao tác trên màn hẹp. Hoạt ảnh đi/đánh/bắn/trúng/chết/chữa/sửa dựa trên event hành động; quân đứng yên không có vòng idle liên tục.

## Lưu và tiếp tục

Schema 7: `nation-tech-v7`, backup `nation-tech-v7-backup`; tùy chọn UI lưu riêng ở `nation-ui-preferences-v1`. Không chuyển schema cũ trong giai đoạn phát triển. Save được kiểm tra trước khi render; dữ liệu lỗi được giữ dự phòng, tự lưu bị tắt nếu không thể bảo vệ bản cũ. Ván mới chỉ thay ván khi bấm Bắt đầu. Lưu/đọc cùng phiên bản vẫn phải đúng lượt, quân, tài nguyên, nghiên cứu và fog.

## Trạng thái và giới hạn

Phần tính năng trong phạm vi 1.0 đã có; [roadmap.md](roadmap.md) là nguồn tiến độ/nghiệm thu. Chưa có âm thanh, multiplayer, chiến dịch cốt truyện hoặc deploy công khai. Không tuyên bố clone đầy đủ luật Tribal Forts. Playtest thời lượng, người dùng 10 phút và thiết bị yếu hơn còn chờ; [báo cáo hiệu năng](reports/step5-ui-performance.md) ghi các số đo máy hiện tại.
