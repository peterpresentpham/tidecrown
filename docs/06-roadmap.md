# Kế hoạch hoàn thành Nation 1.0

Cập nhật 14/11/2026, sau prototype 0.7.0. **Đây là kế hoạch triển khai duy nhất đang có hiệu lực.** Thay thế lộ trình cũ và các phạm vi MVP mâu thuẫn trong tài liệu 01–05. Đối chiếu yêu cầu và code ở [17 — Kiểm kê hiện trạng](17-implementation-audit.md); cách chơi hiện tại ở [08](08-prototype.md).

## 1. Đích đến và điểm dừng

**Nation 1.0 là một game chiến thuật 3D chơi đơn trên web, theo vòng chơi cốt lõi của Tribal Forts, với cây 45 công nghệ và 23 đơn vị đã xây dựng.** Người chơi bắt đầu từ một thành/một lính, khám phá, chiếm làng, nghiên cứu, phát triển quân đội và đánh bại 1–3 AI. Trận có khai cuộc, chạm trán, giao tranh, công thành và kết quả rõ ràng.

Hoàn thành sáu bước bên dưới và bảng nghiệm thu cuối là **xong bản 1.0**. Sau đó dừng thêm tính năng, chỉ sửa lỗi của phạm vi này. Không coi mọi ý tưởng từng xuất hiện trong chat/tài liệu cũ là điều kiện phát hành. Không tuyên bố sao chép đầy đủ mọi luật không quan sát được của Tribal Forts.

Đây là bản chạy cục bộ tại cổng 3010; tài khoản, backend, phát hành công khai và multiplayer không nằm trong đích này. Không đặt ngày xong hoặc phần trăm tiến độ thiếu căn cứ. Sáu bước là sáu mốc kết quả, không phải cam kết hoàn thành trong sáu lượt chat.

## 2. Phạm vi cố định

| Giữ trong 1.0 | Giới hạn |
| --- | --- |
| Bản đồ 3D ô vuông 33 × 25, camera pan/zoom/xoay | Không quay lại lục giác, không mở rộng kích thước vô hạn |
| Khởi đầu một thành/một lính; kinh tế, tuyển/xây/nâng thành | Giữ bốn tài nguyên hiện có; không thêm hệ kinh tế mới |
| Sương mù, khám phá, bản đồ theo mã, Dễ/Vừa/Khó, 1–3 AI | AI dùng thông tin quan sát và luật giống người chơi |
| 45 công nghệ, bảy nhánh, toàn bộ có thể học trong cùng một ván | Không thêm hoặc cắt nút để đẩy phạm vi; chỉnh điều kiện/chỉ số nếu có bằng chứng cần sửa |
| 23 đơn vị và hành động đã có, công thành, tàu/vận tải/đổ bộ | Hoàn thiện vai trò hiện có; không thêm chủng quân mới |
| Màu phe rõ, HUD gọn, màu trạng thái công nghệ, mũi tên và đường mở công nghệ | Không thiết kế lại toàn bộ UI sau mỗi bước |
| Thắng bằng loại hết đối thủ, thua khi mất thành cuối, lưu/tiếp tục/ván mới | Không thêm điều kiện thắng khác |
| Mô hình tự tạo, hoạt ảnh đi/đánh/hỗ trợ nhẹ, giảm chuyển động | Không thay toàn bộ bằng asset nặng hoặc làm lại phong cách đồ họa |

Toàn cây mở được **không có nghĩa phải học hết 45 nút mới thắng**, hoặc mọi ván ngắn đều phải học hết. Người chơi có thể đào sâu một hướng và vẫn tiếp tục các hướng khác trong ván dài; không có khóa loại trừ.

Đang phát triển: được đổi dữ liệu và yêu cầu ván mới. Không dành công cho chuyển ván cũ qua các luật mới. Lưu/đọc đúng ván của cùng bản phát hành vẫn là yêu cầu.

## 3. Hiện đang ở đâu

