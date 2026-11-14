# Bước 2 — AI phối hợp đội quân trên bộ

Ngày 14/11/2026. Triển khai tại repo `nation` gốc theo [kế hoạch 1.0](../roadmap.md), không stage/commit. **Bước 2 đã đạt các tiêu chí chiến thuật đã chốt**; không mở rộng sang AI hải quân hoặc cân bằng toàn game trong đợt này.

## Hành vi mới

- **Mục tiêu chung:** phòng thủ khi thành đang bị đe dọa; giao chiến ngoài đồng; công thành khi có lực lượng phù hợp; hoặc mở rộng làng. Mục tiêu dùng các thành đã biết làm mốc ổn định, không đổi chỉ vì một quân vừa đi gần hơn. Quân phòng thủ trong phạm vi thành địch không kéo mục tiêu công thành đổi qua lại giữa đánh quân và đánh thành.
- **Thứ tự hành động:** đánh giá lệnh trên toàn đội thay vì luôn xử lý quân đầu mảng. Ưu tiên chiếm thành, rút nguy hiểm/hỗ trợ và hỏa lực có lợi; cung/nỏ kết liễu mục tiêu bị thương trước khi chia đạn. Dùng `previewAttack` thật để tính sát thương, phản kích và khả năng chiếm. Không chọn đòn khiến quân chết vì phản kích khi chưa phải chiếm thành.
- **Giữ tuyến:** bộ binh tiến trước; cung/nỏ giữ khoảng cách và ưu tiên vị trí có bộ binh che; tránh tự vượt lên trước tuyến khi đã thấy địch. Giáo/thương được dùng chống kỵ binh; thương dựng thế chặn xung phong khi phù hợp.
- **Hộ tống:** một bộ binh gần máy nhận vai trò bảo vệ. Khi tiến về phía địch, máy chỉ chọn vị trí vẫn có bộ binh trong hai ô; quân hộ tống cũng bị hạn chế bỏ máy lại quá xa. Máy triển khai đúng công nghệ, bắn khi đứng yên, bộ binh tiến vào chiếm sau khi phá tường.
- **Rút và chữa:** quân rất yếu tìm vị trí ít rủi ro hơn, tiến về thành/Paladin, không tiếp tục lao lên chỉ vì đã thoát tầm đánh trực tiếp. Paladin/công binh dùng lệnh hỗ trợ và trả chi phí thật. Quân nghỉ ở thành được để hành động chưa dùng và kết lượt, để engine hồi phục đúng luật; gửi Wait sẽ đánh dấu đã hoạt động và ngăn hồi máu.
- **Phát triển theo đội hình:** bổ sung tuyến trước, chống kỵ, quân bắn xa, công thành và hỗ trợ theo những gì đang thiếu/đang thấy. Chuẩn bị cơ sở cần thiết tại đúng thành trước khi lấp chỗ bằng lính rẻ. Nghiên cứu điều kiện cho vai trò còn thiếu, giữ tiền tuyển/phòng thủ, quan tâm sản lượng và lương duy trì. Khi thành bị đánh, quân phòng thủ được ưu tiên trước nghiên cứu/trinh sát.

Giữ độ khó qua chính sách phát triển, mức quân và ưu tiên mục tiêu hiện có; không thưởng tài nguyên, sát thương, tầm nhìn hay bước đi. Không thêm loại quân, công nghệ hoặc thay giá/chỉ số.

## Ranh giới kỹ thuật

- `src/ai/tactics.ts`: mục tiêu chung, đánh giá vị trí/rủi ro, hỏa lực, hỗ trợ, hộ tống và nghỉ hồi phục.
- `src/ai/development.ts`: nhu cầu đội hình, chuẩn bị công trình, ngân sách và nghiên cứu điều kiện.
- `src/ai/ai.ts`: điều phối lớp chiến thuật/phát triển; khám phá bước 1 và điều khiển tàu/công việc cơ bản tiếp tục nằm ở nhánh fallback.
- `State`, `Command`, `ActionEvent`, fog và engine không đổi. Không thêm bộ nhớ AI vào save hoặc cơ chế chuyển ván cũ. `nextAICommand(raw)` vẫn lọc `observe` trước mọi quyết định.
- File UI/render/cài đặt của Claude không được sửa. Trang kiểm thử mới trong `tests/` không được nhập vào entry production và không đọc/ghi localStorage.

Một sửa lỗi đi kèm: cải tạo ô biên chỉ được lên kế hoạch nếu mọi vị trí có thể làm thay đổi chủ quyền ô đó đang được nhìn thấy. AI không dựa vào một thành đang bị che để biết quyền sở hữu và không gửi lệnh thử để dò thông tin ẩn.

## Sáu tình huống nghiệm thu

Các scenario dùng dữ liệu chiến đấu thật, đủ công nghệ/tài nguyên để kiểm tra hành vi, có một trinh sát hỗ trợ tầm nhìn. Đối thủ đứng yên để cô lập quyết định của AI; bài chống kỵ có thêm lệnh xung phong thật. Đây không phải sáu ván cân bằng hoặc chứng minh AI tối ưu.

