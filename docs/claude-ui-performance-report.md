# Báo cáo Claude — UI, phát lượt AI và hiệu năng đồ họa

Ngày 14/11/2026 · nhánh `claude/ui-performance` · worktree `/Users/peterteencare/Documents/personal/nation-claude-ui-performance`. Theo [18 — Giao việc](18-claude-ui-performance-handoff.md) và `AGENTS.md`: **chưa tạo commit**, mọi thay đổi nằm trong working tree để người dùng review và commit.

Phạm vi đã làm: A (tốc độ AI), B (đồ họa bình thường/thấp), C (lý do thao tác trong bảng thành/hành động quân). Không đổi luật, AI, dữ liệu, schema lưu ván, `NewGameSetup`, cây nghiên cứu hay `package.json`.

## 1. File thay đổi

| File | Thay đổi |
| --- | --- |
| `src/ui/playbackPolicy.ts` (mới) | Một chỗ duy nhất cho chính sách thời gian (delay quyết định AI, thời lượng hoạt ảnh, watchdog) và UI preferences (`nation-ui-preferences-v1`, đọc có fallback, ghi không ném lỗi) |
| `src/ui/aiTurnStep.ts` (mới) | `runAIStep(state)`: đúng một `nextAICommand` → `execute`; lệnh lỗi thì kết lượt phe đó (giữ nguyên hành vi cũ của App) |
| `src/ui/VisualSettingsMenu.tsx`, `src/ui/settings.css` (mới) | Hai nhóm nút trong Menu: **Lượt AI** Bình thường/Nhanh, **Đồ họa** Đầy đủ/Thấp; ghi chú khi hệ thống bật giảm chuyển động |
| `src/ui/actionReasons.ts`, `src/ui/management.css` (mới) | Lý do không dùng được nút, lấy từ engine (`execute` chạy thử trên bản sao, `improvementReason`) |
| `src/ui/App.tsx` | Lịch AI một timer, khóa busy theo tín hiệu kết thúc hoạt ảnh của World, dừng khi tab ẩn, preferences, menu cài đặt, cờ đo `?debug-world` |
| `src/render/World.ts` | `setVisualSettings`, chất lượng thấp, thời lượng hoạt ảnh theo chính sách chung, callback kết thúc hoạt ảnh, sửa trần 30 FPS, tách vòng hover, gộp mảnh tĩnh của mô hình quân |
| `src/ui/CityPanel.tsx`, `src/ui/UnitActions.tsx` | Hiện lý do ngay dưới nút (tuyển, nâng thành, sửa công sự, công trình, cải tạo, hành động quân) |
| `tests/playback.test.ts`, `tests/ui-reasons.test.ts` (mới) | 9 bài kiểm thử cho preferences, chính sách thời gian, bước AI, lý do thao tác |
| `tests/perf/*` (mới, không thuộc `npm test`) | Fixture đo (`fixture.ts`, `write-fixtures.ts`), benchmark trình duyệt (`measure.mjs`), QA trình duyệt (`qa.mjs`) |

`src/render/unitModels.ts` không cần sửa: việc gộp mảnh làm ở World, sau khi dựng mô hình.

## 2. A — Phát lượt AI

- **Một chính sách thời gian** (`playbackPolicy.ts`), App và World cùng đọc. Trước đây App khóa 850 ms còn World diễn 800 ms, hai hằng số độc lập.
- **Busy theo tín hiệu thật:** App khóa UI khi sự kiện mới nằm trong observation của người chơi; World gọi `onVisualEnd(eventId)` khi diễn xong (hoặc khi bị bỏ qua vì đang tạm dừng/tab ẩn). Watchdog `3 × thời lượng + 1 s` chỉ để chống kẹt; không có renderer thì chờ đúng thời lượng hoạt ảnh.
- **Tốc độ nhanh** chỉ áp dụng cho sự kiện của AI: hoạt ảnh 0,8 s → 0,42 s, delay sau sự kiện thấy được 190 → 60 ms, sau sự kiện không thấy được 190 → 16 ms (một khung hình). Hành động của người chơi giữ 0,8 s. Bình thường giữ nguyên 190 ms/0,8 s.
- **Giảm chuyển động** của hệ điều hành luôn thắng (0,16 s), có lắng nghe thay đổi trong lúc chơi.
- Sự kiện ngoài observation không diễn và không giữ UI (như trước); không thêm quân/nhãn/camera nào. World vẫn chỉ nhận `observe(state,'player')`.
- **Hủy/tạm dừng:** đúng một timer AI (effect cleanup), dừng khi mở thiết lập ván, ván kết thúc, tab ẩn, unmount; đổi ván reset khóa busy; đổi tốc độ giữa vòng thay timer hiện tại bằng timer mới. Mở/đóng nghiên cứu giữ hành vi cũ (AI vẫn đi; hoạt ảnh trong lúc World tạm dừng được bỏ qua để không treo UI).
- Không đổi `nextAICommand(state): Command`; mỗi lệnh vẫn qua `execute`.

