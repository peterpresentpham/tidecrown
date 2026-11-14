> Lịch sử prototype 0.3–0.5. Cây chín nút và khóa loại trừ bên dưới đã được thay trong 0.6.0. Xem [15 — Bản triển khai](15-implemented-technology-and-animation.md) cho luật đang chạy.

# Kinh tế và nghiên cứu đang chạy

Phiên bản 0.3.0. Đây là phần tiếp theo của prototype 3D, nối kinh tế, phát triển làng, nghiên cứu, mở quân và AI thành một vòng chơi. Sau phản hồi của người dùng, cây 22 nút của Tribal Forts được dùng làm tham khảo, còn cây đang chơi được rút thành chín nghiên cứu có tác dụng thực tế. Hải quân và các nút chưa có gameplay không xuất hiện như chức năng mua được.

## Vòng chơi

Một làng và một lính chùy → chiếm thêm làng → chọn nghiên cứu → tuyển đơn vị mới hoặc tăng sản xuất → nâng làng, công thành và thắng đối thủ. Quân mở sẵn duy nhất là lính chùy. Không cần mở hết cây để thắng.

Nghiên cứu dùng vàng, nâng làng dùng lương, vũ khí đánh xa dùng gỗ, máy bắn đá dùng cả đá. Lính duy trì vàng và lương; làng duy trì lương, gỗ và đá. Tuyển quá nhiều quân sẽ làm cạn nguồn lương dành cho nâng làng.

## Nguồn và phần điều chỉnh

