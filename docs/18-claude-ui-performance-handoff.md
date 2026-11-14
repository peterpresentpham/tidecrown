# Giao việc Claude — UI, phát lượt AI và hiệu năng đồ họa

Ngày giao việc: 14/11/2026. Dự án Nation, prototype 0.7.0. Đọc [06 — Kế hoạch 1.0](06-roadmap.md), [08 — Bản đang chạy](08-prototype.md), [16 — Công nghệ/UI](16-technology-audit-and-ui.md), [17 — Kiểm kê](17-implementation-audit.md). Yêu cầu trong tài liệu giao việc này cụ thể hóa phần việc của Claude, không giao toàn bộ bước 5 hoặc toàn bộ kế hoạch 1.0.

## Cách mở và chạy

- Repo gốc của Codex: `/Users/peterteencare/Documents/personal/nation`.
- Worktree của Claude: `/Users/peterteencare/.codex/worktrees/claude-ui-performance/nation`.
- Nhánh: `claude/ui-performance`.
- Hai thư mục dùng chung Git history nhưng có file làm việc riêng. Claude chỉ sửa trong worktree của mình.
- Worktree không có sẵn node_modules. Chạy `npm ci` tại worktree, không dùng chung hoặc sửa node_modules của repo gốc.
- Kiểm tra: `npm test`, `npm run build`.
- Xem dev song song: `npm run dev -- --port 3011`; xem production sau build: `npm run preview -- --port 3011`.
- Không đổi cổng mặc định 3010 trong package.json. Origin 3011 có lưu ván riêng với origin 3010; đó là hành vi bình thường.

## Prompt để dán cho Claude

Bạn đang phát triển Nation, một game chiến thuật 3D theo lượt bằng React/TypeScript/Vite/Three.js. Hãy thực hiện phần việc UI/đồ họa bên dưới trong worktree riêng. Làm code, kiểm tra và bàn giao; không dừng ở kế hoạch. Không mở rộng thành tái thiết kế game.

### 1. Kiểm tra đúng nơi làm việc

1. CWD phải là `/Users/peterteencare/.codex/worktrees/claude-ui-performance/nation`, branch phải là `claude/ui-performance`. Kiểm tra `git status`, đọc hướng dẫn repo nếu có. Không checkout/sửa repo gốc.
2. Đọc tài liệu 06, 08, 16, 17 và file giao việc này. Code là cơ sở xác nhận hiện trạng; tài liệu cũ 01–05 có ý tưởng đã bỏ khỏi phạm vi.
3. Chạy test/build ban đầu, ghi lỗi có sẵn riêng với lỗi do thay đổi mới. Mốc gốc có 82 test đạt; không hard-code số test vào điều kiện hoàn thành vì Codex có thể bổ sung test.

### 2. Mục tiêu

Hoàn thiện trải nghiệm của nội dung hiện có: giảm thời gian chờ phát lượt AI, giữ giao chiến dễ đọc, có chế độ đồ họa thấp và sửa điểm khó hiểu trong quản lý quân/thành. Giữ chiến trường thoáng, mô hình nhẹ, không làm lại phong cách đồ họa.

Game đã có 45 công nghệ, 23 đơn vị, sương mù, 1–3 AI, đi/đánh/công thành, tàu/vận tải, animation và lưu ván. Tất cả nhánh công nghệ học được trong cùng một ván. Không triển khai lại những hệ thống này.

### 3. Quyền sửa file và ranh giới phối hợp

**Claude sở hữu:**

- `src/ui/App.tsx` — điều phối UI, menu/cài đặt, lịch phát lượt và chờ hoạt ảnh.
- `src/ui/CityPanel.tsx`, `src/ui/UnitActions.tsx` — khả năng đọc thao tác/điều kiện hiện có.
- `src/render/World.ts`, `src/render/unitModels.ts` — tùy chọn chất lượng, thời gian hoạt ảnh và tối ưu có đo đạc.
- Module mới phục vụ UI/đồ họa trong `src/ui/` hoặc `src/render/`, ví dụ preferences/playback/settings; đặt tên rõ ràng để không trùng module AI.
- CSS riêng cho UI/cài đặt; có thể chỉnh đúng selector liên quan trong `src/style.css`, tránh format lại cả file hoặc thay toàn bộ layout.
- Test mới cho phần mình làm, đặt tên `tests/playback*.test.ts`, `tests/visual-settings*.test.ts` hoặc tên riêng tương đương. Không sửa test luật/AI của luồng khác để làm chúng xanh.
- Báo cáo riêng `docs/claude-ui-performance-report.md`; screenshot/đo đạc trong `artifacts/` (thư mục đang bị Git ignore, ghi rõ đường dẫn khi bàn giao).

**Codex sở hữu; Claude không sửa:**

