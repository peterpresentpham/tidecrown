# Bước 5 — Tích hợp giao diện và hiệu năng

Ngày 14/11/2026. **Đã hoàn thiện phần code và kiểm thử trên máy hiện tại.** Chưa nghiệm thu đủ bước 5 vì chưa có phiên người dùng chơi thử 10 phút và phép đo trên thiết bị yếu hơn. Người dùng chọn hoàn thiện code/kiểm thử máy hiện tại trước.

## Nguồn và cách ghép

- Đích: `/Users/peterteencare/Documents/personal/nation`, nhánh `main`.
- Đã fetch `origin/claude/ui-performance`, nguồn `0b9a76d`. Review Git objects và ghép diff vào working tree; không checkout, sửa hoặc lấy file đang làm trong worktree Claude. Không stage, commit, merge commit, reset hoặc stash các thay đổi trước đó. HEAD vẫn `de1d924`; lịch sử Git chưa ghi quan hệ merge.
- Giữ phần bước 2–4 chưa commit, đặc biệt AI, dữ liệu cân bằng, bản đồ nước, save và cây nghiên cứu. `CityPanel` tiếp tục đọc `BALANCE.cityRepair` (+2); `NewGameSetup`/App truyền và giữ `map: random | water`. `AGENTS.md` của repo gốc được giữ; `CLAUDE.md` trỏ tới quy tắc đó.
- Bản bàn giao Claude trước tích hợp có số 91 test/40 QA và phép đo headless; đó không phải kết quả xác nhận bản tích hợp. Tài liệu bàn giao đã được loại khỏi docs khi tái cấu trúc; báo cáo này và dữ liệu đo kèm theo là bằng chứng của bản tích hợp. Diff với HEAD còn gồm các bước 2–4 đang phát triển; không nhầm tất cả file AI/data mới là thay đổi riêng bước 5.

## Đầu ra trong game

**Menu → Lượt AI:** Bình thường/Nhanh. **Menu → Đồ họa:** Đầy đủ/Thấp. Hai tùy chọn lưu riêng trong `nation-ui-preferences-v1`, không đổi schema/save gameplay. Đổi đồ họa tại chỗ giữ camera, quân đang chọn, bản đồ và sương mù. Thấp dùng DPR 1, tắt bóng, bớt cây/đá/sóng trang trí; giữ mô hình quân, màu phe, công trình, đường/cầu, fog và tín hiệu giao chiến. Đầy đủ dùng DPR tối đa 1,5.

Thời gian hoạt ảnh và phát lệnh dùng chung `playbackPolicy.ts`. Nhanh rút hoạt ảnh AI 0,8 → 0,42 giây, đợi sau hành động thấy được 60 ms, ngoài quan sát 16 ms. Hành động người chơi vẫn 0,8 giây; giảm chuyển động luôn ưu tiên 0,16 giây. Sự kiện ẩn không được đưa lên màn hình. Không cấp thêm bước, tiền, sát thương hoặc bỏ lệnh AI.

Bảng thành hiện điều kiện thiếu dưới quân/công trình; sửa/nâng thành lấy cùng lý do với engine. Hành động quân giải thích thiếu mục tiêu hợp lệ, lương, chỗ tàu, cơ sở nâng quân hoặc đã hành động. Khi chọn lên/xuống tàu hay hỗ trợ, những mục tiêu hợp lệ được tô vàng theo đúng lệnh engine chấp nhận. Không tạo thêm kỹ năng hay luật chiến đấu.

## Sửa bổ sung sau review

| Vấn đề | Kết quả |
| --- | --- |
| Dấu hoạt ảnh đã xong còn từ ván cũ, có thể trùng ID hành động đầu ván mới | Reset `finishedEvent` khi tạo ván. UI thử ván mới sau thua, hành động đầu vẫn khóa đúng đến hết hoạt ảnh |
| Timeout cũ có thể đã nằm trong hàng đợi dù đã cleanup | `runScheduledAIStep` dùng định danh state: chỉ chạy với đúng snapshot đang chờ; bỏ callback cũ, lượt người chơi và ván đã kết thúc. Callback còn kiểm tra `document.hidden` |
| UI lấy lý do sửa/nâng bằng clone/execute cả thế giới khi rê chuột | `upgradeReason`/`repairReason` là kiểm tra thuần dùng chung UI/engine; cache tính khả dụng cải tạo và hành động theo state, không theo hover. Chỉ làm rõ chuỗi lỗi, không đổi quyền thực hiện |
| Bảng thành đụng dòng trạng thái; Menu che nút đóng bảng trên 390 px | Tách làn thông báo/HUD, giới hạn chiều cao và cho cuộn; mở Menu đóng bảng quản lý. Không thêm sidebar thường trực |
| Hành động nhắm mục tiêu không chỉ rõ bãi/đích hợp lệ | Dùng cùng các lệnh hợp lệ để bật nút và tô vàng; kiểm tra không tô thành địch làm bãi đổ bộ |
| Tab ở select nghiên cứu/nâng quân bị hiểu thành chuyển lính | Chỉ dùng Tab chuyển quân khi đang ở chiến trường, không chặn điều hướng bàn phím trong UI. Q/E không xoay camera nền khi World đang tạm dừng |
| Nút zoom có thể không vẽ sau lúc idle | Yêu cầu draw khi zoom, vẫn giữ render theo nhu cầu |
| Giảm chuyển động/đổi tốc độ giữa hoạt ảnh | Rút thời lượng hoạt ảnh đang chạy khi cần, không kéo dài lại; cuộn cây nghiên cứu cũng tôn trọng giảm chuyển động |
| Hook debug giữ tham chiếu renderer sau unmount | Xóa hook đúng instance khi cleanup; App tháo có 0 canvas, gắn lại có 1 canvas |