- **Đã có trong code:** toàn bộ vòng lệnh cơ bản, công thành, kinh tế/xây dựng, 45 công nghệ, 23 đơn vị, kỹ năng đơn vị, hoạt ảnh nhẹ, tàu/vận tải, fog, bản đồ ngẫu nhiên, thiết lập ván, lưu và thắng/thua.
- **Cây công nghệ/UI vừa yêu cầu:** đã làm xong ở mức chức năng; không mở một đợt thiết kế lại nữa nếu không có lỗi cụ thể.
- **Chưa nghiệm thu chất lượng trận:** gặp địch đủ sớm, AI phối hợp, vai trò quân xuất hiện trong ván thật, cân bằng và thời gian chờ.
- **Mốc kiểm tra ngày 14/11:** 91/91 kiểm thử tự động đạt sau phần Codex bước 1 (mốc kiểm kê trước đó: 82). Đây là bằng chứng luật đang được kiểm tra, không phải bằng chứng AI hay hoặc game đã cân bằng.
- **Cập nhật bước 1:** đã triển khai phần map/AI khám phá, trung vị gặp địch Vừa/1 AI ở lượt 6, 30/30 seed gặp trước/hết lượt 14. Chi tiết và giới hạn ở [19](19-step1-pace-and-exploration.md). Phần UI phát lượt nhanh chờ Claude và đo sau ghép.

## 4. Sáu bước còn lại, làm theo thứ tự

### Bước 1 — Gặp đối thủ sớm và chờ lượt ít hơn

**Đầu ra:** một khai cuộc có mở rộng an toàn ban đầu rồi chạm trán, thay vì khám phá mãi không thấy AI.

1. Thêm bài đo chiến dịch tái lập bằng mã: lượt chiếm làng đầu, lượt thấy quân đối phương đầu tiên, lượt đánh quân đầu tiên, số lệnh và thời gian xử lý AI. Phân biệt đánh làng trống với giao chiến quân thật.
2. Chỉnh vị trí xuất phát, hành lang mở rộng và cách trinh sát chọn hướng. Giữ bản đồ rộng và sương mù; không lộ tọa độ đối thủ cho AI/người chơi.
3. Rút thời gian xử lý những hành động AI ngoài tầm nhìn; hành động đang thấy vẫn đủ hoạt ảnh để hiểu. Có chế độ lượt AI nhanh, dùng cùng luật.

**Nghiệm thu:**

- Vừa/1 AI, bộ cố định 30 mã `pace-00` đến `pace-29`, cùng một kịch bản người chơi mở rộng vào trong bản đồ (chiếm làng gần nhất, nghiên cứu/tuyển trinh sát khi đủ và tiếp tục khám phá).
- Đích thiết kế: trung vị thấy quân đối phương ở lượt 6–10; ít nhất 27/30 mã thấy đối phương không muộn hơn lượt 14. Không dùng riêng một seed thuận lợi để báo đạt.
- Không lộ đối thủ ngay lúc bắt đầu; làng đầu vẫn có thể chiếm trong hai lượt theo bài kiểm tra hiện có. Không giảm kích thước map để đạt chỉ tiêu.
- Kiểm tra thêm 10 mã cho mỗi cấu hình 2 và 3 AI; không có phe bị kẹt, sinh chồng hoặc không có hướng mở rộng.
- Đo riêng thời gian tính lệnh và thời gian chờ hoạt ảnh. Mục tiêu chế độ nhanh: toàn vòng ba AI không quá 5 giây trong scenario chuẩn 10 quân/AI trên máy desktop thử, ghi rõ máy/trình duyệt; không gọi đây là bảo đảm cho mọi thiết bị.

Các khoảng lượt trên là **mục tiêu sẽ kiểm chứng**, chưa phải số đo hiện tại. Nếu không đạt thì sửa đúng bố trí/khám phá/chờ lượt, không thêm tính năng khác để bù.

### Bước 2 — AI phối hợp đội quân trên bộ

**Đầu ra:** AI hành động theo mục tiêu chung của một nhóm, thay cho từng quân lần lượt đuổi mục tiêu gần nhất.

