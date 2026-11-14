# Nation — Vương Quốc Eo Biển

Game chiến thuật 3D theo lượt trên web: một thành/một lính → khám phá → chiếm làng → nghiên cứu/phát triển → chiến tranh với 1–3 AI. Có 45 công nghệ, 23 đơn vị, hai kiểu bản đồ, sương mù, vận tải/đổ bộ và lưu ván cục bộ.

## Chạy game

Yêu cầu Node.js 22.12+ hoặc Node.js 24/26 và npm.

```bash
npm install
npm run dev
```

Mở `http://127.0.0.1:3010/`. Dev và preview mặc định dùng cổng 3010; cổng bận sẽ báo lỗi, không tự đổi.

```bash
npm test
npm run build
npm run preview
```

Chưa có save: chọn độ khó, 1–3 AI, Đất liền/Hai bờ biển và mã bản đồ. Có save: tiếp tục ngay; **Menu → Ván mới** để tạo ván khác. Quân lam/phù hiệu **BẠN** là của mình; click ô xanh để đi, mục tiêu đỏ để đánh/chiếm, chọn thành để tuyển/xây, rồi **Kết lượt**. Kéo nền để pan, cuộn zoom, Q/E xoay. Menu có lượt AI Nhanh và đồ họa Thấp.

## Tài liệu và trạng thái

- [Mục lục docs](docs/README.md)
- [Kế hoạch/tiêu chí hoàn thành 1.0](docs/roadmap.md)
- [Luật và cách chơi](docs/gameplay.md)
- [45 công nghệ](docs/technology.md) · [23 đơn vị](docs/units.md)
- [Kiến trúc/cách kiểm tra](docs/architecture.md)

Ngày 14/11/2026: các phần code bước 1–5 đã triển khai; mốc kiểm tra gần nhất **188/188 tests đạt**, build đạt. Tiếp theo là nghiệm thu tổng thể bước 6. Thời lượng chơi thật, phiên người dùng 10 phút và phép đo máy yếu hơn vẫn chờ; chưa đánh dấu 1.0 hoàn tất. [Báo cáo tích hợp](docs/reports/step5-ui-performance.md) ghi số đo và giới hạn.

Bản đang phát triển dùng schema 7, không chuyển save cũ. Cùng phiên bản vẫn phải lưu/đọc đúng. Phạm vi 1.0 chạy cục bộ, không gồm backend, multiplayer hoặc deploy công khai. [Đề xuất v2](docs/proposals/v2-graphics-and-gameplay.md) được giữ riêng để không lẫn với công việc 1.0.

Quy tắc làm việc và Git ở [AGENTS.md](AGENTS.md); người dùng commit thủ công.
