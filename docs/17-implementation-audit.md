# Kiểm kê yêu cầu và hiện trạng triển khai

Ngày 14/11/2026. Đọc lịch sử trao đổi trong chat hiện tại, các tài liệu thiết kế 01–16 và đối chiếu các phần mô phỏng, bản đồ, AI, giao diện, render, lưu ván và kiểm thử. Báo cáo này phân biệt **có code**, **đã kiểm tra luật** và **đã nghiệm thu trải nghiệm**. Kế hoạch có hiệu lực ở [06 — Hoàn thành 1.0](06-roadmap.md).

## 1. Những quyết định trong trao đổi cần giữ

| Yêu cầu/điều chỉnh của người dùng | Kết luận hiện hành |
| --- | --- |
| Ưu tiên làm theo Tribal Forts trước, sau khi prototype khó hiểu và nhàm chán | Bám vòng một thành/một lính → khám phá → chiếm làng → phát triển → chiến tranh. Chưa có căn cứ gọi là bản sao đầy đủ mọi luật game gốc |
| Quân mình không rõ, map nhỏ, nhiều chữ và drawer che cảnh | Giữ màu/phù hiệu rõ, bản đồ rộng, HUD gọn; không quay lại dashboard thường trực |
| Thiết lập Vừa/1 AI nhưng lâu không gặp địch | Cần đo thời điểm chạm trán và sửa bố trí/khám phá, không giải quyết bằng lộ sương mù |
| Cây công nghệ phải phong phú hơn, không rút gọn | Giữ 45 công nghệ và 23 đơn vị đã xây; ưu tiên làm chúng hữu ích thay vì tăng số lượng tiếp |
| Mọi nhánh mở được trong cùng ván | Không khóa loại trừ; không ép người chơi mua hết cây để thắng |
| Mỗi đơn vị có hoạt ảnh đi/đánh nhẹ | Có mô hình và event hành động; giữ yêu cầu ít tải, không làm hoạt ảnh nặng |
| Điều kiện logic; công nghệ có thể học sáng hơn, đã học có màu riêng | Dữ liệu hiện tại ở 16; xanh sáng sẵn sàng, xanh dương hoàn tất, vàng đang học, nhãn giải thích điều kiện |
| Có đường nối và chọn công nghệ phải nổi bật chuỗi cần học | Đã có 57 cạnh điều kiện, highlight toàn bộ tổ tiên AND và chế độ xem riêng đường mở |
| Đang phát triển, có thể bỏ ván cũ và bắt đầu lại | Không thêm chuyển ván cũ chỉ để giữ tương thích; cùng bản vẫn phải lưu/đọc đúng |
| Cải thiện AI phối hợp và gặp đối thủ sớm | Đã yêu cầu; đợt triển khai mới chưa bắt đầu trước khi người dùng dừng để lập lại kế hoạch |
| Cần biết khi nào xong | Chốt phạm vi 1.0 và sáu bước có tiêu chí đóng, tách hẳn backlog khỏi điều kiện phát hành |

## 2. Kiểm kê theo code thực tế

