# Cây công nghệ, đơn vị và hoạt ảnh — prototype 0.6.0

> Mốc lịch sử 0.6.0. Điều kiện công nghệ, giao diện và lưu ván đã được thay thế ở [16 — Rà soát 0.7.0](16-technology-audit-and-ui.md).
Ngày 14/11/2026. Triển khai theo tài liệu 13–14. Đây là thông số và phạm vi thực tế của bản chạy, thay thế cây chín nút và bốn loại quân trước đó.

## Cây và quân

- 45 nút, 7 nhánh; mã E/M/I/R/C/S/N và toàn bộ điều kiện AND theo tài liệu 13. Không có `choiceGroup`, khóa loại trừ hoặc giới hạn tổng công nghệ. Một ván có thể hoàn thành cả cây.
- 23 loại quân với định nghĩa HP/công/giáp/bước/tầm/tầm nhìn, xuyên giáp, sát thương công sự, giá, duy trì, sức chứa và khả năng chiếm thành trong `src/data/units.ts`.
- Mỗi phe có một nghiên cứu đang chạy, trả chi phí một lần khi bắt đầu. Nghiên cứu không tự nâng toàn bộ quân. Không có hàng đợi hoặc nhiều nghiên cứu song song trong bản này.
- Giá theo cấp I/II/III/IV: 5/12/24/40 vàng, thời gian 1/2/2/3 lượt. Nhánh công thành/hàng hải cấp III–IV thêm 8 gỗ; công thành cấp IV thêm 5 đá. Đây là cấu hình khởi đầu để cân bằng qua playtest.
- Chế biến gỗ cấp nền thêm 1 gỗ/làng/lượt, ngoài quyền xây xưởng/khai thác, để tránh cạn gỗ đầu ván khi chi phí duy trì bằng sản lượng nền. Các công nghệ kinh tế còn lại mở công trình/cải tạo thật, không tự thêm sản lượng cho công trình chưa xây.

Giao diện cây lớn có kéo, cuộn, thu/phóng, tìm kiếm, lọc nhánh, đường nối điều kiện và chọn một đơn vị làm mục tiêu để làm sáng đường mở. Bảng tuyển có lọc nhóm, giá/duy trì, vai trò và điều kiện công nghệ/cơ sở quân sự.

## Công trình và lãnh thổ

Bỏ giới hạn một specialty của thành. Có 14 công trình thuộc nhóm kinh tế, quân sự và phòng thủ. Mỗi thành có 2 + cấp thành chỗ kinh tế và 2 + cấp thành chỗ quân sự. Tường/tháp dùng nhóm phòng thủ riêng. Lò rèn → lò sắt → xưởng thép dùng chung một chỗ; cảng → xưởng đóng tàu dùng chung một chỗ. Cơ sở nâng cao đáp ứng điều kiện của cơ sở trước.

Mỗi thành xây hoặc cải tạo một lần/lượt. Nâng cấp kinh tế tăng thu nhập và chỗ xây, không tự thêm công sự. Tường riêng tăng giới hạn công sự từ 20 lên 40 và bổ sung 20 khi xây; tháp cần tường, bắn một quân đối địch đang nhìn thấy trong tầm 3 ở đầu lượt, duy trì thêm 1 vàng.

Cải tạo ô: ruộng 3 lương, thâm canh 5, tưới 5 + số ruộng kề (tối đa +3), đồng cỏ 3; khai thác rừng 3 gỗ (+1 khi có Quản lý rừng), mỏ đồi 3 đá, mỏ đá 5. Ô chỉ đóng góp cho thành gần nhất trong bán kính 2, tránh đếm đôi vùng chồng lấn. Trồng rừng thay đổi địa hình thật. Thành làm việc trong vùng sở hữu; công binh có thể làm việc ở ô kề đang thấy, không có địch sát công trường.

Đường tiêu 0.5 bước/ô. Chợ được thêm 2 vàng cho mỗi thành nối bằng đường cùng phe, thưởng tối đa +4. Cầu chỉ bắc qua một ô nước với hai bờ đất đối diện, cần công binh, tài nguyên và hành động; tàu không đi xuyên cầu.

## Chiến đấu và hành động

