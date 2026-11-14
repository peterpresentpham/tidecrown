# Bước 1 — Nhịp khai cuộc và AI khám phá

Ngày 14/11/2026. Thực hiện trong repo gốc `nation`, nhánh `main`. Theo [kế hoạch 1.0](../roadmap.md). Báo cáo này giữ số đo tại mốc bước 1; UI tốc độ đã được tích hợp và đo ở [bước 5](step5-ui-performance.md).

## Kết quả và giới hạn nghiệm thu

**Đạt phần bố trí map, AI khám phá và bài đo nhịp khai cuộc.** Phần UI từng chờ ở mốc này đã tích hợp; App ba AI đạt khoảng 2,18 giây trong fixture bước 5. AI phối hợp có báo cáo bước 2 riêng; không gán số đo của mốc sau cho mốc này.

| Kịch bản cố định | Trước | Sau |
| --- | --- | --- |
| Vừa/1 AI, người chơi mở rộng vào trong, 30 seed: trung vị thấy quân địch | Lượt 6 | Lượt 6 |
| Cùng kịch bản: gặp quân địch không muộn hơn lượt 14 | 30/30 | 30/30 |
| Cùng kịch bản: chiếm làng đầu ở lượt 2 | 30/30 | 30/30 |
| Cùng kịch bản: giao chiến quân thật trước/hết lượt 20 | 30/30 | 30/30 |
| Vừa/1 AI, người chơi chỉ kết lượt, 30 seed: trung vị thấy quân địch | Lượt 13 | Lượt 11 |
| Cùng đối chứng đứng yên: thấy quân địch không muộn hơn lượt 14 | 19/30 | 25/30 |
| Cùng đối chứng đứng yên: chưa thấy quân địch sau lượt 20 | 1/30 | 1/30 |
| Cùng đối chứng đứng yên: giao chiến quân thật trước/hết lượt 20 | 26/30 | 19/30 |
| Vừa/2 AI, mở rộng vào trong, 10 seed: gặp địch trước/hết lượt 14 | Chưa đo | 10/10, trung vị lượt 4 |
| Vừa/3 AI, mở rộng vào trong, 10 seed: gặp địch trước/hết lượt 14 | Chưa đo | 10/10, trung vị lượt 5 |

Bản cũ vốn đã đạt mục tiêu khi người chơi chủ động tiến vào giữa. Không báo sai rằng trung vị của trường hợp đó đã được rút ngắn. Cải thiện đo được nằm ở thăm dò chủ động khi người chơi ít khám phá và thời gian tính quyết định. Cấu hình nhiều AI gần nhau hơn tạo va chạm sớm hơn; mục tiêu trung vị 6–10 trong kế hoạch chỉ áp dụng Vừa/1 AI.

Đối chứng đứng yên vẫn có seed `pace-28` chưa thấy địch trong 20 lượt. Trinh sát tránh đâm vào tường/đấu quân chính, nên thấy địch sớm hơn không đồng nghĩa luôn tấn công người chơi sớm hơn; số ván đứng yên có giao chiến thật trước lượt 20 còn giảm. Tiêu chí phối hợp/tập trung sức ép thuộc bước 2, chưa được tuyên bố đạt trong bước này. Không có bảo đảm mọi hành vi đứng yên hoặc mọi seed gặp địch trước lượt 14.

## Thay đổi code

- `src/game/map.ts`: dịch chung điểm xuất phát để giữ tương quan khai cuộc, mỗi phe có làng đầu cách bốn ô. Thêm làng trung tâm và hành lang đất đi được từ các làng đầu vào đó. Giữ 33×25 ô, 9/12/15 thành/làng và vùng ngoài để đi vòng; không hiện làng trung tâm xuyên fog. Với 1 AI không cố ép hai thủ phủ sát nhau: bố trí đối xứng, cải thiện hướng khám phá thay vì tạo rush đầu ván.
- `src/ai/exploration.ts`: tìm đường trên observation đã lọc, loại cạnh địa hình mà đơn vị không trả được ngay cả khi đầy bước (ví dụ lính chùy một bước không đi qua rừng hai bước). Có thể tìm đường vòng đất trống; đường kế hoạch chỉ thực thi đoạn đang thấy và đủ bước thật.
- Hướng thăm dò ban đầu đi từ căn cứ qua tâm công khai của bản đồ rồi tiếp tục phía trước, thay vì đi vòng mép đã mở hoặc luôn quay về tâm. Sau giai đoạn đầu giảm thiên hướng để tiếp tục khảo sát mọi hướng. Ước lượng ô mới bằng vùng tầm nhìn cục bộ, không quét toàn bộ bản đồ cho từng ứng viên như cũ.
- `src/ai/ai.ts`: trinh sát thu làng trống ở gần, khám phá vùng mới và tránh địch đang thấy; không đứng phá công sự từng điểm. Chỉ đánh quân khi có thể kết liễu không chịu phản kích; không bỏ nhiệm vụ thăm dò để chạy đi thu một làng xa đã biết. Những phần kinh tế/nghiên cứu/kỹ năng/đội hình khác giữ nguyên.
- Không đổi `State`, `Command`, `ActionEvent`, giá/chỉ số quân, quyền nghiên cứu, fog, API `nextAICommand` hoặc file UI/render Claude sở hữu.

