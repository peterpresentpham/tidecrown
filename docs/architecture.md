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
| `src/render/` | `World.ts` (camera, picking, cảnh, hoạt ảnh, vòng đời GPU), `voxel.ts` (lính voxel và hoạt ảnh), `voxelScenery.ts` (cảnh vật voxel), `voxelGrid.ts` (lưới và tạo mesh), `characters.ts` (`Character`, tư thế), `unitModels.ts`, `visualIdentity.ts` (màu/biểu tượng phe) |
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

World render theo nhu cầu, trần ~30 FPS, đứng yên thì không vẽ. Đầy đủ: bóng, DPR tối đa 1,5; Vừa: không bóng, DPR 1; Thấp: bớt trang trí. Bề mặt bản đồ và bộ phận tĩnh được gộp bằng vertex color; lính có xương không gộp, cánh tay máy công thành vẫn là pivot riêng. Ở mức Đầy đủ (không giảm chuyển động) lính đứng yên vẫn thở/đổi thế nên World vẽ liên tục; mức Vừa/Thấp chỉ chạy animation khi có hành động. Dispose phải gỡ timer/listener, nhãn, geometry/material và WebGL context; đổi ván còn đúng một canvas.

Tùy chọn UI lưu riêng (`nation-ui-preferences-v1`), không vào save gameplay. Đổi luật có trạng thái lưu mới thì tăng schema; không chuyển ván cũ.

## Mô hình 3D

Mọi mô hình là voxel, dựng hoàn toàn bằng code lúc chạy; repo không chứa file mô hình nào. Một voxel cạnh 0,075 (một ô 1,9 ≈ 25 voxel). Ô mang giá trị `TEAM` lấy màu phe.

- **Lưới chung** ([voxelGrid.ts](../src/render/voxelGrid.ts)): `Grid` (hộp, khối elip, khoét, ghép) và `meshGrid` chỉ sinh các mặt lộ ra, kèm màu đỉnh. Cảnh vật dùng greedy meshing (gộp mặt cùng màu); lính để mỗi voxel một mặt, sắc độ hơi lệch như tranh voxel vẽ tay.
- **Cảnh vật** ([voxelScenery.ts](../src/render/voxelScenery.ts)): cây thông và cây tán, rừng, bụi, đá, núi (bản đồ độ cao, dải đá, tuyết), đồi, ruộng, mỏ, bãi đá, gỗ, thùng, hàng rào, giếng, nhà, thành cấp 1–3, tường gỗ và đá, tháp, chợ, kho, cối xay, cảng, lò rèn, xưởng gỗ, chuồng ngựa, tàn tích, máy công thành (cần ném có trục quay riêng) và tàu. Tên và giao diện (`has`, `geometry(name, team)`, `anchor`) giữ như thư viện mô hình cũ. Mỗi mô hình được tạo lưới một lần cho mỗi màu phe, World nhận bản sao và dùng chung một vật liệu màu đỉnh, shader sương mù và gộp mesh.
- **Lính** ([voxel.ts](../src/render/voxel.ts)): đầu to, thân, tay, chân, áo choàng là các khối cứng gắn trên khớp; mỗi loại quân có mũ, vũ khí, khiên/cung/nỏ và ngựa voxel riêng. Hoạt ảnh là clip keyframe sinh sẵn (đứng, đi, chém, đâm, bắn cung, bắn nỏ, trúng đòn, ngã, làm việc), chạy qua `Character` ([characters.ts](../src/render/characters.ts)) với một `AnimationMixer` cho người và một cho ngựa. Mảnh lưới dùng chung giữa các lính cùng kiểu và cùng phe (`userData.shared`). Ở mức đồ họa "Đầy đủ" lính dùng bản chi tiết cao: lưới phóng ×2 (voxel 0,0375), gọt cạnh thành khối bo bậc, nướng dải sắc (mặt trên sáng ngả ấm, mặt dưới tối ngả lạnh), thêm găng tay to, giáp vai, ủng cổ gập, vạt áo xòe, ống tên và dây đeo chéo cho lính cung, bao kiếm, áo choàng dài gấu răng cưa, tóc mái, khiên hình giọt nước, khăn che mặt cho kiểm lâm; rồi vẽ thêm mắt có đốm sáng, lông mày, mũi, tai, viền áo, cúc, khóa thắt lưng, cổ ủng, cạnh sáng trên kim loại, đinh tán khiên, dây cương ngựa; lưới được gộp mặt và có bóng khe ở góc khối (AO). Mức "Vừa" và "Thấp" dùng bản thường; đổi mức đồ họa sẽ dựng lại lính.

Xem tất cả ở `/gallery` (quân lính, hoạt ảnh, cảnh quan, thành và công trình) và `/tests/v2/models.html` (mọi mô hình cảnh vật trên một lưới, trục quay màu đỏ).

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
