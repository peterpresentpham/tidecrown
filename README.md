# Nation — Vương Quốc Eo Biển

Game chiến thuật 3D theo lượt trên trình duyệt. Bắt đầu với một thành và một lính, khám phá bản đồ, chiếm làng, nghiên cứu công nghệ, xây quân và đánh bại 1–3 AI.

TypeScript · React · Vite · Three.js. Chạy hoàn toàn phía client, ván lưu trong localStorage.

## Chạy dev

Cần Node.js 22.12+.

```bash
npm install
npm run dev      # http://127.0.0.1:3010
```

| Lệnh                        | Việc                                     |
| --------------------------- | ---------------------------------------- |
| `npm test`                  | Chạy test                                |
| `npm run lint` / `lint:fix` | ESLint                                   |
| `npm run format`            | Prettier                                 |
| `npm run typecheck`         | Kiểm tra kiểu                            |
| `npm run build` / `preview` | Build production vào `dist/` và xem thử  |
| `npm run check`             | Chạy tất cả các bước trên                |
| `npm run selfplay`          | Cho AI tự chơi nhiều ván để đo nhịp trận |

Tài liệu chi tiết ở [docs/](docs/README.md).
