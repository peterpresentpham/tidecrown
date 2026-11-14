# Nation — Vương Quốc Eo Biển

Game chiến thuật 3D theo lượt trên web: một thành/một lính → khám phá → chiếm làng → nghiên cứu/phát triển → chiến tranh với 1–3 AI. Có 45 công nghệ, 23 đơn vị, hai kiểu bản đồ, sương mù, vận tải/đổ bộ và lưu ván cục bộ.

## Chạy game

Yêu cầu Node.js 22.12+ và npm.

```bash
npm install
npm run dev
```

Mở `http://127.0.0.1:3010/`. Cổng bận thì báo lỗi, không tự đổi cổng.

Chưa có save: chọn độ khó, 1–3 AI, Đất liền/Hai bờ biển và mã bản đồ. Có save: tiếp tục ngay; **Menu → Ván mới** để tạo ván khác. Quân lam/phù hiệu **BẠN** là của mình; click ô xanh để đi, mục tiêu đỏ để đánh/chiếm, chọn thành để tuyển/xây, rồi **Kết lượt**. Kéo nền để pan, cuộn để zoom, Q/E xoay.

## Phát triển

```bash
npm test               # test luật, AI và logic UI
npm run lint           # ESLint; npm run lint:fix để tự sửa
npm run format         # Prettier
npm run typecheck
npm run build          # bản production vào dist/; xem bằng npm run preview
npm run check          # chạy tất cả các bước trên
npm run selfplay       # máy tự chơi nhiều ván để đo nhịp trận
```

Chi tiết module, công cụ đo và trang kiểm tra trực quan ở [kiến trúc](docs/architecture.md). Quy tắc làm việc cho agent và Git ở [AGENTS.md](AGENTS.md); người dùng tự commit.

## Tài liệu

- [Lộ trình](docs/roadmap.md): hiện trạng, vấn đề đã biết, việc tiếp theo
- [Cách chơi và luật](docs/gameplay.md)
- [Công nghệ](docs/technology.md) · [Đơn vị](docs/units.md)
- [Mục lục tài liệu](docs/README.md)

Save dùng schema 8 và không chuyển save cũ. Phạm vi hiện tại chạy cục bộ, không gồm backend, multiplayer hoặc phát hành công khai.