| Tình huống | Kết quả kiểm tra |
| --- | --- |
| Cung sau bộ binh | Khiên từ (1,0) tới (3,-1); cung từ (-1,0) tới (1,-1), vẫn ở sau tuyến và cách hai ô |
| Tập trung hỏa lực | Lệnh đầu là cung kết liễu quân còn 4 HP; cung còn lại đánh mục tiêu tiếp theo trước khi bộ binh di chuyển |
| Máy có hộ tống | Mọi bước tiến của máy đều có bộ binh trong hai ô; phá công sự 20 → 0 và bộ binh chiếm thành ở lượt AI 10 |
| Bảo vệ thành | Bỏ hướng làng trống phía xa; giáo/cung quay về chặn kỵ sĩ đang áp sát thành mình |
| Chống kỵ binh | Thương dựng thế; kỵ sĩ chạy đủ hai ô rồi đánh nhưng mất thưởng xung phong, gây 5 sát thương thay vì 8 |
| Rút/chữa bị thương | Giáo 2 HP rút về (-2,-1), Paladin chữa lên 6 HP, tiêu đúng 3 lương |

Kiểm tra bổ sung: mục tiêu ổn định; replay xác định; quyết định không đổi khi dữ liệu ẩn thay đổi; cải tạo biên không dò thành ẩn; mua quân bắn xa trước nghiên cứu không cần thiết; xây lò rèn trước khi tuyển giáo; bảo vệ thành trước nghiên cứu; Paladin có cả chuồng ngựa và cơ sở thép; quay về nhà và nghỉ hồi máu tự nhiên.

## Kết quả chạy

- **104/104 kiểm thử đạt**, gồm toàn bộ bài luật/fog/công nghệ/quân/nhịp trận bước 1 và 13 bài chiến thuật mới.
- `npm run build` đạt. Cảnh báo bundle Vite trên 500 kB còn tồn tại, không thuộc phần AI này.
- Scenario nhiều phe trong bài nhịp trận từng phát hiện lệnh cải tạo biên không hợp lệ; đã sửa bằng thông tin quan sát bảo thủ và thêm regression test, không nới kiểm tra của engine.
- Fixture giới hạn quân trong `tests/setup.test.ts` được cấp công nghệ tuyển cung và khóa xây dựng trong lượt thử, để tách đúng hành vi giới hạn quân khỏi lựa chọn nghiên cứu/xây cơ sở mới. Các kiểm tra giá, luật, fog và khả năng tuyển không bị bỏ.

Số đo Node trên Apple M1 Pro, Node v26.7.0; seed `army-campaign`, người chơi chỉ kết lượt:

| AI | Độ khó | Vòng đã chạy | Kết quả | Số lệnh AI | Tổng thời gian tính lệnh | Lệnh lâu nhất |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Vừa | 29 | AI thắng, ván kết thúc trước mốc 30 | 313 | 594,76 ms | 10,15 ms |
| 2 | Dễ | 30 | Chưa kết thúc | 515 | 826,96 ms | 8,38 ms |
| 3 | Khó | 30 | Chưa kết thúc | 878 | 1.346,44 ms | 8,17 ms |

Tất cả lệnh hợp lệ, lượt kết thúc trong giới hạn 180 lệnh, tài nguyên không âm, không chồng quân và state lưu/đọc hợp lệ. Đây là ba cấu hình đại diện, không phải toàn bộ ma trận seed/độ khó hay tỷ lệ thắng trước người chơi. Số đo tính lệnh không bao gồm delay UI/hoạt ảnh và không được dùng để tuyên bố đạt thời gian cả vòng AI của phần Claude.

Dữ liệu kiểm tra ở [measurements/step2-tactics-summary.json](../measurements/step2-tactics-summary.json). Trace lệnh đầy đủ được tạo tại `artifacts/step2-tactics.json`.

## Chạy lại và quan sát

```bash
npm test
node --import tsx scripts/measure-tactics.ts
npm run build
npm run dev
```

Mở `http://127.0.0.1:3010/tests/tactics.html` để đổi sáu scenario, chạy từng lệnh hoặc hết lượt. Trong trang riêng này, AI được tô xanh để nhìn đầy đủ đội hình qua renderer mặc định; mô phỏng gốc vẫn dùng phe enemy và không sửa ván chơi. Trang production vẫn dùng quân bạn màu xanh như cũ. Đã kiểm tra cả sáu scenario trên browser; ảnh tại [artifacts/step2-tactics.png](../../artifacts/step2-tactics.png).

AI mới dùng được trên ván hiện tại sau tải lại; muốn thử một ván từ đầu thì tạo ván mới. Phần Claude, hải quân và cân bằng đã được triển khai sau mốc báo cáo này; xem [roadmap](../roadmap.md). Heuristic hiện tại không tối ưu toàn cục hoặc điều khiển nhiều đạo quân độc lập; không mở rộng thêm trong bước 2 sau khi các tiêu chí trên đã đạt.