## 3. B — Đồ họa Đầy đủ/Thấp

API World mới (chữ ký cũ giữ nguyên, tham số thứ năm là tùy chọn):

```ts
new World(container, state, onSelect, onHover, options?: { quality?, aiSpeed?, reducedMotion?, onVisualEnd? })
world.setVisualSettings({ quality?: 'normal'|'low', aiSpeed?: 'normal'|'fast', reducedMotion?: boolean })
world.visualSettings()   // quality, aiSpeed, reducedMotion, pixelRatio, shadows
world.isAnimating()
world.diagnostics()      // bổ sung geometries, textures, programs, labels, materials
```

- **Thấp:** DPR 1 (thay vì tối đa 1,5), tắt shadow map và bóng mặt trời, ẩn trang trí thuần túy (2/3 cây trên ô rừng, đá, sóng nước, tuyết đỉnh núi). Giữ nguyên 23 mô hình quân, màu phe, đường cải tạo/cầu/ruộng, thành, highlight, fog và hoạt ảnh đi/đánh.
- Đổi chất lượng áp dụng tại chỗ: không tạo lại renderer, không reset ván/camera/lựa chọn. Antialias không đổi được khi chạy nên giữ nguyên.
- **Tối ưu áp dụng cho cả hai mức** (có số đo ở mục 5):
  - Sửa trần 30 FPS: `renderTime < 1/30` với vsync 60 Hz thường lệch sang khung thứ ba, nên chuyển động thực tế chỉ ~20–23 FPS. Thêm dung sai 4 ms.
  - Gộp các mảnh tĩnh cùng vật liệu trong mỗi mô hình quân; chân, bánh xe, vũ khí/trục máy vẫn tách để hoạt ảnh. Draw call cảnh 60 quân 989 → 831.
  - Rê chuột chỉ vẽ lại vòng hover; không còn chạy `previewAttack` cho 825 ô mỗi lần đổi ô.

## 4. C — Khả năng đọc thao tác

- Mọi lý do lấy từ engine: `recruitReason`, `buildingReason`, `improvementReason`, hoặc lỗi của `execute` chạy thử (nâng thành, sửa công sự). UI không giữ luật mở khóa riêng.
- Đã sửa:
  - Nút **Nâng thành** và **Sửa công sự** trước bị tắt mà không giải thích. UI cũ còn tự tắt Sửa theo điều kiện riêng nhưng vẫn bật khi có địch kề thành (engine từ chối). Nay trạng thái và lý do khớp engine; riêng thành cấp 3 ghi “Đã đạt cấp tối đa.”
  - Danh sách tuyển hiện lý do dưới mỗi quân (thiếu công nghệ/cơ sở, đã tuyển lượt này, thiếu tài nguyên…), không chỉ trong tooltip.
  - Công trình hiện lý do ngay trên thẻ.
  - **Cải tạo lãnh thổ:** chỉ bật khi có ít nhất một ô quanh thành hợp lệ theo engine; nếu không, hiện lý do phổ biến nhất (ví dụ “Mỏ cần ô đồi trống.”). Công nghệ còn thiếu có nhãn “Mở khóa” và ghi tên công nghệ.
  - Hành động quân hiện dòng lý do: chờ lượt / đang diễn hoạt ảnh / đã hành động lượt này / ván kết thúc. Nút chọn hàng trên tàu tắt khi đang diễn.
- Không đổi tên, giá, kỹ năng quân hay cấu trúc cây nghiên cứu; không thêm drawer hay popup.

## 5. Đo đạc

**Máy:** MacBook Pro Apple M1 Pro, 16 GB · Google Chrome headless (Playwright 1.63, `channel: chrome`) · GPU thật `ANGLE Metal Renderer: Apple M1 Pro` · viewport 1280×720, deviceScaleFactor 2 · build production (`vite preview`). Baseline là commit `f5da07f` build riêng, cùng fixture. Mỗi cấu hình chạy 2 lần (riêng reduced-motion 1 lần); bảng ghi trung vị.