1. Chọn mục tiêu nhóm: mở rộng, phòng thủ thành bị đe dọa hoặc công thành; có điều kiện đổi mục tiêu để tránh đi qua đi lại.
2. Bố trí bộ binh giữ tuyến, cung/nỏ đứng phía sau hoặc giữ cự ly; tập trung kết liễu mục tiêu phù hợp, tránh đòn tự sát khi có phương án hợp lệ tốt hơn; quân bị thương biết rút/hỗ trợ.
3. Máy công thành có hộ tống và quân chiếm thành đi cùng; tuyển quân/cơ sở/nghiên cứu theo đội hình còn thiếu và ngân sách, không tiêu hết tiền cho một danh sách nghiên cứu cố định.

**Nghiệm thu:** sáu scenario cố định — cung sau bộ binh; tập trung hỏa lực; máy có hộ tống; bảo vệ thành; chống kỵ; rút/chữa quân bị thương. Mỗi scenario có kết quả kiểm chứng bằng lệnh/vị trí/HP, không chỉ nhìn tên hàm AI. Có kiểm tra chống lặp lệnh, giới hạn thời gian, tính hợp lệ và không đọc sương mù. Chạy 30 vòng với cả 1/2/3 AI mà không treo hoặc tạo lệnh sai. Dễ/Vừa/Khó khác chính sách; không thêm tài nguyên, sát thương hoặc tầm nhìn gian lận.

Không yêu cầu AI tối ưu toàn cục, học máy hoặc đội hình cứng hình học. Sáu tình huống này là giới hạn công việc của bước.

### Bước 3 — Hoàn tất nội dung đã có, đặc biệt hải quân

**Đầu ra:** các nhánh hiện có có chỗ dùng thật; không phải thêm công nghệ/đơn vị mới.

1. Đối chiếu ma trận 45 công nghệ/23 đơn vị: mở đúng nội dung, đủ cơ sở/chi phí, tác dụng, khắc chế, hoạt ảnh, lưu/đọc và hành vi AI. Phần đã đạt giữ nguyên; chỉ làm ô còn thiếu.
2. Bổ sung **một kiểu bản đồ ngẫu nhiên có vùng đất bị nước chia cắt**, chọn trong thiết lập ván, để có tình huống cảng/vận tải/đổ bộ thật. Giữ kiểu đất liền hiện tại. Không triển khai bộ sinh 3–5 quần đảo phức tạp của ý tưởng cũ.
3. Hoàn thiện AI vận tải có quân chiếm đất, chọn bãi hợp lệ, chiến hạm hộ tống và tránh đưa tàu rỗng đi lòng vòng. Công binh/Paladin và các hành động còn thiếu được kiểm tra theo ma trận, không thiết kế thêm kỹ năng.

**Nghiệm thu:** 45 nút có thể nghiên cứu hết trong cùng một ván kiểm thử; 23 quân tuyển và dùng được với mô hình hiện có. Scenario người chơi đổ bộ chiếm làng và scenario AI đổ bộ có hộ tống đều thành công. Tàu chìm/công binh bắc cầu/đổ bộ không tạo quân hoặc lối đi bất hợp lệ. Bản đồ có nước kiểm tra khả năng tiếp cận mục tiêu bằng đường đất hoặc vận tải và có bãi lên/xuống hợp lệ cho 1–3 AI. Kiểu đất liền tiếp tục đạt bài đo bước 1.

### Bước 4 — Cân bằng một ván từ đầu tới cuối

**Đầu ra:** bộ giá, thu nhập, duy trì, thời gian nghiên cứu và sức mạnh quân đủ dùng cho bản 1.0.

1. Đo và chỉnh ba hướng mở đầu bằng nội dung sẵn có: mở rộng/trinh sát, kinh tế rồi quân, quân sớm gây sức ép. Không tạo thêm nhánh để giải quyết vấn đề cân bằng.
2. Đo thời điểm mở quân trung/cuối trận, công thành và quá trình kết thúc ván; tránh phải học công nghệ không liên quan hoặc dọn từng ô quá lâu. Xử lý bằng tham số/AI của luật hiện có.