- Giáo +3 công chống kỵ; thương dài +5. Kiếm +2 công chống bộ binh.
- Khiên Giữ trận: bỏ lượt đánh/đi, thêm 3 chống sát thương bắn xa. Thương Dựng thương: chặn thưởng xung phong.
- Kỵ sĩ/thiết kỵ có thưởng +3/+4 khi đã chạy ít nhất hai ô đất trống trong lượt. Rừng/đồi ngắt chuỗi.
- Nỏ xuyên 2 giáp; Ngắm bắn thêm 2 xuyên giáp, yêu cầu chưa đi, bỏ toàn bộ bước còn lại, không tự kết thúc đòn đánh. Không thay đổi chỉ số mọi cung thủ.
- Kiểm lâm đi rừng tốn 1 bước. Kiểm lâm/cung kỵ đánh xong còn được đi bằng phần bước chưa dùng, không được đánh lần hai.
- Máy không bắn sau di chuyển. Catapult phá 6 công sự, trebuchet 10. Ballista tập trung chống quân và xuyên giáp; không thay catapult phá tường.
- Hậu cần vây hãm mở triển khai/thu máy, mỗi lệnh dùng lượt. Triển khai tăng tầm máy thường thêm 1; trebuchet cần triển khai mới bắn được ở tầm 4. Máy đã triển khai không đi được.
- Paladin dùng hành động và 3 lương để hồi tối đa 4 HP cho đồng minh bộ/kỵ kề bên; không chữa mình, máy hoặc tàu. Công binh dùng hành động, 3 gỗ và 3 đá để sửa tối đa 5 HP máy hoặc 5 công sự thành mình.
- Nâng quân là lệnh riêng gần thành có cơ sở phù hợp: trả chênh lệch giá, ít nhất 3 vàng, dùng lượt, giữ HP bị thương. Chỉ các đường nâng định nghĩa sẵn được chấp nhận.

Trạng thái giữ trận/dựng thương/ngắm bắn hết ở đầu lượt tiếp theo của chính phe đó. Chiếm thành vẫn cần quân cận chiến có khả năng chiếm, hết công sự và không còn quân giữ. Máy, công binh và tàu không tự chiếm thành.

## Hải quân

Cảng chỉ xây tại thành kề nước; tàu tuyển trên ô nước trống kề thành. Thuyền trinh sát và vận tải đi ven bờ (cách đất tối đa 2 ô) trước khi có Buồm và đóng tàu. Sau đó tàu đi được xa bờ. Bốn tàu có mô hình, chuyển động, chiến đấu/khả năng chuyên biệt thật.

Tàu vận tải có 6 chỗ: bộ thường 1, quân nặng/kỵ 2, máy 3. Lên tàu dùng hành động của quân còn bước, cần tàu cùng phe kề bên. Quân trên tàu không chiếm ô riêng, không tự mở thêm tầm nhìn và không lộ danh sách cho đối thủ chỉ vì thấy tàu. Tàu đi thì hành khách đi theo. Đổ bộ cần ô bờ trống kề tàu, dùng hết lượt; chưa có Chiến thuật đổ bộ thì chịu -1 giáp cho tới đầu lượt sau. Tàu chìm thì quân trên tàu mất theo.

Bản đồ ngẫu nhiên vẫn là đất liền có biển bao quanh như 0.5.0, chưa có bộ sinh quần đảo riêng. Hải quân hiện dùng ven bờ, vận tải qua nước và chiến đấu trên vùng biển đã có; không tuyên bố bản đồ đảo/phong tỏa đã được cân bằng.

## Hoạt ảnh và tải đồ họa

Mô hình tự dựng bằng khối low-poly, có đặc trưng vũ khí, giáp, ngựa, máy và tàu. Không tải bộ nhân vật nặng hoặc chạy skeletal animation cho mọi quân.