| Thông tin | Trạng thái |
| --- | --- |
| Bốn tài nguyên vàng, lương, gỗ, đá | Đọc từ HUD Tribal Forts |
| Lính chùy: 10 HP, 5 công, 1 giáp, 1 bước | Đọc từ ảnh gameplay người dùng gửi |
| Giá lính chùy 8 vàng; giáo 15 vàng + 3 gỗ; cung 12 vàng + 2 gỗ | Đọc từ ảnh quản lý làng trên [BMM-Soft](https://bmm-soft.com/images/tf_scr3.jpg) |
| Ba nghiên cứu cơ bản: 5 vàng, 2 lượt | Đọc từ ảnh cây công nghệ người dùng gửi |
| Nâng làng cấp 1: 50 lương; lợi nhuận cấp 1 +5 vàng | Đọc từ ảnh quản lý làng |
| Duy trì một đơn vị: 1 vàng, 1 lương/lượt | [Website nhà phát triển](https://bmm-soft.com/) |
| Sản xuất cơ bản của mỗi làng và các thông số chưa thấy trong nguồn | Cấu hình cân bằng của prototype, chưa xác nhận giống bản gốc |
| Chín nút, gộp mở quân, học thuyết loại trừ và hiệu ứng mới | Thiết kế cải tiến được người dùng cho phép; không phải cây gốc |
| Một nghiên cứu toàn phe tại một thời điểm, nâng làng tức thì, chi phí cấp 3 | Quy tắc hiện tại của bản này; ảnh không xác nhận đầy đủ luật gốc |

Ảnh cây đầy đủ cho thấy Spearmen nối với Basic Metalworking, không phải Basic Woodworking. Bản đang chạy đã sửa liên kết này. Công thành dùng cả gỗ và luyện kim làm điều kiện. Việc gộp mở máy bắn đá vào nghiên cứu Công thành là chủ ý rút gọn, thay cho hai nút riêng trong bản gốc.

## Kinh tế

Khởi đầu: 20 vàng, 16 lương, 5 gỗ, 12 đá; một làng cấp 1 và một lính chùy. Bảng nguồn thu và duy trì đầu ván:

| Tài nguyên | Sản xuất | Duy trì | Ròng mỗi lượt |
| --- | ---: | ---: | ---: |
| Vàng | 5 | 1 | +4 |
| Lương | 3 | 2 | +1 |
| Gỗ | 1 | 1 | 0 |
| Đá | 3 | 1 | +2 |

Mỗi làng sản xuất 5 × cấp vàng, 3 lương, 1 gỗ, 3 đá trước công nghệ. Mỗi làng trừ 1 lương, 1 gỗ, 1 đá; mỗi quân trừ 1 vàng và 1 lương. Làng mới chiếm giảm nửa sản xuất, làm tròn xuống, trong hai lần thu nhập kế tiếp; chi phí duy trì vẫn trả đủ. Khai hoang xóa thời gian ổn định.

Thu nhập được thu ở đầu lượt phe đó. Nếu vàng hoặc lương thiếu sau thu/duy trì, kho tương ứng được chặn ở 0 và phe đó không tuyển hoặc hồi quân trong lượt ấy. Nghiên cứu giải quyết thiếu lương vẫn được phép nếu đủ vàng. Thiếu gỗ/đá chặn kho ở 0 và giới hạn hành động theo tài nguyên sẵn có, không tự xóa thành hoặc quân.

Cấp 1 → 2 tốn 50 lương, cấp 2 → 3 tốn 100 lương; Thâm canh giảm còn 40/80. Nâng cấp có hiệu lực ngay, thêm 5 vàng/lượt và 10 công sự. Không mở quá cấp 3. Sửa 5 công sự tốn 5 vàng, 5 đá; xây thành mới tốn 45 vàng, 20 lương, 30 gỗ, 15 đá.

Các chuyên môn Chợ/Nông trại/Xưởng của bản cũ được giữ trong mô phỏng để không làm hỏng fixture và dữ liệu cũ, nhưng không còn được giới thiệu trong UI nâng làng hiện tại. Quyết định phát triển tập trung vào nghiên cứu và cấp làng.

## Chín nghiên cứu

| ID | Tên | Điều kiện | Vàng | Lượt | Tác dụng |
| --- | --- | --- | ---: | ---: | --- |
| basic_agriculture | Nông nghiệp | Không | 5 | 2 | +2 lương/làng/lượt |
| advanced_agriculture | Thâm canh | Nông nghiệp | 15 | 3 | +3 lương/làng/lượt; nâng làng rẻ hơn 20% |
| settlement | Khai hoang | Nông nghiệp | 15 | 3 | Làng chiếm được ổn định ngay; làng đang ổn định cũng được kích hoạt |
| basic_metalworking | Luyện kim | Không | 5 | 2 | Mở lính giáo; +1 đá/làng/lượt |
| ironworking | Bộ binh giáp nặng | Luyện kim và Chế biến gỗ | 20 | 3 | +1 giáp cho quân cận chiến |
| marksman | Xạ thủ tinh nhuệ | Luyện kim và Cung thuật | 20 | 3 | Cung thủ +2 công, còn 1 bước/lượt |
| basic_woodworking | Chế biến gỗ | Không | 5 | 2 | +1 gỗ/làng/lượt |
| archery | Cung thuật | Chế biến gỗ | 10 | 2 | Mở cung thủ |
| siege | Công thành | Chế biến gỗ và Luyện kim | 20 | 3 | Mở máy bắn đá |

Hai cặp lựa chọn loại trừ trong cùng ván: **Thâm canh hoặc Khai hoang**, **Bộ binh giáp nặng hoặc Xạ thủ tinh nhuệ**. Điều kiện nhiều nút đều phải hoàn thành. UI ghi rõ hướng nào sẽ bị khóa trước khi người chơi chọn.

Chi phí nghiên cứu được trừ một lần khi bắt đầu. Không hủy/đổi nghiên cứu giữa chừng trong bản này. Sau N lần bắt đầu lượt tiếp theo của chính phe đó, nghiên cứu hoàn thành. Chuyển sang lượt đối thủ không giảm tiến độ. Công nghệ hoàn thành áp dụng toàn phe, bao gồm quân đã có và quân tuyển sau này.

Thu nhập đầu lượt được tính trước khi hoàn thành nghiên cứu; phần tăng sản xuất được thu từ đầu lượt sau nữa. UI dự báo ròng theo số làng/quân hiện có, không đảm bảo số lượng đó còn nguyên lúc hoàn thành. Lương và gỗ hiển thị trước → sau; mở quân, thay đổi chỉ số, giảm chi phí và lựa chọn bị khóa được ghi riêng.

## AI

AI dùng cùng lệnh, điều kiện, chi phí, tiến độ và giới hạn như người chơi. AI ưu tiên nông nghiệp khi ròng lương thấp; sau đó mở vũ khí, chọn học thuyết, cân đối nâng làng và tuyển quân. Không sinh quân hoặc hoàn thành nghiên cứu miễn phí. Số quân có trần để giới hạn prototype; chưa phải AI chiến thuật hoàn chỉnh.

## Lưu ván

Hiện dùng schema 5, khóa `nation-world-v5`, hỗ trợ 1–3 AI và tự chuyển ván cũ theo [tài liệu 12](12-random-map-and-match-setup.md). Bản gốc dùng schema 3; từ phiên bản 0.4.0 dùng schema 4, khóa `nation-fog-v4`, giữ cả công nghệ hoàn thành, nghiên cứu đang chạy và lựa chọn học thuyết. Các khóa cũ vẫn được giữ; ván v3 được chuyển sang sương mù theo [tài liệu 11](11-fog-and-exploration.md). Chọn Ván mới tạo backup của ván hiện tại ở `nation-world-v5-backup`.

Bản lưu được kiểm tra trước khi vào mô phỏng: tài nguyên hợp lệ, không chồng quân, công nghệ có đủ điều kiện, không chứa hai học thuyết loại trừ, tiến độ và trạng thái thành hợp lệ. Dữ liệu lỗi được sao lưu trước khi mở ván mới. Nếu không sao lưu được, tự lưu bị tắt để tránh ghi đè và người chơi được thông báo. Chưa có giao diện khôi phục backup.

## Kiểm tra vòng phát triển

1. Vào ván mới, chỉ lính chùy tuyển được. Chọn Luyện kim: tốn 5 vàng và 2 lượt.
2. Kết lượt hai lần. Lượt 3 mở lính giáo, thu nhập đá từ +2 lên +3/lượt.
3. Tuyển lính giáo: trừ 15 vàng, 3 gỗ; quân chờ lượt sau. Lương ròng giảm do thêm quân.
4. Mở Nông nghiệp; dự báo hiển thị mức ròng lương theo đội quân hiện tại.
5. Sau đó chọn Thâm canh hoặc Khai hoang, hoặc đầu tư Chế biến gỗ/Cung thuật để thay cách đánh.
6. Tải lại trang giữa nghiên cứu để kiểm tra giữ tiến độ và không trả tiền lần nữa.

Hải quân, sinh bản đồ, nhiều AI và các đơn vị còn lại của cây 22 nút chưa thuộc bước này.
