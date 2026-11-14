# Nation — tài liệu thiết kế game

Tên làm việc: **Vương Quốc Eo Biển**. Game chiến thuật 3D theo lượt trên web. Ưu tiên hiện tại là làm theo vòng chơi và bố cục cơ bản của Tribal Forts: một thành, một lính, khám phá bản đồ, chiếm làng và phát triển quân đội. Cây nghiên cứu có 45 công nghệ, được rà lại điều kiện theo vật liệu và kỹ năng của từng nhánh.

Trạng thái: prototype 0.7.0 có 45 công nghệ, 23 đơn vị và hoạt ảnh đi/đánh nhẹ, ngày 14/11/2026. Cây công nghệ đang chạy được mô tả trong tài liệu 03 và 16; phạm vi đang chạy được ghi trong [hướng dẫn prototype](docs/08-prototype.md). Mọi chỉ số là giả thuyết cần kiểm thử.

## Chạy prototype

Yêu cầu Node.js 22.12+ hoặc Node.js 24/26 và npm.

```bash
npm install
npm run dev
```

Mở `http://127.0.0.1:3010/`. Cả dev và preview mặc định dùng cổng 3010; nếu cổng đang được sử dụng, lệnh sẽ báo lỗi thay vì tự chuyển cổng.

```bash
npm test       # kiểm tra luật chơi và AI
npm run build # kiểm tra TypeScript và tạo bản production trong dist/
npm run preview # xem bản production sau khi build
```

Chưa có ván lưu: chọn độ khó, 1–3 AI và mã bản đồ, rồi bấm **Bắt đầu ván**. Có ván lưu: tiếp tục ngay; **Menu → Ván mới** để mở thiết lập.

Quân **xanh lam, phù hiệu BẠN** là quân của mình, được chọn sẵn khi vào game. Tiến tới gần vùng đen để khám phá địa hình và làng mới; vùng tối là nơi đã đi qua nhưng không còn tầm nhìn. Click ô xanh để đi; click làng hoặc quân địch viền đỏ để chiếm/đánh trực tiếp. Chọn nhãn thành để tuyển quân hoặc nâng cấp. Bấm **Kết lượt** để chuyển lượt cho AI. Bản đồ chiếm toàn màn hình; kéo chuột trái/phải để khám phá, cuộn để zoom.

## Mục lục

| Tài liệu | Nội dung |
| --- | --- |
| [01 — Ý tưởng ban đầu](docs/01-vision.md) | Lịch sử thiết kế, không còn là phạm vi 1.0 |
| [02 — Luật dự kiến ban đầu](docs/02-gameplay.md) | Lịch sử luật; hiện trạng ở 08, phạm vi ở 06 |
| [03 — Cây công nghệ](docs/03-technology-tree.md) | 45 công nghệ, 7 nhánh, điều kiện và không khóa loại trừ |
| [04 — Ý tưởng đồ họa và giao diện](docs/04-art-and-ux.md) | Thiết kế ban đầu; checklist hiện hành ở 06 |
| [05 — Kiến trúc dự kiến ban đầu](docs/05-technical-design.md) | Hướng kiến trúc; hiện trạng đối chiếu ở 17 |
| [06 — Kế hoạch hoàn thành 1.0](docs/06-roadmap.md) | Phạm vi cố định, sáu bước còn lại và tiêu chí kết thúc |
| [07 — Nghiên cứu tham khảo](docs/07-reference-research.md) | Nguồn, ảnh Tribal Forts và giới hạn xác nhận |
| [08 — Prototype hiện tại](docs/08-prototype.md) | Phạm vi đã làm, cách thử và những phần chưa triển khai |
| [09 — Làm theo Tribal Forts](docs/09-reference-baseline.md) | Cơ sở đối chiếu giao diện và vòng chơi |
| [10 — Kinh tế và nghiên cứu](docs/10-economy-and-research.md) | Lịch sử kinh tế/cây chín nút trước 0.6.0 |
| [11 — Sương mù và khám phá](docs/11-fog-and-exploration.md) | Tầm nhìn, nhớ bản đồ, AI khám phá và chuyển ván lưu cũ |
| [12 — Bản đồ và thiết lập ván](docs/12-random-map-and-match-setup.md) | Sinh bản đồ theo mã, độ khó, 1–3 AI và thứ tự lượt |
| [13 — Thiết kế lại công nghệ](docs/13-technology-redesign.md) | Thiết kế 45 công nghệ, 7 nhánh, không khóa loại trừ |
| [14 — Danh mục đơn vị mới](docs/14-unit-roster-redesign.md) | 23 đơn vị, vai trò và khắc chế |
| [15 — Công nghệ, đơn vị và hoạt ảnh](docs/15-implemented-technology-and-animation.md) | Phạm vi chạy 0.6.0, hành động, giá, lưu ván và tối ưu đồ họa |
| [16 — Rà soát công nghệ và giao diện](docs/16-technology-audit-and-ui.md) | Điều kiện hiện hành, nguồn tham khảo, trạng thái sáng và schema 7 |
| [17 — Kiểm kê hiện trạng](docs/17-implementation-audit.md) | Đối chiếu yêu cầu/code, phần đã có và chưa nghiệm thu |
| [18 — Giao việc Claude](docs/18-claude-ui-performance-handoff.md) | Ranh giới UI/render, phát lượt nhanh và bàn giao worktree |
| [19 — Bước 1: nhịp trận và khám phá](docs/19-step1-pace-and-exploration.md) | Kết quả đo trước/sau, AI khám phá và trạng thái nghiệm thu |

Bản 0.7.0 dùng luật và schema mới: bắt đầu ván mới, không chuyển ván 0.6.x.

## Kế hoạch đang có hiệu lực

**Đọc [06 — Kế hoạch hoàn thành 1.0](docs/06-roadmap.md) trước.** Đích là bản chơi đơn hoàn chỉnh theo vòng chơi Tribal Forts, giữ 45 công nghệ và 23 đơn vị hiện có. Còn sáu bước: nhịp trận → AI phối hợp → hoàn thiện nội dung/hải quân → cân bằng → UX/hiệu năng → nghiệm thu 1.0. Mỗi bước có đầu ra và điều kiện đóng; không tự thêm hệ thống mới.

[17 — Kiểm kê](docs/17-implementation-audit.md) ghi rõ code đang có và việc chưa được kiểm chứng. **08, 03, 14 và 16** mô tả cách chơi/công nghệ/quân hiện tại. Các ý tưởng cũ như tiếp viện, phong tỏa và ba mục tiêu không thuộc điều kiện hoàn thành 1.0. Khi có khác biệt, yêu cầu mới nhất trong chat được ưu tiên.

Mốc kiểm kê ban đầu 14/11/2026 có 82 kiểm thử; sau phần Codex bước 1 có 91/91 kiểm thử đạt; vòng chơi và nội dung cơ bản đã có, chưa nghiệm thu chất lượng AI, cân bằng và hiệu năng theo kế hoạch mới. Phần Codex của bước 1 đã triển khai: 30/30 seed Vừa/1 AI gặp quân địch trước/hết lượt 14, trung vị lượt 6. Đối chứng đứng yên trung vị giảm từ 13 xuống 11; chưa bảo đảm mọi seed. Còn chờ UI phát lượt nhanh của Claude để nghiệm thu thời gian cả vòng AI. Xem báo cáo 19.
