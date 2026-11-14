# Luật gameplay

> Tài liệu ý tưởng ban đầu, có các luật/phạm vi đã thay đổi. Không dùng làm checklist bắt buộc cho bản đầu. Phạm vi và điểm dừng hiện hành ở [06 — Kế hoạch 1.0](06-roadmap.md); bản đang chạy ở [08](08-prototype.md).
Tất cả chi phí và chỉ số trong tài liệu này là giá trị khởi đầu để cân bằng. Mô phỏng phải dùng cấu hình dữ liệu để thay đổi chúng mà không sửa logic.

## Bản đồ và chiến thắng

Bản đồ thử nghiệm có bán kính lục giác 8 ô, gồm đất, biển, bờ biển, rừng, đồi và đường. Núi không đi qua được. Cầu là cạnh nối hai ô đất qua một khe nước; MVP chỉ có cầu sinh sẵn, chưa phá hoặc xây cầu.

Ba trong bảy thành được đánh dấu là thành trọng yếu và luôn hiển thị vị trí trên bản đồ; quân và vùng xung quanh vẫn chịu sương mù. Bố trí mục tiêu phải tránh để một phe sở hữu sẵn cả ba.

Một phe thắng khi kiểm soát cả ba thành trọng yếu qua ba lần bắt đầu lượt liên tiếp của chính mình. Mất bất kỳ mục tiêu nào sẽ đặt bộ đếm về 0. Nếu chỉ còn một phe chưa bị loại, phe đó thắng ngay. Mất thủ đô không loại phe; mất toàn bộ thành sẽ loại phe và xóa quân còn lại. Thành khởi đầu là thủ đô; nếu mất, người chơi chọn một thành đang giữ làm thủ đô mới, có hiệu lực đầu lượt sau.

## Trình tự lượt

Thứ tự phe cố định trong một ván, chọn ngẫu nhiên lúc khởi tạo. Mỗi phe hoàn tất lượt rồi mới chuyển sang phe tiếp theo.

Đầu lượt: tính quyền kiểm soát và tiếp viện → nhận thu nhập, trả duy trì → giảm bộ đếm nghiên cứu, xây dựng và ổn định → hoàn thành tác vụ → hồi phục quân → khôi phục điểm di chuyển và hành động → kiểm tra chiến thắng.

Trong lượt: di chuyển quân, giao chiến, tuyển quân, nâng thành, bắt đầu nghiên cứu. Mọi lệnh có hiệu lực ngay trừ tác vụ có bộ đếm. Cuối lượt: xác nhận kết thúc, lưu trạng thái rồi chuyển phe.

Tác vụ dài N lượt đặt `remainingTurns=N`; giảm một lần ở mỗi đầu lượt kế tiếp của chủ sở hữu. Không hoàn thành ngay trong lượt đặt lệnh.

## Kinh tế và thành

Khởi đầu mỗi phe: 60 vàng, 35 lương, 40 gỗ; một thành cấp 1, một trinh sát, một lính khiên. Thu nhập cơ bản của thành cấp 1: +12 vàng, +8 lương, +5 gỗ mỗi lượt. Cấp 2 cộng thêm +4 vàng, +3 lương, +2 gỗ; cấp 3 cộng thêm đúng lượng đó một lần nữa.

Nâng cấp 2 tốn 35 vàng, 25 gỗ và 2 lượt. Cấp 3 cần công nghệ Pháo đài đá, tốn 60 vàng, 45 gỗ và 3 lượt. Mỗi thành chỉ có một tác vụ xây dựng. Thành bị chiếm hủy tác vụ xây dở, không hoàn tiền.

Mỗi thành có đúng một ô chuyên môn và một vị trí phòng thủ trong MVP. Không có hệ thống bốn ô công trình tự do ở bản đầu.

| Lựa chọn | Chi phí | Tác dụng sau 1 lượt |
| --- | --- | --- |
| Chợ | 20 vàng, 10 gỗ | +6 vàng/lượt |
| Nông trại | 15 vàng, 15 gỗ | +5 lương/lượt |
| Xưởng gỗ | 15 vàng, 10 gỗ | +4 gỗ/lượt |
| Tháp gỗ | 15 vàng, 20 gỗ; cần Công sự gỗ | Người giữ thành có thêm đòn tháp khi bị đánh |