**Scenario** (`tests/perf/fixture.ts`, không đổi luật):
- `ai-round`: 3 AI Vừa, 10 quân/AI gần thành mình, người chơi 5 quân (scenario chuẩn của bước 1). Phần lớn lệnh AI ngoài tầm nhìn người chơi.
- `battle-60`: 60 quân trong cùng vùng nhìn thấy quanh thủ phủ người chơi (20 của người chơi, 40 của 3 AI), 44 nhãn quân trên màn hình. Một vòng AI có 44 lệnh, 43 đòn đánh người chơi thấy.
- Tính toán AI + `execute` đo riêng trong Node: `ai-round` 61 lệnh ≈ 0,20 s; `battle-60` 44 lệnh ≈ 0,13 s. Gần như toàn bộ thời gian vòng là thời gian chờ/hoạt ảnh.

| Scenario | Bản | Tốc độ AI | Đồ họa | Vòng AI (ms) | FPS khi pan | FPS trong vòng AI | Draw call/khung |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ai-round | gốc | — | — | 12 514 | 22,8 | 5,6 | 199 |
| ai-round | mới | Bình thường | Đầy đủ | 12 321 | 29,7 | 5,7 | 183 |
| ai-round | mới | **Nhanh** | Đầy đủ | **1 461** | 29,6 | 30,4 | 183 |
| ai-round | mới | Nhanh | Thấp | 1 464 | 29,7 | 30,3 | 152 |
| battle-60 | gốc | — | — | 40 638 | 22,5 | 17,5 | 989 |
| battle-60 | mới | Bình thường | Đầy đủ | 39 193 | 29,8 | 23,7 | 831 |
| battle-60 | mới | **Nhanh** | Đầy đủ | **18 980** | 29,6 | 25,9 | 831 |
| battle-60 | mới | Bình thường | Thấp | 39 330 | 29,7 | 23,5 | 777 |
| battle-60 | mới | Nhanh | Thấp | 18 951 | 29,7 | 25,8 | 777 |
| battle-60, giảm chuyển động | gốc | — | — | 15 773 | 22,6 | 10,5 | 989 |
| battle-60, giảm chuyển động | mới | Bình thường | Đầy đủ | 15 052 | 29,6 | 13,2 | 831 |

- FPS là số khung **thực sự vẽ** mỗi giây (đếm draw call WebGL theo rAF); trần thiết kế là 30. Khi pan, p95 khoảng cách khung giảm 50 ms → 33 ms. Khi đứng yên không vẽ khung nào (0 khung/2 s) ở mọi cấu hình: render theo nhu cầu được giữ.
- “FPS trong vòng AI” thấp ở `ai-round` bình thường là đúng thiết kế: chỉ vẽ khi có lệnh (mỗi 190 ms), không phải giật.
- Mục tiêu bước 1 “toàn vòng ba AI ≤ 5 s ở chế độ nhanh, 10 quân/AI”: **1,46 s** trên máy này, scenario `ai-round`. Không phải bảo đảm cho máy khác.
- Ở `battle-60`, chế độ nhanh vẫn mất ~19 s vì 43 đòn đánh đều nằm trong tầm nhìn và vẫn được diễn (≈ 0,42 s + 60 ms mỗi đòn). Đây là chủ ý của yêu cầu giữ đòn đánh đang thấy dễ đọc.
- Chế độ Thấp trên M1 Pro không đổi FPS vì đã chạm trần 30. Tác dụng của DPR 1 và tắt bóng với GPU yếu **chưa đo**.

Dữ liệu thô: `artifacts/perf/results-1.jsonl` (lượt đo đầu, trước khi sửa trần FPS và gộp mảnh) và `artifacts/perf/results-final.jsonl`.

Chạy lại:

```bash
node --import tsx tests/perf/write-fixtures.ts artifacts/perf
npm run build && npm run preview -- --port 3011   # cửa sổ khác
PLAYWRIGHT=<đường dẫn>/node_modules/playwright/index.mjs node tests/perf/measure.mjs http://127.0.0.1:3011/ artifacts/perf/battle-60.json label fast normal 2
PLAYWRIGHT=… node tests/perf/qa.mjs http://127.0.0.1:3011/ artifacts/perf artifacts/screenshots
```

## 6. Kiểm tra