- `src/ai/`, `src/game/map.ts`: khám phá, bố trí map, chọn mục tiêu, phối hợp quân, hiệu năng tính quyết định AI.
- `src/game/engine.ts`, `src/game/visibility.ts`, `src/game/research.ts`, `src/data/`, `src/persistence/save.ts`: luật, thông tin ẩn, dữ liệu và schema.
- `src/ui/ResearchPanel.tsx`, `ResearchConnections.tsx`, `researchGraph.ts`, `research.css`: cây công nghệ đã hoàn thành; giữ nguyên màu và đường mở hiện có.
- `src/ui/NewGameSetup.tsx`: Codex có thể cần sửa khi làm loại map; không chiếm file này cho cài đặt đồ họa. Đặt cài đặt trong menu App/module riêng.
- `tests/engine.test.ts`, `setup.test.ts`, `visibility.test.ts`, `research*.test.ts`, `units.test.ts`, tài liệu kế hoạch 06/08/16/17, README, package.json/package-lock.json và cấu hình build.

Nếu gặp lỗi ở file ngoài quyền sở hữu, ghi ví dụ tái hiện và đề xuất giao diện tối thiểu vào báo cáo, tiếp tục việc độc lập. Không sửa chéo hoặc hỏi xác nhận cho từng lựa chọn UI thông thường. Không tạo framework mới hay thêm thư viện chỉ để làm cài đặt/timer.

### 4. Các phần cần thực hiện, theo thứ tự

**A. Phát lượt AI nhanh/chậm nhất quán với hoạt ảnh**

- Thêm lựa chọn trong menu: tốc độ AI bình thường/nhanh. Nhãn tiếng Việt dễ hiểu; người chơi vẫn nhận ra AI đang xử lý.
- Đây là tốc độ phát lệnh/hiển thị, không phải tăng moves, damage, income, research hoặc số hành động của AI.
- Hiện App có delay quyết định khoảng 190 ms; busy theo sự kiện quan sát được khoảng 850 ms (180 ms khi prefers-reduced-motion). World có thời lượng riêng. Đọc cả hai trước khi chỉnh; gom chính sách thời gian ở một chỗ để UI không mở khóa trong khi renderer còn đang diễn và không chờ thừa sau khi đã diễn xong.
- Giảm delay/busy hợp lý trong chế độ nhanh. Đòn đánh đang thấy vẫn đủ tín hiệu: bên đánh/bị đánh, sát thương, chiếm thành. Bảo toàn chế độ giảm chuyển động của hệ điều hành.
- Sự kiện ngoài observation của người chơi không cần diễn. Không tự hiện quân, nhãn, âm thanh, camera hoặc vị trí địch ngoài tầm nhìn để báo tiến độ. Nguồn bắn bị che vẫn phải được che đúng như observe hiện tại.
- Không bỏ qua command, tự kết lượt khi chưa xong, dùng state snapshot cũ hoặc tạo hai timer thực thi song song. Pause/hủy đúng khi mở thiết lập ván, tab ẩn, unmount, đổi ván hoặc ván kết thúc; khi trở lại không chạy một loạt timer cũ. Giữ hành vi UI đang có khi mở/đóng nghiên cứu.
- Không đổi `nextAICommand(state): Command`, không đưa AI logic vào App. Mỗi lệnh vẫn đi qua `execute` hiện tại.
- Lưu tùy chọn trong khóa UI preferences riêng, đọc dữ liệu có fallback; lỗi localStorage không được chặn chơi. Không đưa tùy chọn vào State hoặc đổi schema lưu ván.

**B. Đồ họa bình thường/thấp**

- Thêm lựa chọn rõ ràng trong menu, lưu cùng UI preferences. Đổi chất lượng không reset ván, mất camera, mất lựa chọn hoặc đổi fog/luật.
- Chế độ thấp giảm các phần như DPR, bóng và trang trí nếu đo cho thấy cần; vẫn giữ hình dáng quân, màu phe, highlight, tầm nhìn và thông tin giao chiến. Không thay 23 mô hình bằng một khối chung hoặc bỏ animation đi/đánh hoàn toàn.
- API World đang được App gọi phải tiếp tục hoạt động. Có thể thêm tùy chọn/method visual riêng; không đổi chữ ký cũ theo cách khiến các chỗ gọi hiện có bị hỏng.
- Không để render loop idle chạy thêm liên tục, rò context, listener, timer, geometry/material sau đổi cấu hình hoặc đổi ván. Giữ render theo nhu cầu và giảm chuyển động.

**C. Sửa khả năng đọc thao tác, phạm vi nhỏ**

- Kiểm tra bảng tuyển/xây và hành động quân: giá mua, duy trì, công nghệ/cơ sở còn thiếu, đã hành động, chờ lượt. Thông tin phải khớp lý do do engine trả; không viết luật mở khóa thứ hai trong UI.
- Chỉ sửa điểm khó hiểu hoặc tràn/che thao tác quan trọng được phát hiện khi thử. Không đổi tên/giá/kỹ năng quân hoặc cấu trúc cây nghiên cứu.
- Giữ bản đồ toàn màn hình khi không quản lý; không thêm drawer/sidebar thường trực, onboarding nhiều popup hoặc bắt xác nhận cho từng đòn đánh.

### 5. Hợp đồng với luồng Codex

