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
| `src/render/` | `World.ts` (camera, picking, cảnh, hoạt ảnh, vòng đời GPU), `characters.ts` (lính có xương và animation), `unitModels.ts`, `modelLibrary.ts` (mô hình tĩnh), `visualIdentity.ts` (màu/biểu tượng phe) |
| `src/ui/` | HUD, thiết lập, thành/quân, cây công nghệ, tùy chọn, phát lượt AI |
| `src/persistence/save.ts` | Parse/validate save schema 8, localStorage, bảo vệ dữ liệu lỗi |
| `tests/` | Test luật/AI/UI logic (`*.test.ts`), helper scenario, trang kiểm tra trực quan |
| `scripts/selfplay.ts` | Máy tự chơi nhiều ván để đo nhịp và khả năng kết thúc |
| `scripts/models/` | Nướng mô hình tĩnh CC0 thành `models.bin`; đóng gói nhân vật thành `assets/units/*.glb` |

## Luồng lệnh và thông tin ẩn

UI hoặc AI gửi `Command` → `execute` kiểm tra và trả state mới cùng `ActionEvent` → UI đồng bộ → `World` phát hoạt ảnh. Kết quả tính trước hoạt ảnh; tốc độ trình bày không đổi state. `previewAttack`, `researchStatus` và các hàm lý do tuyển/xây/sửa/nâng được dùng chung để UI và engine không có hai bộ luật.

`State` giữ settings, phe/lượt/vòng, tiles/cities/units, tài nguyên, công nghệ/nghiên cứu, knowledge riêng mỗi phe, event/serial, logs và winner. Bản đồ là lưới vuông `q,r`. AI chỉ quyết định trên `observe(state, phe)`; đổi dữ liệu ẩn không được đổi quyết định khi observation giữ nguyên. Mọi lệnh AI vẫn qua engine, trả đúng chi phí.

`State.events` là hàng đợi có giới hạn (ví dụ nhiều phát bắn thành trong một lệnh); mỗi event được lọc trong `observe`. Tóm tắt lượt AI giữ tối đa 12 sự kiện đã quan sát. Lệnh UI đang chờ và hoàn tác là tạm thời, không lưu qua reload.

## Phát lượt và đồ họa

`playbackPolicy.ts` giữ thời lượng chung: bình thường 0,8 s; AI Nhanh 0,42 s; giảm chuyển động 0,16 s. UI chờ `onVisualEnd` kèm watchdog; `aiTurnStep.ts` bỏ callback của snapshot cũ. Tab ẩn tạm dừng lịch phát.

World render theo nhu cầu, trần ~30 FPS, đứng yên thì không vẽ. Đầy đủ: bóng, DPR tối đa 1,5; Vừa: không bóng, DPR 1; Thấp: bớt trang trí. Bề mặt bản đồ và bộ phận tĩnh được gộp bằng vertex color; lính có xương không gộp, cánh tay máy công thành vẫn là pivot riêng. Ở mức Đầy đủ (không giảm chuyển động) lính đứng yên vẫn thở/đổi thế nên World vẽ liên tục; mức Vừa/Thấp chỉ chạy animation khi có hành động. Dispose phải gỡ timer/listener, nhãn, geometry/material và WebGL context; đổi ván còn đúng một canvas.

Tùy chọn UI lưu riêng (`nation-ui-preferences-v1`), không vào save gameplay. Đổi luật có trạng thái lưu mới thì tăng schema; không chuyển ván cũ.

## Mô hình 3D

Hai loại mô hình, đều CC0:

