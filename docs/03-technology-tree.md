# Cây công nghệ đang chạy — 0.7.0

**45 công nghệ, 7 nhánh, 23 đơn vị. Toàn bộ công nghệ đều có thể mở trong cùng một ván.** Không còn cặp khóa Thâm canh/Khai hoang hoặc Bộ binh nặng/Xạ thủ như bản chín nút cũ.

| Nhánh | Số nút | Nội dung |
| --- | --- | --- |
| E — Lương thực/hạ tầng | 8 | Nông nghiệp, kho lương, thâm canh, tưới, chăn nuôi, ngựa, chợ, đường |
| M — Tài nguyên/luyện kim | 8 | Gỗ, rừng, cơ khí, mỏ, đá, kim loại, sắt, thép |
| I — Bộ binh | 5 | Khiên, giáo, kiếm, thương dài, giáp nặng |
| R — Bắn xa | 4 | Cung, kiểm lâm, nỏ, ngắm bắn |
| C — Trinh sát/kỵ binh | 6 | Trinh sát, kỵ nhẹ, kỵ xạ, kỵ sĩ, thiết kỵ, Paladin |
| S — Công thành/phòng thủ | 8 | Xưởng, ballista, catapult, hậu cần, trebuchet, tường, tháp, công binh |
| N — Hàng hải | 6 | Cảng, vận tải, buồm, chiến hạm, chiến hạm nặng, đổ bộ |

Mọi điều kiện đi vào một nút là AND. Các đường rẽ đều nghiên cứu tiếp được. Giới hạn một nghiên cứu đang chạy chỉ tạo thứ tự ưu tiên, không khóa nội dung.

Toàn bộ tên/mã/điều kiện theo [16 — Rà soát cây và giao diện](16-technology-audit-and-ui.md), vai trò quân theo [14 — Danh mục đơn vị](14-unit-roster-redesign.md). Thông số, hành động, cơ sở tuyển, lưu ván và giới hạn thực tế ở [15 — Bản triển khai](15-implemented-technology-and-animation.md). Nguồn dữ liệu chạy là `src/data/technologies.ts`, `src/data/units.ts` và `src/data/buildings.ts`.