| Hệ thống | Nguồn chính | Đã có | Phần chưa được chứng minh/hoàn thiện |
| --- | --- | --- | --- |
| Luật và vòng lượt | src/game/engine.ts | Lệnh hợp lệ, di chuyển, tấn công/phản kích, công sự/chiếm thành, kinh tế, kỹ năng, loại phe và kết quả | Chưa có báo cáo chơi trọn ván/cân bằng theo ma trận phát hành |
| Bản đồ | src/game/map.ts | 825 ô vuông, seed, 1–3 AI, làng đầu, kết nối đất và kiểm tra nhiều seed | Là đất liền có biển bao quanh; chưa có kiểu vùng đất bị nước chia cắt để khai thác vận tải |
| Thông tin ẩn | src/game/visibility.ts | Tầm nhìn độc lập, nhớ địa hình/thành, không giữ quân địch cũ; observation cho AI | Không cần thay cơ chế để sửa nhịp trận; phải giữ kiểm tra không gian lận |
| Công nghệ | src/data/technologies.ts; src/game/research.ts | 45 nút, 7 nhánh, mọi nhánh có thể học, điều kiện đã rà logic; trạng thái chung engine/UI | Giá/thời gian theo bậc còn là bộ tham số khởi đầu, chưa qua playtest cân bằng |
| Quân và công trình | src/data/units.ts; src/data/buildings.ts | 23 đơn vị, cơ sở, giá/duy trì, kỹ năng, nâng loại; kinh tế/phòng thủ/cải tạo | Chưa có bằng chứng mọi vai trò đều được dùng hợp lý trong chiến dịch AI thực tế |
| AI | src/ai/ai.ts | Chỉ đọc observation; tìm mục tiêu/khám phá, tuyển, nghiên cứu, xây, dùng kỹ năng và tàu ở mức cơ bản | Chưa có mục tiêu nhóm, cơ chế giữ đội hình/hộ tống đáng tin cậy hoặc bộ đo chạm trán |
| Giao diện | src/ui/App.tsx; CityPanel.tsx; UnitActions.tsx; NewGameSetup.tsx | HUD gọn, hướng dẫn ngắn, chọn quân/thành, thiết lập, preview và kết quả | Cần kiểm tra luồng người mới và độ rõ khi đông quân; chưa có tùy chọn lượt AI nhanh riêng |
| Cây công nghệ trên UI | src/ui/ResearchPanel.tsx; ResearchConnections.tsx; researchGraph.ts | Tìm kiếm không dấu, lọc, màu trạng thái, điều kiện bấm được, mũi tên, highlight chuỗi và xem riêng đường | Chức năng mới đã kiểm tra; chỉ sửa lỗi cụ thể, không coi là cần xây lại |
| Đồ họa | src/render/World.ts; unitModels.ts | Mô hình low-poly tự tạo, đi/vung/bắn/đạn/trúng/phản kích/chữa/sửa, giảm chuyển động, render theo nhu cầu | Chưa benchmark hai cấu hình; chưa có tùy chọn đồ họa thấp hay âm thanh |
| Lưu ván | src/persistence/save.ts | Schema 7, kiểm tra dữ liệu, tự lưu/tải, backup khi dữ liệu lỗi | Không chuyển schema cũ theo quyết định phát triển; cần smoke test bản phát hành cùng schema |
| Kiểm thử | tests/*.test.ts; tests/visual.html | Luật, nhiều seed, AI hợp lệ/fog, đầy đủ công nghệ/quân và đường nối; fixture hình ảnh | Chưa có bộ benchmark nhịp trận, scenario chiến thuật AI và biên bản playtest/hiệu năng |

Ngày kiểm kê chạy lại `npm test`: **82 bài đạt, 0 lỗi, 0 bỏ qua**. Không sửa code gameplay trong lượt lập kế hoạch này. Build và QA UI thành công ở đợt đường nghiên cứu trước; lần kiểm kê này không dùng kết quả đó để suy ra game đã cân bằng hoặc đạt hiệu năng đa thiết bị.

## 3. Phát hiện cụ thể cần dẫn dắt các bước sau

### Bố trí và khám phá

Bản đồ mới hiện đặt hai thủ phủ quanh (-9,5) và (9,-5), có lệch theo seed/lật trục. Lính chùy khởi đầu có một bước; trinh sát ba bước nhưng còn phải nghiên cứu và tuyển. AI chọn frontier theo tỷ lệ chi phí đường đi/lượng ô chưa biết; không có ưu tiên gặp nhau có chủ đích. Đây là các yếu tố có thể kéo dài khai cuộc. **Chưa có số đo trung vị lượt gặp địch**, nên bước 1 phải đo trước khi chọn thông số mới.

### Quyết định AI

`plan` xử lý quân theo thứ tự mảng; mỗi quân tìm mục tiêu và đường đi riêng. Chưa có kế hoạch chung như “bộ binh giữ vị trí, cung bắn, máy đi cùng”. Chọn tuyển quân dựa nhiều vào loại đã có, lượt chẵn/lẻ và mục tiêu thành, chưa đánh giá đủ đội hình đối phương. Xây kinh tế/nghiên cứu nằm trước nhiều lệnh tuyển trong chuỗi ưu tiên, có nguy cơ tranh ngân sách quân đội; cần đo chứ không kết luận mọi ván đều cạn quân.

Không cần thay toàn bộ engine hay dùng AI học máy. Cần lớp đánh giá chiến trường/mục tiêu nhóm và giới hạn hành vi rõ, vẫn dùng các command và preview hiện có.

### Thời gian chờ

UI chờ khoảng 190 ms giữa quyết định AI; sự kiện người chơi quan sát được chờ khoảng 850 ms hoạt ảnh (180 ms khi giảm chuyển động). Nếu sự kiện không hiện trong observation, UI bỏ trạng thái chờ hoạt ảnh. Vì vậy không được viết kế hoạch theo giả định “mọi lệnh trong sương mù đều chờ 850 ms”. Phải đo riêng tính toán, delay lệnh và hoạt ảnh đang thấy; tăng tốc không đổi kết quả game và không tiết lộ sự kiện ẩn.

### Hải quân và mức độ hoàn thiện

Tàu vận tải/đổ bộ, bốn loại tàu và kỹ năng liên quan đã có luật/test/mô hình. Phần thiếu là địa hình chiến dịch phù hợp và AI dùng thành một cuộc đổ bộ có mục đích. Không ghi nhầm “chưa làm hải quân” rồi triển khai lại phần đã xong.

## 4. Vì sao kế hoạch cũ khiến phạm vi không có điểm kết thúc

Tài liệu 01–06 ban đầu đề xuất lục giác, 12 công nghệ, 8 quân/tàu, ba tài nguyên, quần đảo, mạng tiếp viện và ba mục tiêu. Sau phản hồi, 09 chuyển sang làm theo giao diện/vòng chơi Tribal Forts. Sau đó 13–16 mở rộng theo yêu cầu thành 45 công nghệ, 23 quân và đồ thị mới. Các mục cũ chưa được rút khỏi danh sách “còn phải làm”, nên câu trả lời tiến độ lẫn việc bắt buộc và ý tưởng để sau.

Kế hoạch mới giữ yêu cầu người dùng đã chốt, không lấy tiếp viện/phong tỏa/ba mục tiêu từ bản ý tưởng đầu để tự kéo dài 1.0. Âm thanh và thay toàn bộ asset cũng không phải điều kiện kết thúc. Còn hải quân và vận tải cần hoàn thiện vì đã nằm trong nội dung hiện có.

## 5. Thứ tự tài liệu khi có khác biệt

1. Yêu cầu mới nhất của người dùng trong chat.
2. **06**: phạm vi, thứ tự làm và điểm dừng 1.0.
3. **08, 03, 14, 16**: hiện trạng/công nghệ/vai trò quân, có đối chiếu code.
4. **17**: ảnh chụp kiểm kê tại ngày lập kế hoạch, không tự cập nhật khi code thay đổi.
5. Các tài liệu khác: lịch sử, nghiên cứu hoặc backlog; không tự tạo nghĩa vụ thêm tính năng.

Sai khác giữa tài liệu và code phải được ghi rõ và sửa ở đúng tài liệu đang có hiệu lực. Không dùng một đoạn cũ để phủ quyết quyết định mới trong chat.