AI không đọc vị trí xuất phát của đối thủ, không giải mã seed hoặc dùng raw map để tìm địch. Bố cục/biên bản đồ là tọa độ công khai; thông tin địa hình/quân/thành vẫn qua `observe` và kiến thức của chính phe.

## Cách đo tái lập

Cùng bộ `pace-00` tới `pace-29`; với 2/3 AI dùng `pace-00` tới `pace-09`. Hai chính sách người chơi trong `tests/helpers/paceCampaign.ts`:

1. `inward`: tự vệ/chiếm mục tiêu đang thấy, đi về làng gần nhất đã biết hoặc hướng tâm khi chưa biết, nghiên cứu và tuyển một trinh sát khi đủ, rồi tiếp tục khám phá. Không đọc quân/thành địch ẩn; không nhập thuật toán khám phá mới của production AI.
2. `idle`: chỉ gửi EndTurn. Đây là đối chứng AI phải tự tìm tới, không đại diện một chiến thuật cân bằng.

Mỗi lệnh chạy qua engine thật. Bài đo dừng sau 20 vòng hoặc khi kết thúc ván; có giới hạn 180 lệnh cho một lượt để phát hiện lặp. Ghi riêng thấy quân đối phương và giao chiến có quân của người chơi; đánh làng trống không tính là giao chiến quân. Bắt đầu không lộ quân địch trong tất cả ván đo.

```bash
node --import tsx scripts/measure-pace.ts --output artifacts/pace-after-1ai.json
node --import tsx scripts/measure-pace.ts --player idle --output artifacts/pace-after-idle-1ai.json
node --import tsx scripts/measure-pace.ts --ai-count 2 --seeds 10 --output artifacts/pace-after-2ai.json
node --import tsx scripts/measure-pace.ts --ai-count 3 --seeds 10 --output artifacts/pace-after-3ai.json
npm test
npm run build
```

Dữ liệu từng seed của cả trước/sau được lưu trong [measurements/step1-pace.csv](../measurements/step1-pace.csv); JSON đầy đủ ở `artifacts/pace-*.json` (không commit artifacts). Khoảng trống CSV nghĩa là chưa xảy ra trong giới hạn đo, không phải lượt 0. Trung vị tính trên toàn bộ tập, bao gồm ván chưa gặp địch như quan sát bị chặn ở giới hạn thời gian; nếu không xác định được trung vị hữu hạn thì trả null. Baseline lấy từ code `f5da07f` với cùng harness trước khi chỉnh AI/map.

Máy đo: Apple M1 Pro, Darwin 27.2.0, Node v26.7.0. Tổng thời gian `nextAICommand` trong 30 ván chủ động: 18,035 giây/7.639 lệnh trước; 7,701 giây/8.145 lệnh sau (trung bình khoảng 2,36 → 0,95 ms/lệnh). Đây là số đo toàn chiến dịch Node với diễn biến/lệnh khác nhau, không phải benchmark cùng snapshot hoặc số đo UI/FPS. Không dùng nó để khẳng định toàn vòng ba AI trên trình duyệt đã dưới 5 giây.

## Kiểm tra

- 91 kiểm thử đạt, gồm 82 kiểm thử nền và 9 kiểm thử mới. Bộ mới đo 30 seed/1 AI, 10 seed/2 AI, 10 seed/3 AI; kiểm tra đường vòng rừng, đường chỉ đi qua phần đã khảo sát/đang thấy, hướng tiến vào trong, dữ liệu ẩn không đổi quyết định, trinh sát không phá tường và map classic vẫn hoạt động.
- Bộ kiểm tra map hiện có vẫn xác nhận 90 map tái lập/kết nối/khoảng cách và kịch bản chiếm làng hai lượt. Trong kịch bản người chơi đơn giản có AI đối kháng ở cấu hình 3 AI, 8/10 ván chiếm làng ở lượt 2, hai ván ở lượt 3; không đồng nhất kết quả chính sách chơi đơn giản với khả năng đi/chiếm hai lượt được kiểm tra riêng.
- Build TypeScript/Vite thành công. Vite còn cảnh báo bundle trên 500 kB, chưa giải quyết trong phạm vi AI/map.
- Trình duyệt cổng 3010: tạo Vừa/1 AI seed `pace-02`, người chơi chỉ kết lượt. Trinh sát đỏ tự xuất hiện trong tầm nhìn ở lượt AI 10; ảnh [artifacts/step1-first-contact.png](../../artifacts/step1-first-contact.png) ghi đầu lượt người chơi 11. Không sửa UI, localStorage hay React state bằng mã kiểm thử để ép chạm trán; chỉ dùng màn tạo ván và nút Kết lượt.

## Dùng bản mới và phần còn lại

Bố trí mới áp dụng khi **Menu → Ván mới**. Ván đang lưu vẫn chứa địa hình/vị trí cũ và dùng thuật toán AI mới; không thêm migration để đổi bố cục ván đang chơi. Schema tiếp tục là 7.

UI nhanh/đồ họa và phép đo browser đã có ở [bước 5](step5-ui-performance.md); đội hình/ngân sách ở [bước 2](step2-army-ai.md). Tiến độ nghiệm thu hiện hành xem [roadmap](../roadmap.md).