Chỉ chọn một trong ba chuyên môn. Đổi chuyên môn mất công trình cũ, trả đủ chi phí mới. Xây chuyên môn, tháp và nâng cấp dùng chung hàng đợi. Tháp gây 2 sát thương trực tiếp cho quân bộ tấn công thành, một lần mỗi giao chiến, kể cả cung và máy bắn đá.

Mỗi quân bộ duy trì 1 vàng và 1 lương/lượt; mỗi tàu duy trì 2 vàng/lượt. Thu nhập ròng âm trừ vào kho. Nếu sau khấu trừ vàng hoặc lương nhỏ hơn 0, đặt kho tương ứng về 0, chặn tuyển quân và hồi phục trong lượt đó. Không xóa quân tự động. Gỗ không có chi phí duy trì.

Thành mới chiếm bị giảm 50% thu nhập, làm tròn xuống, trong hai lần thu nhập kế tiếp; chưa được tuyển, xây hoặc nghiên cứu tại thành. Bản đồ phải thể hiện rõ trạng thái này.

## Quân đội

Mỗi đơn vị chiếm một ô; không chồng quân. Một ô thành chứa tối đa một quân bộ. Tuyển quân xuất hiện ngay trên thành hoặc một ô đất kề trống do người chơi chọn, không được hành động đến đầu lượt sau. Nếu không có ô hợp lệ thì chặn tuyển, không trừ tài nguyên. Mỗi thành tuyển tối đa một đơn vị mỗi lượt.

| Đơn vị | HP | Công | Giáp | Di chuyển | Tầm | Giá vàng/lương/gỗ | Điều kiện |
| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Trinh sát | 8 | 3 | 0 | 3 | 1 | 12/5/0 | Có sẵn |
| Lính khiên | 14 | 5 | 2 | 2 | 1 | 18/8/0 | Có sẵn |
| Lính giáo | 12 | 5 | 1 | 2 | 1 | 18/8/5 | Thao luyện |
| Cung thủ | 9 | 5 | 0 | 2 | 2 | 20/8/8 | Thao luyện |
| Kỵ binh | 15 | 6 | 1 | 3 | 1 | 30/15/5 | Đội hình chiến đấu |
| Máy bắn đá | 10 | 7 | 0 | 1 | 3 | 35/0/25 | Kỹ thuật vây thành |
| Tàu vận tải | 16 | 0 | 1 | 3 | 0 | 25/0/20 | Đóng thuyền |
| Chiến thuyền | 20 | 6 | 2 | 3 | 2 | 40/0/30 | Hải chiến |

Mỗi quân có một lần tấn công/lượt. Tấn công kết thúc mọi di chuyển còn lại. Máy bắn đá phải đứng yên trong lượt để bắn. Đơn vị bị hạ xuống 0 HP được loại ngay. HP không làm giảm sát thương trong MVP để dự đoán kết quả đơn giản.

## Chiến đấu và địa hình

Sát thương cơ bản = `max(1, công + thưởng công - giáp - thưởng phòng thủ)`. Không có chí mạng hoặc đánh hụt trong MVP. Lính giáo cộng 3 công khi đánh kỵ binh; kỵ binh cộng 2 công khi đánh cung thủ hoặc máy bắn đá trên đất trống. Thưởng không áp dụng lên tàu.

Quân cận chiến còn sống phản kích một lần mỗi lượt đối phương nếu kẻ đánh ở tầm 1. Phản kích diễn ra sau đòn tấn công, dùng công thức thường, không kích hoạt phản kích tiếp. Cung thủ, máy bắn đá và tàu không phản kích trong MVP.

Rừng tốn 2 điểm di chuyển, cho quân bộ +1 phòng thủ. Đồi tốn 2 điểm, cho quân bộ +1 công khi bắn từ đồi. Đất trống và cầu tốn 1 điểm. Đường giảm chi phí rừng/đồi xuống 1. Quân không đi xuyên quân khác. Không có khóa di chuyển bởi vùng kiểm soát trong MVP.