Gộp phần cứng cùng vật liệu trong mô hình quân theo phần Claude; chân, bánh xe, vũ khí và buồm chuyển động được giữ riêng. Hover chỉ cập nhật vòng hover, không tính lại preview cho 825 ô. Không đổi `unitModels.ts`, data quân/công nghệ, giá hoặc thuật toán AI của bước 4.

## Phép đo mới trên bản tích hợp

Dữ liệu: [step5-integrated-performance.json](../measurements/step5-integrated-performance.json).

Môi trường: trình duyệt tích hợp Codex/IAB, UA Chromium 157, WebGL `ANGLE Metal Renderer: Apple M1 Pro`, 8 luồng theo trình duyệt, 1280×720, DPR thiết bị 2, giảm chuyển động tắt. Không lấy thông tin RAM hay phiên bản OS trong báo cáo Claude làm số đo mới.

Bài đo chạy qua trang dev `tests/perf/bench.html` ở cổng 3012. **Đây là phép đo dev, không phải benchmark production/headless của Claude.** Production được smoke test riêng ở cổng mặc định 3010. Baseline là renderer từ `de1d924`, chạy với cùng data, unitModels, luật, AI và fixture hiện tại; chỉ thêm bộ đếm khung/hook chỉ đọc để đo. Không checkout nhánh hoặc sửa worktree khác.

Mỗi cấu hình hai lần. Camera xoay liên tục 4 giây; FPS đếm số lần renderer thật sự vẽ. FPS hoạt ảnh tính trong các cửa sổ đang diễn hoạt ảnh, không chia cho những khoảng cố ý đứng yên. Draw/frame là trung bình số draw call renderer báo trong pha camera. Idle đo một giây sau warmup. Thời gian vòng AI gồm tính lệnh, execute, đồng bộ hình và đợi trình bày; không phải thời lượng người chơi.

| Scenario | Renderer / cài đặt | FPS camera (trung vị) | P95 khung camera | FPS hoạt ảnh | Vòng AI | Draw/frame | Idle frames |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| battle-60 | baseline · normal/normal | 25.71 | 42.20 ms | 26.60 | 37359 ms | 1061 | 0 |
| battle-60 | integrated · normal/normal | 29.98 | 34.25 ms | 31.05 | 36574 ms | 892 | 0 |
| battle-60 | integrated · fast/low | 30.09 | 34.10 ms | 31.64 | 17888 ms | 830 | 0 |
| ai-round | integrated · fast/low | 29.98 | 33.85 ms | — | 1722 ms | 145.5 | 0 |


Scenario `battle-60`: 60 quân tổng, 58 mô hình trong observation người chơi; không khẳng định cả 60 luôn nằm trong khung nhìn khi camera xoay. Scenario `ai-round`: 3 AI × 10 quân gần thành mình và 5 quân người chơi, phần lớn hành động ngoài tầm nhìn. Đầy đủ tiệm cận trần 30 FPS; mức Thấp đạt trung vị khoảng 30,09 FPS camera trong hai lần đo, không suy thành bảo đảm mọi cảnh/máy đều đạt.

App thật ở `tests/perf/app.html` chạy cùng fixture ba AI: **2 184 ms (~2,18 giây)**, độ phân giải quan sát 100 ms. Trạng thái cuối có hash `c172b3ca`, trùng bộ đo engine, lượt 2 của người chơi, không còn hoạt ảnh và một canvas. Hash cảnh 60 quân là `96d436bd` ở cả baseline/Đầy đủ/Nhanh+Thấp. Đối chiếu này kiểm tra không bỏ lệnh hoặc đổi gameplay để tạo tốc độ nhanh.

### Vòng đời tài nguyên

12 lần đổi Đầy đủ/Thấp kèm pause/sync/resume: geometries **893 → 893**, textures **3 → 3**, programs **6 → 6**, labels **61 → 61**, registry geometries **2353 → 2353**. Sáu lần dispose/tạo World lại: mỗi instance có một canvas, cùng số geometry/texture/label. Thử App thật unmount/remount: 0 rồi 1 canvas; renderer gọi dispose/forceContextLoss và bỏ listener/timer. Không thấy tăng các bộ đếm này; đây không phải phép đo heap hoặc bộ nhớ GPU toàn hệ điều hành.

## Kiểm tra giao diện