- Codex làm thuật toán AI/bản đồ; Claude làm lịch gọi và phát hình. Không sửa chung file.
- Giữ các hợp đồng `State`, `Command`, `ActionEvent`, `observe`, `execute`, `nextAICommand` và cấu trúc dữ liệu quân/công nghệ hiện tại.
- Nếu cần thêm dữ liệu để tính thời gian hoạt ảnh, ưu tiên suy từ sự kiện đã lọc cho người chơi và visual settings. Không bắt engine/AI thay schema để UI chạy được.
- Chế độ nhanh và chất lượng thấp chỉ đổi presentation/scheduling. Với cùng chuỗi command, kết quả State gameplay phải như cũ.
- Không merge/rebase/cherry-pick nhánh Codex hoặc sửa main khi đang làm. Bàn giao các commit nhỏ trên nhánh Claude; Codex ghép sau khi review.

### 6. Cách kiểm tra và điều kiện hoàn thành phần Claude

1. `npm test` và `npm run build` đạt. Test thêm cho chính sách timer/preferences nếu có logic có thể sai; kiểm tra được scheduling mới không nhân đôi hoặc bỏ lệnh. Không thêm test chỉ chép lại constant.
2. Qua browser: đổi tốc độ ngay trong vòng AI, mở/đóng thiết lập/nghiên cứu, ẩn/hiện tab, đổi ván, thắng/thua, tải lại preferences. Không đứng busy vô hạn, không tự đi hai lần, không lộ fog. Có kiểm tra chế độ reduced-motion.
3. Kiểm tra bình thường/thấp với cùng seed và cảnh, trước/sau một chuỗi đi/đánh; chọn quân/camera vẫn hợp lệ. Mở/đóng cây nghiên cứu và đổi cấu hình nhiều lần không tăng liên tục context/listener/tài nguyên render còn sống.
4. UI desktop 1280×720 và 1440×900 không mất nút quan trọng; 390×844 không làm menu/bảng quản lý/cây nghiên cứu mất thao tác. Không tuyên bố hỗ trợ touch đầy đủ chỉ từ kiểm tra viewport.
5. Ghi ít nhất một đo đạc thật: máy/trình duyệt/viewport, cùng scenario và số quân, thời gian vòng AI bình thường/nhanh; FPS hoặc độ trễ khi camera/animation đang chuyển động ở chất lượng bình thường/thấp. Mục tiêu kế hoạch là cảnh 60 quân tổng; có thể dùng fixture/dev scenario riêng trong phạm vi UI, không thay luật game sản xuất hoặc giả vờ số đo đó là playtest chiến dịch.
6. Không khẳng định nhanh hơn bao nhiêu, đạt 30 FPS hoặc chạy tốt trên hai thiết bị nếu chưa đo. Thiết bị/thử nghiệm không có thì ghi chưa kiểm tra; không bịa kết quả và không đánh dấu toàn bộ bước 5 đã hoàn thành chỉ từ build.
7. Screenshot trước/sau hoặc các trạng thái quan trọng, báo cáo giới hạn thật. Không cần deploy hay truy cập dịch vụ ngoài.

### 7. Các điều không thuộc phần việc này

Không thêm công nghệ/quân/map; không cân bằng giá/HP; không thêm AI chiến thuật; không âm thanh/multiplayer/backend; không thay asset toàn bộ; không chuyển save cũ; không sửa toàn bộ tài liệu; không thay port mặc định; không refactor diện rộng để làm đẹp code. Các mục đó không phải lý do kéo dài phần việc Claude.

### 8. Bàn giao

- Tạo commit nhỏ theo kết quả, ví dụ playback, graphics settings, usability/report. Chỉ stage các file của phần mình; không commit dist/node_modules/artifacts hoặc thay đổi không liên quan.
- Viết `docs/claude-ui-performance-report.md`: commit/hash, file đổi, API visual thêm nếu có, test/build, bảng đo trước/sau, screenshot, giới hạn và yêu cầu còn cần Codex xử lý.
- Trả về nhánh + các commit theo thứ tự để ghép, mô tả thay đổi và kết quả kiểm tra. Không tự merge vào main.
- Dừng khi A/B/C và các kiểm tra trong khả năng môi trường đã hoàn tất, nêu rõ điều kiện chưa kiểm chứng; không tự chuyển sang bước gameplay khác.

## Hướng dẫn ghép cho Codex/người dùng

Claude làm trong nhánh riêng; repo gốc tiếp tục làm AI/bản đồ. Không cần copy file qua lại. Sau khi Claude bàn giao:

1. Kiểm tra `git diff main...claude/ui-performance --stat` và danh sách file có đúng quyền sở hữu không.
2. Review timer/animation, fog, preferences và API World; chạy kiểm tra tại worktree trước khi ghép.
3. Ghép nhánh bằng merge hoặc các commit chọn lọc sau khi hoàn tất phần đang làm ở repo gốc. Không dùng reset/ghi đè để xử lý conflict. Nếu có thay đổi ngoài phạm vi, tách hoặc phối hợp trước.
4. Chạy lại test/build và browser smoke test trên bản đã ghép; cập nhật tiến độ 06/08 ở luồng Codex. Chỉ khi đó ghi phần việc đã tích hợp.

Không archive/xóa worktree cho đến khi đã nhận và ghép xong phần việc Claude.
