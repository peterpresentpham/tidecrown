# Bước 4 — Nhịp trận và ba hướng mở đầu

Ngày 14/11/2026, repo nation gốc. Không stage/commit. Đã triển khai tham số, AI và bộ mô phỏng; **chưa nghiệm thu thời lượng chơi thật 25–40 phút**. Người dùng chọn làm code và mô phỏng trước.

## Những thay đổi có trong game

| Tham số | Trước | Hiện tại | Lý do |
| --- | --- | --- | --- |
| Vàng công nghệ cấp 3 / 4 | 24 / 40 | 18 / 30 | Giảm khoảng chờ giữa quân cơ bản và quân chuyên sâu |
| Gỗ công nghệ công thành/hải quân cấp 3–4 | 8 | 6 | Giảm cạnh tranh giữa học công nghệ, cơ sở và mua quân |
| Nông trại: gỗ | 10 | 8 | Mở đầu kinh tế có thể ổn định duy trì sớm hơn |
| Xưởng gỗ: gỗ | 8 | 6 | Giảm cảnh cần gỗ nhưng không đủ gỗ mở nguồn thu |
| Xưởng công thành: gỗ | 18 | 14 | Giảm bước chờ trước chiếc máy đầu tiên |
| Catapult: gỗ | 25 | 20 | Công thành dùng được trong ván thường |
| Sửa thành | +5 công sự | +2 công sự | Catapult phá 6 không còn chỉ tiến được 1 điểm/lượt khi bị sửa liên tục |
| Thương dài, bộ giáp nặng, nỏ, catapult, trebuchet: bước | 1 | 2 | Có thể vào rừng/đồi tốn 2 bước; bớt mắc kẹt và hành quân kéo dài |
| Trần quân mục tiêu AI Vừa / Khó | 10 / 16 | 8 / 12 | Phân biệt áp lực vừa và khó, giảm lượng tiếp viện phải diệt liên tục |

Giá khác, thu nhập cơ bản, chỉ số đánh/giáp/HP, duy trì và thời gian nghiên cứu 1/2/3 lượt giữ nguyên. Mọi phe dùng cùng giá/chỉ số/luật. Trần trên là mục tiêu tuyển của AI, không phải giới hạn tuyển của người chơi. Dễ vẫn 6 quân. Máy vẫn phải đứng yên để bắn; trebuchet vẫn cần triển khai. Rừng vẫn tốn 2 bước, kiểm lâm vẫn có lợi thế 1 bước. Lính chùy vẫn 1 bước và dùng đường vòng trên cỏ như trước.

AI được chỉnh để dùng ngân sách và ưu thế thực tế:

- Ưu tiên nông trại/gỗ/chợ khi thu nhập thiếu; dùng lương dư nâng cấp thành khi vàng là nút nghẽn, giữ lại ít nhất 18 lương dự phòng và chỉ làm khi lương ròng dương.
- Không xây lặp cơ sở tại các thành khác chỉ vì đang đợi tiền tuyển. Với chuỗi lò rèn → rèn sắt → thép, tiếp tục thành đã đầu tư nhiều nhất; nếu nó đã xây trong lượt thì chờ. Cơ sở tàu chỉ chọn thành ven biển.
- Khi đã có đội quân cơ bản, dành tiền cho công nghệ vai trò còn thiếu thay vì mua mãi quân thay thế rẻ. Tường lớn có thể khiến AI chuẩn bị thêm máy và hướng trebuchet.
- Nâng trang bị quân khỏe ở thành khi đủ điều kiện và chưa có địch trong bốn ô; trả đúng chi phí, giữ thương tổn, dùng hành động. Giữ vai trò trinh sát.
- Không tiếp tục mua lại trinh sát mãi khi đã qua khai cuộc và biết thành đối phương.
- Đánh giá tương quan hỗ trợ gần nhau khi tiến quân. Đường đi đã khảo sát được phép vòng tránh vật cản dù những bước đầu xa mục tiêu hơn; vẫn kiểm tra nguy hiểm và hộ tống máy. Không đọc quân hoặc địa hình ẩn.

Đã sửa thêm lỗi chuỗi công trình: tháp canh kế thừa tường, giữ trần 40 công sự và save hợp lệ; không xây tường/tháp lặp vô hạn vì mất điều kiện tường. Có test hồi quy riêng.

Không thêm công nghệ, đơn vị, kỹ năng hoặc hệ thống kết thúc ván mới. Không ép thắng sau một mốc lượt; thắng/thua vẫn bằng chiếm thành theo luật thật.

## Ba hướng được đo

Bộ điều khiển người chơi nằm riêng trong `tests/helpers/balanceCampaign.ts`, không tự chơi thay người dùng trong sản phẩm. Tác chiến dùng cùng bộ lập kế hoạch quan sát được của AI, phát triển dùng ba chính sách khác nhau, không xét tên seed hoặc kết quả để chọn lệnh.