**Nghiệm thu:** ít nhất 6 ván Vừa hoàn chỉnh có nhật ký (3 hướng mở đầu × 2 mã), cộng scenario áp lực ở Khó, ghi thắng/thua, lượt chạm trán, công nghệ chính, quân chủ lực và thời lượng. Mỗi hướng mở đầu có ít nhất một ván thắng Vừa trên seed thử; không coi đó là bằng chứng cân bằng thống kê. Mỗi hướng có một ván chứng minh học được quân chuyên sâu trước khi ván kết thúc. Mục tiêu trải nghiệm là ván Vừa khoảng 25–40 phút, trung vị trong khoảng này; ghi cả ván lệch và nguyên nhân, không dùng thời gian mô phỏng tự động thay thời gian người chơi. Tất cả 45 nút có tác dụng và dùng được trong scenario vai trò; không bắt 6 ván này phải mua tất cả công nghệ.

### Bước 5 — Hoàn thiện khả năng đọc trận và hiệu năng

**Đầu ra:** hoàn thiện bản đang có; không làm lại toàn bộ mỹ thuật.

1. Sửa các điểm không đọc được trong tuyển quân, điều kiện công trình, duy trì, preview, chỉ số và hoạt ảnh giao chiến. Giữ màu phe, màu nghiên cứu đã mở và đường điều kiện; quản lý chỉ phủ màn hình khi người chơi chủ động mở.
2. Đo cảnh đông quân/đánh liên tục; giảm cấu hình nặng và thêm tùy chọn đồ họa thấp nếu cần. Giữ giảm chuyển động; kiểm tra mở/đóng màn nghiên cứu và đổi ván không làm tăng tài nguyên đồ họa liên tục.

**Nghiệm thu:** kiểm tra trình duyệt ba luồng: khám phá/chiếm làng; nghiên cứu/tuyển; giao chiến/kết lượt. Có một phiên người dùng chơi thử theo bài thao tác 10 phút, không cần giải thích ngoài game, nhận ra quân mình, điều kiện còn thiếu và nguyên nhân sát thương/chiếm thành. Ghi nhận phản hồi cụ thể, không suy từ kiểm thử tự động rằng người chơi đã hiểu. Desktop 1280×720 và 1440×900 không che nút quan trọng; nghiên cứu/bảng quản lý không tràn mất thao tác ở 390×844. Đây không phải cam kết điều khiển cảm ứng đầy đủ.

Ghi một máy desktop và một thiết bị yếu hơn cùng trình duyệt, cấu hình, FPS/độ trễ và vấn đề. Mục tiêu cảnh đang chuyển động trung vị từ 30 FPS ở cấu hình phù hợp, không treo hoặc chặn thao tác trong scenario 60 quân tổng. Chưa có thiết bị thứ hai hoặc phiên người dùng chơi thử thì ghi **chưa nghiệm thu phần tương ứng**, không tự đánh dấu đạt. Khi đo không đạt, ưu tiên giảm tải hơn thêm hiệu ứng.

Âm thanh, bộ asset hoàn toàn mới và hiệu ứng trang trí nâng cao để sau 1.0; chúng không tiếp tục kéo dài bước này.

### Bước 6 — Nghiệm thu và đóng bản 1.0

**Đầu ra:** một bản build cố định và báo cáo kiểm tra cuối. Không thêm hệ thống gameplay trong bước này.

1. Chạy lại toàn bộ kiểm thử và build; chạy bộ seed, scenario và chơi từ màn thiết lập tới thắng/thua. Kiểm tra tải lại giữa ván và bắt đầu lại.
2. Sửa lỗi chặn ván, sai luật, lộ sương mù, mất lưu và thao tác quan trọng không dùng được; cập nhật tài liệu hiện hành và ghi giới hạn còn lại.