- **Tĩnh** (cây, núi, đồi, đá, nhà, thành, tường, cải tạo, máy công thành, tàu): "nướng" vào [`src/render/assets/models.bin`](../src/render/assets/models.bin) (~2 MB) và nạp một lần ([modelLibrary.ts](../src/render/modelLibrary.ts)). Texture bảng màu thành màu đỉnh nên mọi mô hình dùng chung một vật liệu, shader sương mù và gộp mesh. Vật liệu `Main` (cờ, mái) được tô màu phe lúc chạy; nhà chính của thành không có `Main` nên có thêm lá cờ phe.
- **Nhân vật** (mọi quân bộ và kỵ): các file GLB nhỏ trong [`src/render/assets/units/`](../src/render/assets/units/) (~8,7 MB), nạp lười qua [characterAssets.ts](../src/render/characterAssets.ts). [characters.ts](../src/render/characters.ts) ghép thân trang phục + đầu + tóc (gắn lại vào xương trang phục), mũ/giáp vai, vũ khí trên xương tay, ngựa nếu có; mỗi lính một `AnimationMixer`. Tư thế: đứng, đi, đánh, trúng đòn, chết, làm việc (sửa/chữa trị). Màu phe nằm ở kênh alpha của texture trang phục (vải xanh của Ranger, áo sáng của Peasant) và mặt khiên.

Khi chưa nạp xong hoặc lỗi, World chỉ vẽ đĩa màu phe/nhãn rồi tự dựng lại khi mô hình sẵn sàng.

| Nguồn | Dùng cho | Giấy phép |
| --- | --- | --- |
| [Quaternius Ultimate Fantasy RTS](https://quaternius.com) | Nhà chính, nhà, chợ, kho, tháp, cối xay, tường, cảng, mỏ, ruộng, rừng, núi | CC0 |
| [Quaternius Ultimate Nature](https://quaternius.com), [Medieval Village](https://quaternius.com) | Cây lẻ, bụi, đá; lò rèn, xưởng gỗ, chuồng ngựa, giếng, hàng rào | CC0 |
| [Quaternius Modular Character Outfits – Fantasy](https://quaternius.itch.io/modular-character-outfits-fantasy), [Universal Base Characters](https://quaternius.itch.io/universal-base-characters), [Universal Animation Library](https://quaternius.itch.io/universal-animation-library) | Thân lính (Ranger, Peasant), đầu, tóc, animation | CC0 |
| [Quaternius Animated Knight](https://quaternius.com), [Medieval Weapons](https://quaternius.com) | Mũ, giáp vai; kiếm, giáo, rìu, búa, cung, khiên | CC0 |
| [Quaternius Ultimate Animated Animals](https://quaternius.com), Ships | Ngựa nâu/trắng; thuyền buồm, thuyền Viking, tàu ba cột | CC0 |
| [Kenney Castle Kit](https://kenney.nl/assets/castle-kit) | Ballista, catapult, trebuchet | CC0 |

Đổi mô hình: tải các gói vào một thư mục theo bố cục ghi đầu [build.ts](../scripts/models/build.ts) (`rts/`, `nature/`, `village/`, `extra/`) và [characters.ts](../scripts/models/characters.ts) (`characters/{outfits,ubc,ual}`, `extra/`, `weapons/`, `knight/`), rồi chạy `npm run models -- <thư-mục>` (mô hình tĩnh) hoặc `npm run characters -- <thư-mục>` (nhân vật). Xem kết quả ở `/gallery` và `/tests/v2/models.html`. `node --import tsx scripts/models/inspect.ts <file>` in mesh, xương và animation của một file nguồn. Gói nguồn không lưu trong repo.

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
| `/gallery` | Quân, hoạt ảnh (đi/đánh/phản kích/chết/hỗ trợ), cảnh quan, thành theo cấp và công trình |
| `/tests/v2/models.html` | Mọi mô hình tĩnh đã nướng trên lưới ô; `?filter=town`, `?team=%23eb4646` |
| `/tests/v2/play.html` | Fixture đủ công nghệ/tài nguyên để thử tuyển/xây/đi–đánh/chiếm (ghi đè save của origin) |

Chi tiết ở [tests/v2/README.md](../tests/v2/README.md). Ảnh chụp và trace cục bộ để trong `artifacts/` (bị Git bỏ qua).

## Quy tắc duy trì

- [AGENTS.md](../AGENTS.md) áp dụng cho mọi agent: không tự stage/commit; được tự chạy lint/format/test/build.
- Sửa luật ở engine/data trước; UI/AI dùng cùng điều kiện, không vá giao diện để vượt luật.
- Đổi luật/cân bằng thì đo lại bằng self-play và scenario liên quan.
- Không thêm dependency, worker hoặc asset nặng khi chưa có lỗi hay số đo cần đến.