- **Mở rộng/trinh sát:** ưu tiên Trinh sát và hai đội trinh sát trong năm lượt đầu; sau đó khiên/cung, kiểm lâm và máy công thành.
- **Kinh tế rồi quân:** ưu tiên Chế biến gỗ/Nông nghiệp, một xưởng gỗ và nông trại trong năm lượt đầu, vẫn có trinh sát; chuyển sang giáp nặng, hạ tầng luyện kim và máy.
- **Quân sớm:** tuyển thêm quân cận chiến và học Khiên trận trước, rồi cung/nỏ, máy và tiếp viện.

Giữa/cuối trận dùng chung: bảo đảm lương/gỗ/vàng, giữ quân chiếm đất và tuyến bắn; có quân chuyên sâu, cơ sở cần thiết, hai máy công thành (ba khi đã biết thành có tường lớn), rồi tiếp viện/nâng máy. Bộ điều khiển dùng tối đa 14 đơn vị trả tiền, trong khi luật người chơi không áp trần này. Nêu rõ khác biệt này để không coi kết quả thắng là bằng chứng AI và người chơi cân sức tuyệt đối. Không cấp tài nguyên, công nghệ, quân, tầm nhìn hay làm yếu đối thủ riêng cho bài đo.

## Kết quả ván hoàn chỉnh

Hai seed cố định `balance-01`, `balance-02`, bản đồ Đất liền, Vừa/1 AI; thêm Khó/1 AI với `balance-pressure`. Tóm tắt công nghệ, quân đã ra trận và kết quả ở [bản đo máy đọc được](../measurements/step4-final.json); nhật ký lệnh, tài nguyên và snapshot dữ liệu theo vòng ở `artifacts/balance-final/*.json`. Mỗi lệnh dùng `execute`; kiểm tra save hợp lệ sau mỗi kết lượt. Các ván kết thúc tự nhiên theo luật chiếm thành, không xử thắng khi hết thời gian thử.

| Hướng / mức | Mã | Kết quả | Lượt kết thúc | Thấy quân / giao chiến | Công thành đầu (bất kỳ phe) | Học / đưa quân chuyên sâu ra trận | CPU mô phỏng |
| --- | --- | --- | ---: | --- | ---: | --- | ---: |
| Mở rộng/trinh sát / Vừa | balance-01 | Bạn thắng | 60 | 5 / 8 | 37 | Kiểm lâm: 18 / 18 | 11.3 giây |
| Mở rộng/trinh sát / Vừa | balance-02 | Bạn thắng | 58 | 7 / 8 | 35 | Kiểm lâm: 14 / 14 | 8.9 giây |
| Kinh tế rồi quân / Vừa | balance-01 | Bạn thắng | 72 | 6 / 9 | 41 | Bộ giáp nặng: 29 / 31 | 11.4 giây |
| Kinh tế rồi quân / Vừa | balance-02 | Bạn thắng | 67 | 6 / 9 | 44 | Bộ giáp nặng: 27 / 29 | 12.7 giây |
| Quân sớm / Vừa | balance-01 | Bạn thắng | 63 | 6 / 7 | 56 | Nỏ: 26 / 26 | 9.1 giây |
| Quân sớm / Vừa | balance-02 | Bạn thắng | 93 | 6 / 7 | 42 | Nỏ: 29 / 30 | 17.1 giây |
| Quân sớm / Khó | balance-pressure | AI thắng | 111 | 6 / 7 | 43 | Nỏ: 27 / 27 | 27.6 giây |

Trung vị sáu ván Vừa: **65 lượt**. Thời gian CPU trên máy phát triển chỉ dùng kiểm tra mô phỏng có chạy được; không phải thời gian người chơi.

Sáu ván Vừa đều thắng trong bộ điều khiển này. Đây là kiểm tra khả năng thực hiện các chiến lược, **không phải tỷ lệ thắng người chơi, thống kê cân bằng hoặc kết quả chơi bằng tay**. Làng đầu được chiếm ở lượt 2; không có lượt thiếu vàng/lương đầu lượt trong cả hai phe của sáu ván. Mỗi hướng có quân chuyên sâu ra trận trước khi kết thúc, không chỉ học được biểu tượng.

Ván quân sớm `balance-02` kéo dài 93 lượt: giao tranh tuyến giữa, thay quân bị thương, triển khai và tiếp viện máy làm quá trình phá thế giằng co lâu hơn các ván còn lại. Không bỏ ván này khỏi bảng/trung vị. Kịch bản Khó vẫn tạo áp lực và có thể đánh bại cùng bộ điều khiển. Các số lượt này chưa cho biết một người sẽ tốn bao nhiêu phút.