**Chỉ đánh dấu 1.0 hoàn thành khi toàn bộ bảng sau đạt:**

| Điều kiện | Bằng chứng phải lưu |
| --- | --- |
| Bước 1–5 đã qua nghiệm thu | Báo cáo từng bước với seed, cấu hình và kết quả |
| Chơi từ thiết lập tới thắng, thua, rồi ván mới | Kịch bản/screenshot hoặc nhật ký chơi |
| 1/2/3 AI và cả ba độ khó hoạt động | Ma trận kiểm tra, không chỉ một ván Vừa/1 AI |
| Lưu/đọc cùng phiên bản không mất lượt, tài nguyên, quân hay nghiên cứu | Test round-trip và thử tải lại trình duyệt |
| Toàn bộ kiểm thử luật, fog, AI, 45 công nghệ/23 đơn vị đạt | Kết quả npm test; số test có thể tăng |
| Production build chạy được tại cổng 3010 | npm run build và smoke test npm run preview |
| Không còn lỗi chặn ván/sai kết quả/lộ thông tin ẩn hoặc lỗi thao tác quan trọng đã biết | Danh sách lỗi đã đóng và giới hạn được ghi rõ |

Đạt bảng này là kết thúc phạm vi bản đầu. Không chờ mọi seed, mọi thiết bị và mọi chiến thuật trở nên hoàn hảo. Không đánh dấu hoàn thành chỉ vì build xanh hoặc gần hết thời gian làm.

## 5. Việc chủ động để sau 1.0

Tiếp viện/phong tỏa hậu cần; ba thành mục tiêu và đổi thủ đô; ngoại giao; multiplayer; chiến dịch; phe có cơ chế riêng; công nghệ loại trừ; thời tiết; thuốc súng/phép thuật/anh hùng; trình sửa bản đồ; thêm quân/công nghệ; asset thay toàn bộ; âm thanh; cảm ứng đầy đủ; backend/cloud save; deploy công khai. Không tự kéo các mục này trở lại trong bước 1–6.

Riêng khả năng đi biển, chở quân và đổ bộ **thuộc 1.0**, vì đã có quân/công nghệ tương ứng; không đánh đồng chúng với hệ tiếp viện/phong tỏa chưa làm.

## 6. Cách theo dõi để không làm mãi

| Mốc | Trạng thái khi lập kế hoạch |
| --- | --- |
| 0. Rà code, yêu cầu và chốt phạm vi/tài liệu | Đã thực hiện ngày 14/11/2026 |
| 1. Nhịp khai cuộc và thời gian chờ | Đạt phần Codex: map/AI khám phá/bộ đo; chờ UI nhanh của Claude và benchmark sau ghép, xem 19 |
| 2. AI phối hợp trên bộ | Chưa đạt; đang có AI cơ bản |
| 3. Nội dung hiện có và hải quân dùng thực tế | Một phần đã có; còn bản đồ nước và AI vận tải |
| 4. Cân bằng ván hoàn chỉnh | Chưa có bộ playtest nghiệm thu |
| 5. UX và hiệu năng | Một phần đã có; chưa nghiệm thu theo ma trận |
| 6. Đóng bản 1.0 | Chưa bắt đầu |

Mỗi lần triển khai ghi: **đang ở bước nào, đầu ra đã xong, tiêu chí nào còn thiếu, kết quả kiểm tra, bước tiếp theo**. Một bước hoàn thành khi có bằng chứng nghiệm thu, không phải khi thêm đủ tên tính năng. Yêu cầu mới được ghi riêng và nêu rõ có đổi phạm vi 1.0 không; không âm thầm mở rộng danh sách việc.

Các chỉ tiêu số ở đây là mục tiêu thiết kế/kiểm tra đề xuất cho bản đầu, chưa phải kết quả đã đạt. Nếu phải điều chỉnh sau đo đạc, ghi lý do và thay đổi tiêu chí công khai trước khi nghiệm thu; không hạ chỉ tiêu âm thầm để gọi là xong.
