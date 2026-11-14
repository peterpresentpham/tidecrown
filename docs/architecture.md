# Kiến trúc và phát triển

Cập nhật 14/11/2026. Game chơi đơn phía client: TypeScript, React, Vite, Three.js (phiên bản ở [package.json](../package.json)). Không có backend hoặc tài khoản.

## Thư mục

| Nơi | Trách nhiệm |
| --- | --- |
| `src/game/engine.ts` | `State`, `Command`, `execute`: di chuyển, chiến đấu, kinh tế, công trình, lượt, kết quả |
| `src/game/map.ts`, `waterMap.ts` | Sinh bản đồ theo mã, thiết lập ván, bố trí xuất phát |
| `src/game/visibility.ts` | Tầm nhìn, ký ức địa hình/thành, `observe` riêng theo phe |
| `src/game/research.ts` | Trạng thái nghiên cứu dùng chung cho engine và UI |
| `src/game/actionPlan.ts` | Đi–đánh: lập kế hoạch từ observation, thực thi lại từng bước, dừng khi lộ địch mới |
| `src/game/undo.ts` | Hoàn tác bước đi gần nhất: một snapshot, đối chiếu identity state và knowledge |
| `src/game/threats.ts` | Vùng nguy hiểm ước lượng từ quân địch đang thấy |
| `src/data/` | Công nghệ, đơn vị, công trình/cải tạo, tham số cân bằng |
| `src/ai/` | `ai.ts` điều phối; `exploration`, `tactics`, `development`, `naval` |
| `src/render/` | `World.ts` (camera, picking, cảnh, hoạt ảnh, vòng đời GPU), `unitModels.ts`, `visualIdentity.ts` (màu/biểu tượng phe) |
| `src/ui/` | HUD, thiết lập, thành/quân, cây công nghệ, tùy chọn, phát lượt AI |
| `src/persistence/save.ts` | Parse/validate save schema 8, localStorage, bảo vệ dữ liệu lỗi |
| `tests/` | Test luật/AI/UI logic (`*.test.ts`), helper scenario, trang kiểm tra trực quan |
| `scripts/selfplay.ts` | Máy tự chơi nhiều ván để đo nhịp và khả năng kết thúc |

## Luồng lệnh và thông tin ẩn

UI hoặc AI gửi `Command` → `execute` kiểm tra và trả state mới cùng `ActionEvent` → UI đồng bộ → `World` phát hoạt ảnh. Kết quả tính trước hoạt ảnh; tốc độ trình bày không đổi state. `previewAttack`, `researchStatus` và các hàm lý do tuyển/xây/sửa/nâng được dùng chung để UI và engine không có hai bộ luật.

`State` giữ settings, phe/lượt/vòng, tiles/cities/units, tài nguyên, công nghệ/nghiên cứu, knowledge riêng mỗi phe, event/serial, logs và winner. Bản đồ là lưới vuông `q,r`. AI chỉ quyết định trên `observe(state, phe)`; đổi dữ liệu ẩn không được đổi quyết định khi observation giữ nguyên. Mọi lệnh AI vẫn qua engine, trả đúng chi phí.

`State.events` là hàng đợi có giới hạn (ví dụ nhiều phát bắn thành trong một lệnh); mỗi event được lọc trong `observe`. Tóm tắt lượt AI giữ tối đa 12 sự kiện đã quan sát. Lệnh UI đang chờ và hoàn tác là tạm thời, không lưu qua reload.

## Phát lượt và đồ họa

`playbackPolicy.ts` giữ thời lượng chung: bình thường 0,8 s; AI Nhanh 0,42 s; giảm chuyển động 0,16 s. UI chờ `onVisualEnd` kèm watchdog; `aiTurnStep.ts` bỏ callback của snapshot cũ. Tab ẩn tạm dừng lịch phát.

World render theo nhu cầu, trần ~30 FPS, đứng yên thì không vẽ. Đầy đủ: bóng, DPR tối đa 1,5; Vừa: không bóng, DPR 1; Thấp: bớt trang trí. Bề mặt bản đồ và bộ phận tĩnh được gộp bằng vertex color; chân, bánh, vũ khí, buồm vẫn chuyển động riêng. Dispose phải gỡ timer/listener, nhãn, geometry/material và WebGL context; đổi ván còn đúng một canvas.

Tùy chọn UI lưu riêng (`nation-ui-preferences-v1`), không vào save gameplay. Đổi luật có trạng thái lưu mới thì tăng schema; không chuyển ván cũ.

## Lệnh phát triển

```bash
npm install
npm run dev            # 127.0.0.1:3010, strictPort
npm test               # node:test qua tsx
npm run typecheck
npm run lint           # ESLint (flat config), npm run lint:fix để tự sửa
npm run format         # Prettier; npm run format:check để kiểm tra
npm run build          # tsc + vite build vào dist/
npm run preview        # bản build ở 3010
npm run check          # format:check + lint + typecheck + test + build
npm run selfplay -- random 1 medium 5 160   # map, số AI, độ khó, số ván, giới hạn lượt
```

`npm run selfplay` in mỗi ván một dòng JSON (lượt kết thúc, người thắng, lượt giao chiến đầu, lượt chiếm thành đầu, lượt cuối số thành thay đổi, vàng tồn, quân chết…) và một dòng tổng kết. Số lượt mô phỏng không phải thời gian người chơi.

## Trang kiểm tra trực quan

Chạy dev ở cổng khác để không đụng ván lưu trên 3010, ví dụ `npx vite --port 3012`.

| Trang | Dùng để |
| --- | --- |
| `/tests/tactics.html` | Xem AI bộ chơi qua các scenario dùng trong `tests/tactics.test.ts` |
| `/tests/naval.html` | Xem AI vận tải/hộ tống qua scenario hải quân |
| `/tests/v2/showcase.html` | Gallery 23 quân, 14 công trình, cảnh 60 quân; đo FPS/hoạt ảnh |
| `/tests/v2/play.html` | Fixture đủ công nghệ/tài nguyên để thử tuyển/xây/đi–đánh/chiếm (ghi đè save của origin) |

Chi tiết ở [tests/v2/README.md](../tests/v2/README.md). Ảnh chụp và trace cục bộ để trong `artifacts/` (bị Git bỏ qua).

## Quy tắc duy trì

- [AGENTS.md](../AGENTS.md) áp dụng cho mọi agent: không tự stage/commit; được tự chạy lint/format/test/build.
- Sửa luật ở engine/data trước; UI/AI dùng cùng điều kiện, không vá giao diện để vượt luật.
- Đổi luật/cân bằng thì đo lại bằng self-play và scenario liên quan.
- Không thêm dependency, worker hoặc asset nặng khi chưa có lỗi hay số đo cần đến.