## Đối chiếu tham số trước/sau

Hai seed mở rộng được chạy với cùng bộ điều khiển quan sát được, cùng sửa lỗi tháp/tường, chỉ khôi phục giá, sửa thành, di chuyển và trần quân AI cũ: [kết quả đối chiếu](../measurements/step4-prices-before.json). `balance-01` chưa kết thúc sau 240 lượt, trong khi bộ mới thắng ở 60; `balance-02` thua ở 126 lượt, bộ mới thắng ở 58. Giữ kết quả chạm giới hạn riêng, không gán nó thành một ván hoàn chỉnh hoặc đưa 241 vào trung vị thời gian kết thúc. Không suy đối chiếu hai mã này thành kết luận thống kê về mọi hướng/mọi seed. Có thể tái lập bằng `node --import tsx scripts/measure-balance.ts prices-before`; chế độ này chỉ đo hai mã mở rộng để hạn chế thời gian chạy bộ cũ.

## Kiểm tra và cách xem lại

- `npm test`: **175/175**. Có sáu chiến dịch Vừa hoàn chỉnh (ba test, mỗi test hai seed), yêu cầu mỗi hướng có ván thắng, quân chuyên sâu ra trận, làng đầu lượt 2, không thiếu lương/vàng và save hợp lệ. Giới hạn hồi quy 110 lượt; số này là ngưỡng kiểm thử các seed trên, không phải luật ván hoặc mục tiêu thời gian người chơi.
- `tests/technology-roles.test.ts`: 47 scenario phủ đủ **45 công nghệ**. Tuyển quân thật sau nghiên cứu, công trình có tác dụng, cải tạo tăng thu nhập/di chuyển, gỗ cơ bản, lâm nghiệp, ngắm bắn, triển khai/thu máy, đổ bộ bỏ phạt giáp. Thủy lợi được kiểm tra trong cụm ruộng, không giả định ruộng đơn độc cũng có thưởng mạng lưới.
- `tests/balance.test.ts`: công thành qua sửa liên tục, đơn vị mới đi rừng, đường vòng lúc đầu xa mục tiêu, không lặp xưởng/chuỗi cơ sở, nâng quân trả tiền, nâng thành giữ lương dự phòng. Các test bộ, biển, fog và pace bước 1–3 tiếp tục chạy.
- Trình duyệt 1280 × 720: replay mở rộng/kinh tế/quân sớm khớp kết quả engine; ván 93 lượt phát đủ 2.601 lệnh. Nút phát tới kết quả nhường luồng giữa các đợt 100 lệnh để không chặn tương tác. UI thành hiển thị sửa +2 và giá công trình mới; không có console error trong hai tab kiểm tra. Screenshot cục bộ `artifacts/step4-replay.png`.
- `npm run build`: TypeScript/Vite đạt; cảnh báo bundle >500 kB còn từ trước, chưa coi hiệu năng bước 5 đã đạt.

```bash
node --import tsx scripts/measure-balance.ts final
npm run dev
# Mở http://127.0.0.1:3010/tests/balance.html
```

Trang replay đọc `artifacts/balance-final/*.json`, dựng ván ban đầu và phát lại từng lệnh qua engine hiện hành. Có thể chọn từng lệnh, từng lượt hoặc Tới kết quả. Không sửa localStorage. Traces và screenshot là artifact cục bộ, không stage vào Git; summary JSON trong docs lưu kết quả gọn, script tạo lại toàn bộ traces. Khi đổi luật cần đo lại, không phát lại trace của tham số cũ rồi coi đó là ván mới.

## Phần chưa nghiệm thu

**Chưa đánh dấu toàn bộ bước 4 hoàn tất:** cần người chơi thực hiện các hướng mở đầu và ghi thời lượng/đoạn chờ/độ khó để đối chiếu mục tiêu trung vị 25–40 phút. Người dùng đã chọn làm code và mô phỏng trước. Báo cáo không quy đổi số giây CPU hoặc số lượt thành phút chơi giả định.

Bản đồ nước tiếp tục qua test vận tải và đổ bộ, nhưng sáu ván chiến lược này đo trên Đất liền; chưa có bộ thắng/thua đủ lớn trên nước, 2/3 AI hoặc nhiều seed để kết luận cân bằng toàn cục. Hạ trần quân AI Vừa/Khó và tăng tốc hành quân cần được người chơi đánh giá lại mức khó. Bản đo này được thực hiện trước khi ghép UI nhanh/đồ họa; kết quả tích hợp sau đó ở [bước 5](step5-ui-performance.md).

Bước 5 đã tích hợp và kiểm tra trên máy hiện tại. Tiếp theo là nghiệm thu tổng thể bước 6 và thu phản hồi chơi thật còn thiếu; không thêm quân/công nghệ để giải quyết cân bằng.
