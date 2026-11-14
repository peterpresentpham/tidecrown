# Kiến trúc và hướng dẫn phát triển

Cập nhật theo code hiện tại ngày 14/11/2026. Game chơi đơn phía client: TypeScript, React, Vite, Three.js; phiên bản thư viện ở [package.json](../package.json). Không có backend, tài khoản hoặc hệ chống gian lận multiplayer.

## Ranh giới thư mục

| Nơi | Trách nhiệm |
| --- | --- |
| `src/game/engine.ts` | State, Command, thực thi, di chuyển, chiến đấu, kinh tế, công trình, lượt và kết quả |
| `src/game/map.ts`, `waterMap.ts` | Sinh map có seed, thiết lập ván, kết nối và bố trí xuất phát |
| `src/game/visibility.ts` | Tầm nhìn, ký ức địa hình/thành, observation riêng theo phe |
| `src/game/research.ts` | Trạng thái nghiên cứu dùng chung UI và engine |
| `src/data/` | 45 công nghệ, 23 quân, công trình/cải tạo, tham số cân bằng |
| `src/ai/` | Điều phối lệnh, khám phá, mục tiêu/đội hình bộ, ngân sách và hải quân |
| `src/render/World.ts`, `unitModels.ts` | Camera, picking, cảnh, mô hình, event/hoạt ảnh và vòng đời GPU |
| `src/ui/` | HUD, thiết lập, quản lý thành/quân, cây nghiên cứu, tùy chọn và phát lượt AI |
| `src/persistence/save.ts` | Parse/validate save schema 7, đọc localStorage và bảo vệ dữ liệu lỗi |
| `tests/`, `scripts/` | Test luật, scenario, replay, bộ đo và kiểm tra UI/hiệu năng |

## Luồng lệnh và thông tin ẩn

UI hoặc AI gửi `Command` → `execute` kiểm tra → trạng thái mới và `ActionEvent` → UI đồng bộ → World phát hoạt ảnh. Kết quả được tính trước hoạt ảnh; tốc độ trình bày không làm thay đổi state. Các hàm `previewAttack`, `researchStatus`, lý do tuyển/xây/sửa/nâng được dùng lại để UI và engine không có hai bộ luật.

`State` giữ settings, phe/lượt/vòng, tiles/cities/units, resources, technologies/research, knowledge riêng mỗi phe, event/serial, logs và winner. Bản đồ là lưới vuông với `q,r`, không phải axial lục giác. Sương mù dùng `observe`; AI không được dựa vào raw state để quyết định quân/thành/địa hình ẩn. Thay đổi dữ liệu ẩn không được đổi quyết định khi observation giữ nguyên.

`nextAICommand` và `nextFactionCommand` điều phối các lớp `tactics`, `naval`, `development`, `exploration`. Mọi lệnh trả về vẫn phải qua engine; AI trả đúng chi phí, không được thêm tiền, tầm nhìn hoặc sức mạnh. Các heuristic không phải thuật toán tối ưu toàn cục.

## Phát lượt, đồ họa và cleanup

`playbackPolicy.ts` dùng chung thời lượng: bình thường 0,8 s; Nhanh với AI 0,42 s; giảm chuyển động 0,16 s. AI Nhanh đợi 60 ms sau hành động thấy được và 16 ms ngoài tầm nhìn. UI chờ `onVisualEnd` cùng watchdog. `aiTurnStep.ts` bỏ callback từ snapshot cũ; reset ván phải reset ID hoạt ảnh. Tab ẩn tạm dừng lịch phát, không lộ event ẩn.

World render theo nhu cầu, trần khoảng 30 FPS; khi đứng yên không vẽ liên tục. Đầy đủ DPR tối đa 1,5; Thấp DPR 1, bỏ bóng và giảm trang trí. Phần cứng cùng vật liệu được gộp; chân, bánh, vũ khí và buồm vẫn chuyển động riêng. Hover không tính lại toàn bộ preview. Dispose phải bỏ timer/listener, nhãn, geometry/material và WebGL context. Đổi ván phải còn đúng một canvas.

Tùy chọn UI có khóa riêng, không đưa vào luật/save gameplay. Bản phát hành hiện dùng localStorage, không dùng IndexedDB hoặc migration schema cũ. Kiểm tra dữ liệu save thuộc cùng phiên bản vẫn bắt buộc.

## Chạy và kiểm tra

```bash
npm install
npm run dev       # 127.0.0.1:3010, strictPort
npm test
npm run build
npm run preview   # production 3010
```

| Bài đo | Lệnh / trang quan sát |
| --- | --- |
| Nhịp khai cuộc | `node --import tsx scripts/measure-pace.ts --output artifacts/pace-after-1ai.json` |
| AI bộ | `node --import tsx scripts/measure-tactics.ts`; `/tests/tactics.html` |
| Hải quân | `node --import tsx scripts/measure-navy.ts`; `/tests/naval.html` |
| Cân bằng | `node --import tsx scripts/measure-balance.ts final`; `/tests/balance.html` |
| Mô hình/hành động | `/tests/visual.html` |
| Hiệu năng/UI | `node --import tsx tests/perf/prepare-baseline.ts`; dev cổng 3012, `/tests/perf/bench.html`, `/tests/perf/load.html` |

Các fixture không phải gameplay production. Trang nạp fixture bước 5 chỉ dùng origin 3012 để tránh ghi đè ván trên 3010. Traces, baseline renderer và ảnh trong `artifacts/` là sản phẩm cục bộ có thể tái tạo; summary JSON/CSV cần giữ ở `docs/measurements/`. Chi tiết phương pháp/máy đo và hạn chế ở [reports/](reports/).

## Quy tắc duy trì

- [AGENTS.md](../AGENTS.md) áp dụng cho mọi agent: không tự stage, commit hoặc tạo commit gián tiếp.
- [roadmap.md](roadmap.md) quyết định phạm vi/điểm dừng; [proposals/](proposals/) không tự tạo yêu cầu triển khai.
- Sửa luật ở engine/data trước; UI/AI dùng cùng điều kiện, không vá riêng giao diện để vượt luật.
- Khi đổi luật/cân bằng, đo lại scenario liên quan; không dùng trace của luật cũ để chứng minh bản mới đạt.
- Không thêm dependency, worker, asset nặng hoặc thiết kế lại toàn bộ renderer chỉ để đáp ứng mục tưởng tượng; làm theo lỗi và số đo.