Tầm nhìn mặc định 3 ô; trinh sát 4. Rừng và đồi không chặn tầm nhìn trong MVP. Cung thủ cần đường bắn không đi qua núi hoặc thành khác; máy bắn đá bỏ qua vật cản nhưng vẫn cần mục tiêu đang được phe mình nhìn thấy. Dùng cùng một thuật toán đường bắn cho preview và mô phỏng.

## Công thành và chiếm thành

Thành có giáp công sự 20/30/40 điểm theo cấp. Khi công sự còn trên 0, quân đồn trú nhận thêm 2 giáp. Đòn đánh vào thành gây sát thương thường cho quân đồn trú nếu có, đồng thời gây 1 sát thương công sự; máy bắn đá gây 6 sát thương công sự. Thưởng giáp công sự của đòn hiện tại được tính trước khi trừ công sự.

Thành không có quân vẫn phải bị phá hết công sự trước khi chiếm. Khi công sự bằng 0 và không còn quân đồn trú, quân bộ cận chiến có thể dùng hành động tấn công từ ô kề để tiến vào chiếm thành. Trinh sát, khiên, giáo và kỵ binh được chiếm; cung, máy và tàu không được chiếm. Chiếm thành kết thúc di chuyển và hành động. Công sự không tự hồi; chủ thành trả 5 vàng, 5 gỗ để sửa 5 điểm, tối đa một lần/thành/lượt và không sửa khi có quân địch kề thành.

Bao vây trong MVP là chiếm/cắt tuyến tiếp viện và chặn ô tiếp cận. Chưa có sát thương đói riêng, tường nhiều hướng hoặc lựa chọn đánh từng cổng.

## Tiếp viện và hải quân

Thủ đô là gốc mạng tiếp viện. Một thành nối mạng khi có đường đi qua các ô lãnh thổ phe mình đến một thành đã nối. Lãnh thổ là ô trong bán kính 2 của thành; khi chồng lấn, thành gần nhất quyết định, hòa khoảng cách thì ô tranh chấp không cấp tiếp viện.

Cảng được xây tại thành kề biển bằng công nghệ Đóng thuyền: 15 vàng, 15 gỗ, mất 1 lượt và dùng hàng đợi xây dựng. Hai cảng được nối nếu tồn tại đường biển giữa chúng không đi qua ô chiến thuyền địch hoặc ô biển kề chiến thuyền địch. Không mô phỏng đoàn tiếp tế di chuyển ở MVP.

Quân bộ được tiếp viện trong khoảng cách đường đi tối đa 3 ô đến thành đã nối mạng, tăng thành 5 với Đường tiếp vận. Đường đi này chỉ qua đất thuộc phe mình; không xuyên quân địch. Quân có tiếp viện, không hành động trong lượt trước và không kề địch hồi 2 HP/đầu lượt; Kho lương tăng thành 4 HP khi đứng tại thành. Quân mất tiếp viện vẫn di chuyển và đánh bình thường nhưng không hồi.

Tàu hồi 2 HP ở cảng đã nối mạng nếu không hành động lượt trước và không kề địch. Tàu vận tải chở một quân bộ. Lên tàu từ ô đất kề và xuống ô đất kề trống tiêu hao toàn bộ hành động của quân; tàu được di chuyển tiếp nếu còn điểm. Nếu tàu chìm, quân đang chở bị mất. Công nghệ Đổ bộ phối hợp cho phép quân còn hành động tấn công sau khi xuống tàu, nhưng không di chuyển trên bộ thêm trong lượt đó.

Chiến thuyền bắn tàu; sau Đổ bộ phối hợp có thể bắn quân bộ trên ô kề biển trong tầm. Tuyển tàu tại ô biển trống kề cảng, dùng hạn mức một đơn vị/thành/lượt. Nếu không có vị trí hợp lệ thì chặn tuyển.

## Sương mù và thông tin

Ô chưa khám phá che nội dung; ô từng khám phá hiển thị địa hình và thông tin thành nhìn thấy gần nhất với nhãn “thông tin cũ”. Không giữ hình quân địch như thể vẫn ở đó. AI dùng cùng thông tin quan sát, không đọc quân địch trong sương mù.

Các trường hợp chưa có lệnh rõ ràng phải bị từ chối với lý do trên UI; mô phỏng không tự đoán ý người chơi.