- `npm test`: **91/91 đạt** (82 bài gốc + 9 bài mới). `npm run build`: đạt; cảnh báo bundle > 500 kB có từ trước.
- QA trình duyệt (`tests/perf/qa.mjs`, Chrome headless, build production): **40/40 đạt**:
  - Đổi tốc độ 3 lần giữa vòng AI: vòng kết thúc đúng một lần (lượt 1 → 2), không có lệnh nào sau khi trả quyền cho người chơi; preference lưu dưới khóa riêng và còn sau khi tải lại.
  - Mở/đóng nghiên cứu giữa vòng: AI tiếp tục như hành vi cũ.
  - Tab ẩn (giả lập `visibilitychange`): không chạy lệnh trong 2 s; khi trở lại chỉ 1 lệnh trong 250 ms đầu (không dồn timer cũ), vòng hoàn tất.
  - Mở thiết lập ván giữa vòng: AI dừng. Bắt đầu ván mới: lượt 1 của người chơi, không lệnh cũ, nút Kết lượt dùng được, một canvas.
  - Thắng (chiếm thành cuối của địch) và thua (AI chiếm thành cuối): hộp thoại hiện, AI dừng, không kẹt busy.
  - 6 lần đổi Thấp ↔ Đầy đủ kèm mở/đóng nghiên cứu: geometry 836 → 836, texture 3 → 3, label 57 → 57, một WebGL context. Số shader program 5 → 8 là biến thể có/không bóng được cache một lần, không tăng tiếp. Thấp: DPR 1, không bóng; giữ quân đang chọn và đủ 54 mô hình.
  - Giảm chuyển động: World nhận cờ; menu hiện ghi chú.
  - 1280×720, 1440×900, 390×844: cài đặt nằm trọn trong màn hình, bảng thành không tràn chiều ngang, nút Kết lượt hiển thị; không có lỗi trang.
- Screenshot trong `artifacts/screenshots/`:
  - `graphics-normal-1280x720.png`, `graphics-low-1280x720.png`: cùng cảnh 60 quân ở hai mức.
  - `menu-*.png`, `city-recruit-*.png`, `city-build-*.png`, `city-land-*.png`, `unit-*.png`, `research-*.png`: theo từng viewport.
  - `win-1280x720.png`, `lose-1280x720.png`, `fresh-selected-1280x720.png` (vòng đi và hover sau khi tách highlight).

## 7. Giới hạn và việc chưa kiểm chứng

- **Chưa đo thiết bị thứ hai/yếu hơn** và chưa có phiên người chơi thử 10 phút; phần nghiệm thu tương ứng của bước 5 **chưa đạt**. Không đánh dấu bước 5 hoàn thành.
- Đo bằng Chrome headless với GPU thật; chưa đo Safari/Firefox, chưa đo màn hình 120 Hz.
- Trần 30 FPS vẫn giữ theo thiết kế cũ; FPS khi pan đã chạm trần nên không còn dư địa để thấy khác biệt Thấp/Đầy đủ trên M1 Pro.
- Draw call còn ~780–830 trong cảnh 60 quân, phần lớn từ ô bản đồ và trang trí. Gộp hình học bản đồ cần thay cách đổ bóng vùng nhớ theo ô; chưa làm để tránh rủi ro fog.
- Ẩn tab chỉ kiểm tra bằng giả lập `document.hidden` + `visibilitychange`, không phải chuyển tab thật.
- Ở 1280×720 và 390×844, dòng trạng thái nằm đè mép dưới bảng thành (có từ trước; danh sách vẫn cuộn được, không mất thao tác). Chưa sửa để không đổi bố cục HUD.
- Engine trả “Chưa cần sửa hoặc đã sửa trong lượt này.” cho cả hai trường hợp công sự đầy hoặc đã sửa; UI hiển thị đúng chuỗi đó.

## 8. Đề xuất cho Codex (không sửa chéo)

- `execute` cho `build: 'upgrade'` trả cùng một lỗi “Không thể nâng thành trong lượt này.” cho cấp tối đa, đang xây và đã xây trong lượt. Nếu tách thành các lý do riêng (hoặc thêm `upgradeReason(s, city)` như `buildingReason`), UI sẽ hiển thị đúng mà không phải suy đoán. UI hiện chỉ tự ghi “Đã đạt cấp tối đa.” dựa trên `city.level`.
- Tương tự với sửa công sự: lỗi gộp “Chưa cần sửa hoặc đã sửa trong lượt này.”.
- Khi đo thời gian AI ở bước 1, nên dùng `runAIStep` và `tests/perf/fixture.ts` để tách thời gian tính lệnh khỏi thời gian hoạt ảnh.
