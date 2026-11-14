> Lưu ý hiện hành: kế hoạch và điểm dừng ở [06](06-roadmap.md), bản chạy ở [08](08-prototype.md). Phần schema/chuyển ván bên dưới là lịch sử; hiện dùng schema 7 và không chuyển ván cũ.

> Cập nhật 0.6.0: schema lưu hiện tại là `nation-tech-v6`, chuyển tiếp v3–v5; tầm nhìn dùng theo từng loại trong 23 đơn vị, quân trên tàu không mở tầm nhìn riêng. Xem [15 — Bản triển khai](15-implemented-technology-and-animation.md). Nội dung dưới giữ mô tả mốc ra mắt tính năng.

# Bản đồ ngẫu nhiên và thiết lập ván — 0.5.0

Ngày 14/11/2026. Tiếp nối sương mù, kinh tế và nghiên cứu; chạy cục bộ tại cổng 3010.

## Bắt đầu hoặc tiếp tục

Chưa có ván lưu: mở màn thiết lập trước khi bắt đầu. Có ván lưu hợp lệ: tiếp tục ngay. Menu → Ván mới mở thiết lập và tạm dừng AI; đóng bảng sẽ trở về ván hiện tại. Chỉ khi bấm Bắt đầu ván mới thay thế ván và tạo bản dự phòng. Màn thiết lập giữ độ khó/số AI của ván trước và đề xuất mã bản đồ mới.

- Độ khó: Dễ, Vừa, Khó; mặc định Vừa.
- Số đối thủ: 1–3 AI; mặc định 1. Các AI đối địch lẫn nhau.
- Mã bản đồ: tối đa 32 ký tự; nút đổi mã đề xuất mã mới. Cùng mã + cùng số AI tạo cùng địa hình và vị trí thành/quân trong bản generator hiện tại. Độ khó không đổi địa hình hoặc tài nguyên xuất phát.
- Người chơi xanh lam; ba đối thủ lần lượt đỏ, xanh lục và vàng. Mô hình, nhãn quân, thành và biên giới dùng màu tương ứng.

## Sinh bản đồ

Lưới vuông 33 × 25 ô giữ tương thích renderer và kích thước trận hiện tại. Hình dáng bờ biển, rừng/đồi/núi, hướng bố trí các phe, điểm xuất phát và làng trung lập phụ thuộc mã. Đây là bản đồ đất liền có biển bao quanh; chưa có quần đảo buộc dùng tàu.

Mỗi phe bắt đầu với một thành cấp 1, công sự 20, một lính chùy và cùng 20 vàng/16 lương/5 gỗ/12 đá. Mỗi thủ phủ có làng đầu tiên cách 4 ô; quân bắt đầu cách thành 1 ô theo hướng làng đó. Đường tới làng đầu tiên được làm thông thoáng để có thể chiếm trong hai lượt của phe đó, chưa cần nghiên cứu.

Tổng số thành/làng: 9 khi có 1 AI, 12 khi có 2 AI, 15 khi có 3 AI. Các thành/làng cách nhau ít nhất 4 ô. Một cây đường nối mọi thành bằng đất đi được; mở vùng quanh làng để không bị khóa bởi núi, biển hoặc địa hình tốn 2 bước. Biển/rừng/đồi vẫn tạo hướng tiến quân khác nhau ngoài những đường nối. Khoảng cách đầu tiên công bằng chưa có nghĩa là toàn bộ bản đồ đã được cân bằng qua playtest.

Mã bản đồ chỉ tái tạo bố cục ban đầu. Bản lưu vẫn chứa toàn bộ địa hình thật để ván đang chơi không phụ thuộc việc generator thay đổi sau này. Bắt đầu ván mới dựng lại cảnh 3D và đặt camera về quân mình.

## Độ khó hiện tại

| Mức | Nghiên cứu | Quy mô đội quân AI | Chọn mục tiêu |
| --- | --- | --- | --- |
| Dễ | Chỉ bắt đầu nghiên cứu ở lượt chẵn | 2 quân/làng ổn định, tối đa 6 | Luật khám phá và tấn công cơ bản |
| Vừa | Bắt đầu ngay khi đủ điều kiện | 3 quân/làng, tối đa 10 | Cân bằng mở rộng, kinh tế, bộ binh/cung/công thành |
| Khó | Như Vừa | 4 quân/làng, tối đa 16 | Thêm ưu tiên kết liễu, giảm ưu tiên đòn tự sát; ưu tiên mục tiêu đe dọa thành mình |

Cả ba vẫn phải đủ tài nguyên, đủ lương, nghiên cứu đúng điều kiện và chờ quân mới tới lượt sau. Không thưởng vàng, tầm nhìn, sát thương hoặc bước đi theo độ khó. Đây là khác biệt chính sách AI; độ khó thực tế cần tiếp tục đo qua chơi thử.

## Lượt và kết thúc

Thứ tự: người chơi → đỏ → lục (nếu có) → vàng (nếu có) → người chơi. Vòng lượt tăng một lần khi quay về phe đầu tiên còn sống. Mỗi phe chỉ nhận thu nhập, tiến độ nghiên cứu/công trình và làm mới quân ở đầu lượt của mình; không nhận thêm vì có nhiều AI.

Phe mất thành cuối cùng bị loại và quân còn lại bị xóa; thứ tự lượt bỏ qua phe đó. Hạ một AI trong trận ba AI chưa thắng. Người chơi thắng khi tất cả AI bị loại; mất thành cuối cùng của người chơi kết thúc ván với thất bại. Các AI có thể chiếm thành và loại nhau. Sương mù, tài nguyên, nghiên cứu và ký ức về làng độc lập cho cả bốn phe.

## Lưu ván

Schema 5, khóa `nation-world-v5`, bản dự phòng `nation-world-v5-backup`. Lưu cả mã, độ khó, số AI, thứ tự phe, bản đồ thật và tiến trình. Kiểm tra thiết lập/phe/địa hình/tầm nhìn khi tải lại.

Nếu chưa có khóa mới, tự đọc `nation-fog-v4` hoặc `nation-progress-v3`. Ván cũ giữ bản đồ cố định và hai phe, cấu hình Vừa/1 AI; không sinh lại bản đồ, đổi vị trí quân hoặc xóa nghiên cứu. Ván v4 giữ cả vùng đã khám phá; v3 khởi tạo vùng khám phá theo vị trí hiện tại. Các khóa gốc được giữ.

## Kiểm tra

`tests/setup.test.ts` kiểm tra tái tạo mã, sự khác biệt giữa mã, 90 bản đồ (30 mã × 3 số AI), thành/đường nối/khoảng cách, chiếm làng trong hai lượt, thu nhập và nghiên cứu qua vòng bốn phe, loại phe và bỏ lượt, AI đánh nhau, thua khi mất thành cuối, khác biệt chính sách độ khó, mô phỏng nhiều lượt với 1–3 AI, lưu ván và chuyển schema 4.

Kiểm tra trình duyệt: mở thiết lập từ ván cũ, chọn Khó/3 AI và mã cụ thể, bắt đầu ván, kết lượt qua các AI, tải lại và đọc cấu hình trong Menu. Chạy `npm test` và `npm run build` để xác nhận luật và TypeScript.