- Đi: chạy theo các ô đường đã đi; chân chuyển động, bánh xe quay, thân/ngựa/tàu nhấp nhẹ. Phù hiệu đi cùng mô hình.
- Cận chiến: quay về mục tiêu, nhích tới, vung vũ khí; mục tiêu giật lùi, phản kích có động tác đáp trả.
- Bắn: vũ khí chuyển động và đạn bay từ nguồn tới đích; đá bay theo cung. Vòng chạm và số sát thương/công sự xuất hiện tại điểm trúng.
- Chết: giữ mô hình trong đoạn hiệu ứng ngắn rồi thu/xóa; tránh biến mất ngay trước khi nhìn thấy đòn đánh. Đơn vị mất nguồn tầm nhìn cuối vẫn hiện hiệu ứng tổn thất của chính mình; không tiết lộ nguồn bắn đang ẩn.
- Chữa/sửa có thông báo nổi tại mục tiêu. Phản hồi dùng sự kiện hành động, không đoán đòn đánh từ thay đổi HP.

Mỗi hành động kéo dài khoảng 0.8 giây; giao diện chờ hoạt ảnh trước hành động/lệnh AI tiếp theo. Chế độ giảm chuyển động rút còn 0.16 giây, bỏ nhún/lunge và đạn bay. Quân đứng yên không có vòng idle riêng. Renderer chỉ vẽ khi camera/cảnh thay đổi hoặc có hoạt ảnh, tối đa khoảng 30 khung/giây; dừng khi tab ẩn hoặc mở thiết lập/cây nghiên cứu. Shadow map 1024, DPR tối đa 1.5, shadow chỉ cập nhật khi cần. Hiệu ứng ngắn hạn được giải phóng, tái sử dụng mô hình quân giữa các lệnh; đóng cảnh giải phóng cả WebGL context.

Đã kiểm tra hình ảnh 23 mô hình và các tình huống cận chiến, bắn nỏ, công thành, hải chiến trong browser. Chưa benchmark trên nhiều GPU/điện thoại; không bảo đảm FPS cố định cho đội quân cực lớn hoặc toàn bản đồ ở mức zoom xa.

## AI và lưu ván

AI dùng cùng điều kiện, giá, cơ sở tuyển, cải tạo và sương mù. Có trinh sát sớm, phát triển kinh tế/cơ sở, quân hỗn hợp, ngắm bắn, triển khai máy, hỗ trợ, giữ trận, tàu và vận tải ở mức cơ bản. Việc phối hợp nhiều đội quân, hộ tống và chọn bãi đổ bộ còn là heuristic; cần playtest chiến dịch dài, không coi là AI chiến thuật hoàn chỉnh.

Schema 6, khóa `nation-tech-v6`, backup `nation-tech-v6-backup`. Ván v3–v5 được chuyển tiếp, giữ bản đồ/quân/tài nguyên/lượt/sương mù có sẵn. Đóng chuỗi điều kiện cho công nghệ cũ khi điều kiện mới thay đổi; Khai hoang cũ chuyển sang Kho lương, công nghệ mở giáo/máy cũ giữ quyền mở quân tương ứng. Quân đã tồn tại được giữ; thêm cơ sở tuyển phù hợp tại thành cũ để tránh mất chức năng tuyển chỉ vì đổi schema. Không thu phí nghiên cứu lại. Các khóa cũ được giữ.

Kiểm tra dữ liệu trước khi render, gồm công nghệ, cơ sở, địa hình, tầm nhìn/bản nhớ, quân trên tàu/sức chứa và sự kiện hoạt ảnh. Các trạng thái mới lưu/tải được, không phát lại đòn cũ chỉ vì tải trang.

## Kiểm tra

**76/76 kiểm tra đạt** tại mốc này. `npm test` kiểm tra chiến đấu/kinh tế cũ đã điều chỉnh luật, toàn bộ 45 công nghệ trong một ván, 23 loại tuyển, điều kiện công trình/ô, chống kỵ/xuyên giáp/xung phong, tư thế, bắn rồi rút, hậu cần, chữa/sửa, ruộng/mỏ/rừng/đường/cầu/tháp, tàu/vận tải/chìm tàu, nâng quân, sương mù của đạn bắn từ nguồn ẩn, chuyển ván và AI. `npm run build` kiểm tra TypeScript và tạo dist.

`tests/visual.html` là fixture chỉ phục vụ kiểm tra qua dev server, không nhập vào production entry và không sửa localStorage của ván chơi. Nó có các nút chọn tình huống, di chuyển/đánh/lặp lại và hiển thị 23 mô hình.
