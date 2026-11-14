# Hướng triển khai theo Tribal Forts

Ngày 13/11/2026, người dùng yêu cầu ưu tiên sao chép trải nghiệm cơ bản của Tribal Forts trước khi cải tiến hoặc thêm tính năng. Quyết định này thay thế ưu tiên sản phẩm trong các tài liệu 01–06; các ý tưởng nâng cao ở đó là backlog, không phải yêu cầu mở rộng hiện tại.

## Cập nhật về phạm vi

Sau mốc này, người dùng đã cho phép cải tiến cây công nghệ và yêu cầu tiếp tục phần kinh tế/nghiên cứu. Phạm vi hiện tại ở [06 — Kế hoạch 1.0](06-roadmap.md), bản đang chạy ở [08](08-prototype.md); nhận định tạm dừng công nghệ bên dưới là lịch sử của mốc 0.2.0.

## Điều quan sát được

[Trang nhà phát triển](https://bmm-soft.com/) mô tả khởi đầu với một thành và một chiến binh, mở rộng lãnh thổ trong game chiến thuật theo lượt. Bộ ảnh chính thức cho thấy chiến trường chiếm phần lớn màn hình, tài nguyên ở trên và chỉ số quân ở dưới.

- [Ảnh chiến trường đầu ván](https://bmm-soft.com/images/tf_scr1.jpg): một quân lớn, vùng đi sáng quanh đơn vị, HUD gọn sát mép màn hình.
- [Ảnh quản lý thành](https://bmm-soft.com/images/tf_scr3.jpg): nâng cấp và mua quân trong bảng chỉ mở khi quản lý thành.
- [Ảnh chiến trường nhiều phe](https://bmm-soft.com/images/tf_scr5.jpg): địa hình ô vuông, cờ/màu phe và ranh giới lãnh thổ.

Ảnh không xác nhận được thuật toán chiến đấu, tất cả quan hệ mở khóa hoặc chính xác cách click từng lệnh. Bộ ảnh được đăng cùng trang ghi phiên bản 1.0.8; không mặc định là UI mới nhất.

## Vấn đề của bản trước và cách sửa

| Vấn đề người dùng phản hồi | Thay đổi đã làm |
| --- | --- |
| Không biết đâu là quân mình | Màu xanh lam bão hòa, phù hiệu BẠN, đế quân xanh; địch đỏ và phù hiệu ĐỊCH |
| Lính quá nhỏ | Một nhân vật lớn thay cho cụm ba người nhỏ |
| Bản đồ bé | 217 ô lục giác đổi thành 825 ô vuông; có khoảng trống để mở rộng |
| Camera thu nhỏ chiến trường | Mở đầu ở gần quân mình, dùng pan để khám phá thay vì ép toàn bộ map vừa màn hình |
| Drawer/dashboard che cảnh | Xóa sidebar, thanh menu trái và mục tiêu nhiều chữ mặc định |
| Quá nhiều popup | Di chuyển/đánh/chiếm/kết lượt trực tiếp, preview chỉ là một dòng sát đáy |
| Khai cuộc quá nhiều loại quân | Một thành và một lính; tuyển thêm khi người chơi cần |
| Chiếm làng cần công thành ngay | Làng trung lập ban đầu trống, không công sự; quân cận chiến chiếm trực tiếp |
| Tuyển quân có nhiều bước | Mua một lần, tự đặt ở ô hợp lệ gần thành |

## Giới hạn của việc làm theo mẫu

Giữ mô hình và mã nguồn tự tạo. Thực hiện lại cấu trúc tương tác và hình ảnh quan sát được; không tuyên bố đã clone đầy đủ game gốc. Trong bước này không thêm cây công nghệ, tiếp viện, hải quân, multiplayer, quest hay cơ chế cải tiến riêng.

## Tiêu chí ưu tiên

Một người mới vào game phải nhìn ngay thấy quân mình, có thể chọn ô để đi và hiểu cách chiếm làng đầu tiên. Bản đồ giữ trọn màn hình trong toàn bộ vòng chơi; thao tác thông thường không mở popup. Chỉ mở thông tin quản lý khi người chơi chủ động chọn thành hoặc mở menu.