Quan sát DOM và ảnh: [step5-ui-checks.json](../measurements/step5-ui-checks.json). File giữ cả quan sát Menu che bảng thành trước sửa và trường hợp `390-menu-final-exclusive` sau sửa, không coi quan sát cũ là kết quả đạt của bản cuối.

| Luồng | Kết quả trên App thật |
| --- | --- |
| Khám phá/chiếm làng | Ván Hai bờ biển mới, di chuyển mở Bến 1, kết lượt rồi chiếm được làng. Ván mới còn đúng map nước, tài nguyên khởi đầu và một canvas |
| Nghiên cứu/tuyển | Tuyển trinh sát bằng tiền, nghiên cứu Cung thuật qua lượt thật, tuyển cung; giá/duy trì/điều kiện hiện đủ. Nghiên cứu Kho lương dùng được tại 390×844 |
| Giao chiến/kết lượt | Cảnh 60 quân, đổi tốc độ nhiều lần giữa lượt và mở/đóng nghiên cứu; quay lại đúng lượt 2 của người chơi. Thắng/thua hiện hộp thoại và cho tạo ván mới |
| Hải quân | Lên tàu có 1/6 chỗ, chọn tàu đi qua hai ô biển, chọn bãi vàng, đổ bộ và chiếm Bến đối diện |
| Reset và timer | Tạo ván mới giữa lượt AI giữ ván mới ở lượt 1; callback cũ không ghi đè. Hành động đầu ván mới khóa UI đúng thời gian |
| Preferences | Thấp/Nhanh áp dụng tại chỗ, giữ quân đang chọn, còn sau reload; schema/save gameplay không đổi |
| Bàn phím | Tab từ select lọc nghiên cứu không đóng cây hoặc chuyển sang lính khác |
| 1280×720, 1440×900 | Bảng/menu ở trong màn hình, nút đóng/quyền kết lượt có thể truy cập, trạng thái không đè bảng thành |
| 390×844 | Không tràn ngang document; bảng thành cuộn được, nút đóng và kết lượt không bị che; nghiên cứu có vùng cuộn và nút bắt đầu/đóng thao tác được. Menu và bảng thành không mở chồng nhau |

Bảng nghiên cứu đang mở chủ ý phủ chiến trường và nút kết lượt nền; nút nghiên cứu/đóng trong bảng vẫn truy cập được. Đây không phải cam kết điều khiển cảm ứng đầy đủ.

Ảnh cục bộ (không stage): `artifacts/step5-production.png`, `step5-mobile-city.png`, `step5-mobile-research.png`, `step5-naval.png`, `step5-benchmark.png`.

- `npm test`: **188/188 đạt**; gồm bộ luật/45 công nghệ/23 quân, fog, pace, bộ/biển/cân bằng trước đó và 13 test preferences/playback/lý do/mục tiêu UI.
- `npm run build`: đạt. Vẫn có cảnh báo bundle >500 kB; không thêm dependency hay đổi cổng mặc định.
- Production preview 3010 có Menu mới, một canvas, hiển thị đúng ván lưu; không có console error trong hai tab App được kiểm tra.

## Chạy lại

```bash
npm test
npm run build
npm run preview   # production 3010

# Công cụ kiểm tra riêng; không ghi đè save trên origin 3010:
node --import tsx tests/perf/prepare-baseline.ts
npm run dev -- --port 3012
# /tests/perf/bench.html — chạy phép đo, xuất JSON
# /tests/perf/load.html — nạp fixture vào origin 3012 và dùng App thật
```

Trang nạp fixture chỉ hoạt động ở cổng thử 3012. Traces/renderer baseline/ảnh trong artifacts không thuộc build sản phẩm. Số đo 23 thay cho số liệu trước ghép khi đánh giá bản tích hợp; không cộng các test/QA lịch sử của Claude thành số kiểm tra mới.

## Nghiệm thu còn chờ

1. **Người dùng chơi thử 10 phút:** ghi nhận có nhận ra quân mình, điều kiện thiếu, nguyên nhân sát thương/chiếm thành mà không cần giải thích ngoài game. Các luồng agent đã thao tác không thay thế tiêu chí này.
2. **Thiết bị yếu hơn:** ghi máy, trình duyệt, chất lượng và FPS/độ trễ thật. Không dùng CPU throttling hoặc DPR thấp trên cùng máy để gọi là thiết bị thứ hai.

Tab ẩn được xử lý bằng visibility listener, cleanup và kiểm tra ngay trước callback; chưa có phép thử chuyển tab hệ điều hành thực trong IAB. Giảm chuyển động có test chính sách và xử lý đổi cờ, nhưng chưa đổi cài đặt OS thật trong lượt kiểm tra này. Không giả các phép thử đó là đã thực hiện.

Phần code/kiểm tra máy hiện tại hoàn tất theo lựa chọn của người dùng. Giữ bước 5 ở trạng thái chờ hai tiêu chí nghiệm thu ngoài môi trường; chưa đánh dấu toàn bộ 1.0 hoàn thành hoặc tự chuyển sang thêm tính năng.
