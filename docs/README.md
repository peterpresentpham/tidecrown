# Tài liệu Nation

Game chiến thuật 3D theo lượt trên web, chơi đơn theo vòng chơi Tribal Forts. Cập nhật 14/11/2026. Đọc theo thứ tự: **kế hoạch → luật/cách chơi → nội dung → báo cáo**.

## Tài liệu hiện hành

| Tài liệu | Dùng khi |
| --- | --- |
| [Kế hoạch và nghiệm thu 1.0](roadmap.md) | Xác định phạm vi, tiến độ, việc còn thiếu và điểm dừng |
| [Cách chơi và luật](gameplay.md) | Thiết lập, lượt, kinh tế/xây, fog, chiến đấu, biển và lưu ván |
| [Công nghệ](technology.md) | 45 nút, điều kiện, tác dụng, giá/thời gian và trạng thái UI |
| [Đơn vị](units.md) | 23 loại quân/tàu, vai trò, chỉ số, cơ sở và kỹ năng |
| [Kiến trúc và phát triển](architecture.md) | Module, lệnh, AI, lưu, render và cách chạy bộ đo |
| [Nguồn tham khảo](references.md) | Nguồn Tribal Forts, ảnh và giới hạn những gì đã xác nhận |

## Bằng chứng kiểm tra

Các báo cáo giữ seed, phương pháp, số đo và giới hạn tại từng mốc; **không phải năm kế hoạch triển khai độc lập**. Số test lịch sử không phải kết quả mới nhất. Trạng thái tổng hợp luôn ở [roadmap](roadmap.md).

| Báo cáo | Dữ liệu |
| --- | --- |
| [Bước 1 — Nhịp trận/khám phá](reports/step1-pace.md) | [CSV](measurements/step1-pace.csv) |
| [Bước 2 — AI bộ](reports/step2-army-ai.md) | [JSON](measurements/step2-tactics-summary.json) |
| [Bước 3 — Hải quân](reports/step3-navy.md) | [JSON](measurements/step3-naval-summary.json) |
| [Bước 4 — Cân bằng](reports/step4-balance.md) | [Kết quả](measurements/step4-final.json), [đối chứng giá](measurements/step4-prices-before.json) |
| [Bước 5 — UI/hiệu năng tích hợp](reports/step5-ui-performance.md) | [Benchmark](measurements/step5-integrated-performance.json), [UI QA](measurements/step5-ui-checks.json) |

## Đề xuất sau 1.0

[v2 — Đồ họa và lối chơi](proposals/v2-graphics-and-gameplay.md) giữ nội dung thiết kế mới để xem xét riêng. Đây là đề xuất, chưa phải luật đang chạy hoặc yêu cầu phải hoàn thành 1.0.

## Cách duy trì tài liệu

- Yêu cầu mới nhất của người dùng được ưu tiên. `roadmap.md` là nguồn phạm vi/nghiệm thu; luật và số liệu thực thi nằm trong code.
- Thay đổi hiện hành cập nhật đúng tài liệu chủ đề; không tạo thêm một bản hướng dẫn theo số phiên bản song song.
- Báo cáo ghi rõ lúc đo, cấu hình, seed và điều chưa chứng minh; giữ JSON/CSV để tái lập, không nâng kết quả mô phỏng thành playtest.
- Tài liệu ý tưởng/luật cũ, kiểm kê trước triển khai, giao việc Claude đã xong và báo cáo trước tích hợp trùng lặp đã được gộp hoặc bỏ. Không giữ thêm thư mục archive trong docs. Những nội dung cần dùng đã chuyển vào các tài liệu trên.
