# Đề xuất v2 — đồ họa và lối chơi

Ngày 14/11/2026. Tài liệu ý tưởng cho **bản v2**. Bản v1 (1.0) giữ gần như code hiện tại; không đề xuất nào ở đây được đưa vào 1.0 ([phạm vi 1.0](../roadmap.md), [luật hiện hành](../gameplay.md)). Chưa có dòng code nào được sửa theo tài liệu này.

Tài liệu dựa trên ba nguồn:

- **Code hiện tại.** Mọi mô tả "hiện trạng" đều đã kiểm tra trong `src/` ngày 14/11/2026. Các con số hiện trạng trong đề xuất là snapshot lúc viết trước tích hợp cuối; số đo hiện hành và phương pháp ở [báo cáo tích hợp UI/hiệu năng](../reports/step5-ui-performance.md). Không dùng ngân sách v2 làm tiêu chí đã đạt của v1.
- **Phản hồi chơi thử của người dùng** ngày 14/11/2026, gồm sáu điểm về điều khiển, chiến đấu, thành trì và xây dựng.
- **Các game cùng thể loại** (mục 3). Phần lớn nguồn về cơ chế là wiki cộng đồng và báo chí, nên chỉ lấy ý tưởng, không chép số liệu.

Các con số trong tài liệu là ngân sách hoặc giá trị khởi điểm để kiểm chứng, chưa phải kết quả đo.

Cấu trúc: **Phần I** (mục 1–4) nêu mục tiêu, hiện trạng và nguyên tắc chung. **Phần II** (mục 5–12) là đồ họa. **Phần III** (mục 13–18) là lối chơi. **Phần IV** (mục 19–23) là cách thực hiện, kiểm thử và lộ trình.

---

# Phần I — Mục tiêu, hiện trạng, nguyên tắc

## 1. Mục tiêu của v2

1. **Đẹp mà vẫn nhẹ.** Đồ họa 3D có phong cách, chạy mượt trên web và trên điện thoại khi đóng gói thành app.
2. **Dễ đọc.** Nhận ra phe, loại quân, trạng thái và mối đe dọa chỉ bằng một cái nhìn, kể cả với người mù màu.
3. **Trận đánh có chiều sâu và bớt dễ đoán, nhưng công bằng.** Bất ngờ đến từ lựa chọn chiến thuật và thông tin bị che, không đến từ may rủi khó hiểu.
4. **Thành trì đáng giá.** Nâng cấp thành có giá trị phòng thủ; chiếm thành phải trả giá.
5. **Ít thao tác hơn.** Đánh hoặc chiếm bằng một lần bấm, điều khiển cảm ứng dùng được.
6. **Độ dài ván không phải mục tiêu chính.** Thời lượng do cách chơi quyết định: chơi tốt thì kết thúc nhanh, đánh chiến thuật chậm hoặc chơi kém thì lâu hơn. Chỉ đặt một giới hạn mềm: một ván bình thường trên bản đồ vừa nên **dưới khoảng 1 giờ**. Giới hạn này chỉ dùng để phát hiện luật làm ván bế tắc (thành quá mạnh, hồi máu quá nhanh), không phải để rút ngắn ván.

## 2. Hiện trạng v1

### 2.1 Đồ họa

| Thành phần | v1 hiện có | Điểm yếu |
| --- | --- | --- |
| Quân (23 loại) | Ghép khối trụ/cầu/hộp bằng code; đế màu phe; nhãn HTML trên đầu; hoạt ảnh xoay chân/vũ khí khi hành động | Lính chùy, kiếm binh, trinh sát và vài cặp khác gần như cùng bóng, chỉ khác vật cầm tay nhỏ. Màu phe phủ gần hết thân nên không còn kênh màu cho loại quân |
| Cảnh quan | Mỗi ô là một hộp 1,9 × 1,9 màu phẳng; rừng 3 cây nón, núi nón, sóng là vạch trắng | Bản đồ như lưới gạch; không có chuyển tiếp bờ, vách, độ cao; nước phẳng |
| Thành trì | Khối nhà + 4 tháp góc + tường khi có công sự; công trình là hộp nhỏ ở cạnh | Khó phân biệt làng, cấp 1/2/3 và công trình; không có trạng thái hư hại |
| Sương mù chiến tranh | Chưa khám phá: đen; đã khám phá ngoài tầm nhìn: tối đi 24% | Đúng chức năng nhưng đơn điệu; đổi vật liệu theo từng ô nên địa hình không gộp được |
| Màu phe | Lam `#2477f3`, đỏ `#eb4646`, lục `#51bb72`, vàng `#e7b449` (`engine.ts`) | Ba phe địch gần như lẫn nhau với người mù màu đỏ–lục (mục 7) |
| Hiệu năng (M1 Pro, cảnh 60 quân) | 780–830 lệnh vẽ mỗi khung, 30 FPS (trần), chỉ vẽ khi cần | Mức khuyến nghị cho điện thoại là 100–150 lệnh vẽ; chưa đo máy yếu |

### 2.2 Lối chơi: sáu điểm từ buổi chơi thử

| # | Phản hồi | Hiện trạng trong code | Hướng giải quyết |
| --- | --- | --- | --- |
| 1 | Phải đi tới ô kề rồi mới đánh/chiếm được | Luật đã cho đi rồi đánh trong cùng lượt (`move` không đánh dấu `acted`). Nhưng bấm vào địch ngoài tầm thì giao diện chỉ báo "Mục tiêu còn xa. Chọn ô xanh để đi tới gần trước." | Mục 13.1 |
| 2 | Đánh quá dễ đoán | `damage()` cho kết quả cố định: `công + thưởng − max(0, giáp − xuyên) − giữ trận − rừng − công sự`, tối thiểu 1 | Mục 13.2, 13.3, 14 |
| 3 | Địch "đã hết máu" vẫn phản kích | **Lỗi thiết kế có thật** (bảng dưới): phản kích tính theo chỉ số gốc, không xét HP còn lại | Mục 14.1 |
| 4 | Đánh xa có cần áp sát không? | Đã có đánh xa: tầm 2–4; chỉ quân cận chiến bị đánh ở ô kề mới phản kích. Có lỗ hổng "thả diều" | Mục 15 |
| 5 | Thành nâng cấp được, tự đánh trả; chiếm thành phải trả giá | Có cấp 1→3, Tường thành, Tháp canh bắn đầu lượt. Nhưng cấp không làm thành cứng hơn, tường không đánh trả, chiếm thành không mất gì | Mục 16 |
| 6 | Có cơ chế xây dựng không? | Có: 14 công trình, cải tạo ô, xây thành mới, công binh. Nhưng khó phát hiện | Mục 18 |

**Tái hiện lỗi phản kích** (chạy ngày 14/11/2026: lính chùy đánh kiếm binh trên đồng bằng):

| HP kiếm binh trước đòn | Sát thương gây ra | HP sau đòn | Phản kích lên lính chùy |
| --- | --- | --- | --- |
| 14 | 3 | 11 | 8 |
| **4** | 3 | **1** | **8** |
| 3 | 3 | 0 (chết) | 0 |

Quân chết thì không phản kích (đúng). Nhưng quân còn 1/14 HP vẫn đánh trả bằng toàn bộ sức. Thanh máu 1/14 trông như đã trống, nên người chơi thấy "chết rồi mà vẫn đánh". Lỗi nằm trong `previewAttack`: phản kích dùng `damage(s, d, a)` theo chỉ số gốc của quân phòng thủ. Theo quyết định phạm vi, v1 giữ hành vi này như một giới hạn đã biết.

## 3. Bài học từ các game cùng thể loại

| Game | Điều làm tốt | Dùng ở |
| --- | --- | --- |
| Team Fortress 2 (Valve) | Thiết kế bóng trước; nhân vật vẫn nhận ra được khi xóa hết chi tiết bên trong | Mục 5, 8 |
| Polytopia | Sức đánh và sức thủ tỉ lệ theo máu còn lại; ô phòng thủ tăng phản kích; lệnh Hồi phục; cựu binh sau 3 lần hạ địch | Mục 14, 17 |
| Wargroove | Chí mạng **không ngẫu nhiên**: mỗi quân có một điều kiện (cung đứng yên, giáo đứng cạnh giáo, trebuchet ở tầm tối đa). Wargroove 2 bỏ dao động sát thương | Mục 14.2 |
| Into the Breach | Báo trước ý định của địch; giảm ngẫu nhiên, đưa tối đa thông tin cho người chơi; cho làm lại lượt | Mục 13 |
| Fire Emblem | Vùng nguy hiểm bật cho một quân hoặc mọi địch; bảng dự báo trận đầy đủ; vùng nguy hiểm ẩn ở góc nhìn quá gần | Mục 6, 13 |
| Civilization VI | Thành chỉ bắn khi có tường; thành bị vây thì không hồi phục; quân đánh xa không tạo vùng khống chế và bị phạt khi bắn tường | Mục 15, 16 |
| XCOM | Người chơi cảm nhận xác suất theo cảm xúc ("85%" bị coi là chắc trúng); nhà phát triển phải thêm cơ chế ngắt chuỗi xui | Mục 14.3 |
| Hướng dẫn tiếp cận màu | Không phân biệt phe chỉ bằng màu; thêm hình dạng hoặc biểu tượng; cho người chơi chọn màu; tránh cặp đỏ–lục | Mục 7 |

## 4. Nguyên tắc chung

1. **Đọc được trước, đẹp sau.** Ở mức zoom chơi thật, người chơi phải nhận ra *phe → loại quân → trạng thái* trong khoảng 2 giây, trên cả ảnh xám lẫn ảnh mô phỏng mù màu. Chi tiết chỉ được thêm khi không làm hại bóng và mảng màu.
2. **Thông tin trước, may rủi sau.** Nguồn bất ngờ chính của trận đánh là thông tin bị che (sương mù) và lựa chọn của đối thủ. Ngẫu nhiên chỉ dùng ở chỗ người chơi kiểm soát được rủi ro, và luôn hiện đúng con số.
3. **Một nguồn sự thật.** Engine và giao diện dùng chung một hàm dự báo (`previewAttack` và các hàm lý do), để nút bấm, dự báo và kết quả không bao giờ lệch nhau.
4. **Công bằng với AI.** AI chỉ đọc `observe`. Mọi luật mới đều có kiểm thử chống gian lận.
5. **Tái lập được.** Cùng trạng thái và cùng lệnh thì cùng kết quả; tải lại ván không đổi được kết quả một đòn.
6. **Vẫn chỉ vẽ khi cần.** Mặc định không có chuyển động môi trường liên tục; giữ chế độ giảm chuyển động và tốc độ AI nhanh đã có.
7. **Nhiều mức chất lượng, một nguồn dữ liệu.** Cùng một asset dùng cho mọi mức; đồ họa dựng bằng code của v1 được giữ làm mức Thấp và phương án dự phòng.
8. **Đổi luật thì bắt đầu ván mới.** Không chuyển save cũ, theo quyết định phát triển trong [kế hoạch 1.0](../roadmap.md).

---

# Phần II — Đồ họa

## 5. Phong cách và ngân sách kỹ thuật

**Phong cách đề xuất: "sa bàn low-poly có ánh sáng đẹp".** Hình khối đơn giản, cạnh vát nhẹ, màu lấy từ một bảng màu chung, bóng và AO (bóng tối ở góc khuất) mềm. Không theo hướng tả thực. Hướng này đẹp ở góc camera chéo từ trên xuống, rẻ cho GPU và dễ giữ đồng bộ giữa 23 quân.

- **Màu phe chỉ để nhận phe:** cờ, áo choàng hoặc khăn, đế, mái nhà.
- **Loại quân nhận bằng** bóng, mũ, vũ khí và chất liệu (gỗ, da, sắt, thép).

**Ngân sách:**

| Hạng mục | Desktop (Cao) | Điện thoại / app (Vừa) | Ghi chú |
| --- | --- | --- | --- |
| Lệnh vẽ mỗi khung, cảnh 60 quân | ≤ 300 | ≤ 150 | Đo bằng `tests/perf/measure.mjs` |
| Tam giác trên màn hình | ≤ 400k | ≤ 150k | |
| Mỗi quân | 1,5–3k tam giác, 1 vật liệu, khoảng 20 xương | Bản rút gọn (LOD1) khoảng 800 tam giác | Kỵ binh và máy công thành có thể gấp đôi |
| Mỗi ô địa hình | 50–300 tam giác, vẽ hàng loạt | Như desktop, bớt biến thể | |
| Thành cấp 3 đủ công trình | ≤ 8k tam giác, ≤ 6 lệnh vẽ | ≤ 4k tam giác | Gộp tĩnh theo vật liệu |
| Texture | 1 bảng màu chung + atlas 1024 px | 512 px, KTX2 | Không có texture riêng cho từng quân |
| Dung lượng tải lần đầu | ≤ 15 MB | ≤ 8 MB | glTF nén meshopt + KTX2 |
| Bóng đổ | Shadow map 2048, chỉ cập nhật khi cảnh đổi | Bóng tròn giả dưới quân + AO tính sẵn | Như `shadowMap.autoUpdate = false` hiện tại |
| Hậu xử lý | Tối đa một pass nhẹ (chỉnh màu) | Không | Không bloom, không SSAO thời gian thực |
| FPS khi chuyển động | 30 (giữ trần), 60 nếu đo thấy đủ dư | 30 | |

Mức 100–150 lệnh vẽ cho điện thoại là con số thường gặp trong các hướng dẫn tối ưu Three.js; phải kiểm chứng trên thiết bị thật.

## 6. Kỹ thuật render dùng chung

- **Một vật liệu, một bảng màu.** Mọi mô hình tĩnh trỏ UV vào một ảnh bảng màu nhỏ, hoặc dùng màu theo đỉnh. Nhờ đó gộp và vẽ hàng loạt được, và đổi tông màu cả game chỉ bằng cách sửa một ảnh.
- **Vẽ hàng loạt theo loại.** Ô địa hình, cây, đá, ruộng, đường, tường đều là `InstancedMesh`, nên số lệnh vẽ không tăng theo kích thước bản đồ.
- **Sương mù và vùng nhớ nằm trong shader.** Giữ texture sương mù hiện có; bỏ việc đổi vật liệu theo từng ô như `updateMapFog`, chính là thứ đang ngăn gộp địa hình. Shader đọc mặt nạ:
  - vùng chưa khám phá hiện như **mây hoặc giấy da bản đồ**;
  - vùng nhớ hiện **sepia, giảm bão hòa** như bản đồ cũ.

  Chỉ dùng dữ liệu từ `observe`; không lộ quân địch.
- **Lớp phủ chiến thuật dùng chung cơ chế với sương mù.** Vùng đi được, vùng nguy hiểm (mục 13.3) và tầm bắn của thành là các mặt nạ trên một texture phủ địa hình. Bật thêm lớp phủ không làm tăng lệnh vẽ theo số ô.
- **Ánh sáng.** AO được nướng vào màu đỉnh khi xuất asset. Lúc chạy chỉ còn một mặt trời ấm, ánh sáng bầu trời lạnh và một viền sáng (fresnel trong shader) giúp tách quân khỏi nền.
- **Tách quân khỏi nền.** Đế màu phe mỏng và sáng hơn v1, có bóng tròn mềm dưới chân. Ở mức Cao, quân có viền sáng màu phe.
- **Hiển thị theo mức zoom.**
  - **Gần và vừa:** mô hình đầy đủ (hoặc LOD1 ở rìa khung nhìn).
  - **Xa (chế độ chiến lược):** quân thu thành biểu tượng phẳng gồm biểu tượng loại quân, biểu tượng phe và thanh máu. Cảnh quan bỏ trang trí; rừng gộp thành mảng tán. Đây là cách giảm chi tiết rẻ nhất và còn đọc rõ hơn mô hình 3D nhỏ xíu.
  - Lớp phủ chiến thuật luôn hiện ở zoom chơi, giống Fire Emblem tránh ẩn vùng nguy hiểm ở góc nhìn hay dùng.
- **Chỉ vẽ khi cần.** Vòng vẽ liên tục chỉ chạy khi có hoạt ảnh, camera đang di chuyển, hoặc mức Cao bật "môi trường động". Nước và cờ ở mức Cao chạy riêng 15 FPS.

## 7. Màu phe và khả năng tiếp cận

Mô phỏng bốn màu phe hiện tại (ma trận Machado 2009, khoảng cách màu CIELAB ΔE; dưới khoảng 30 là khó phân biệt ở kích thước nhỏ):

| Cặp phe | Thị lực thường | Mù màu lục (deutan) | Mù màu đỏ (protan) |
| --- | --- | --- | --- |
| Đỏ – Lục | 111 | **20** | **28** |
| Đỏ – Vàng | 63 | **24** | 47 |
| Lục – Vàng | 64 | 37 | **27** |
| Lam – các phe khác | 114–131 | 99–135 | 90–128 |

Với người mù màu đỏ–lục (khoảng 8% nam giới), ba phe địch gần như cùng một màu. Thiết kế v2:

- **Mỗi phe một biểu tượng hình học:** tròn (lam), tam giác (đỏ), vuông (lục), sao (vàng). Biểu tượng xuất hiện trên cờ, đế quân, nhãn, mái và cổng thành, biên lãnh thổ. Đây là kênh nhận phe thứ hai, không phụ thuộc màu.
- **Tách độ sáng** giữa các phe (có phe sáng, có phe tối), không chỉ khác sắc độ.
- **Cài đặt màu:** người chơi chọn màu cho phe mình, và có sẵn một bảng màu an toàn (ví dụ lam / cam / tím / trắng).
- **Kiểm tra:** ảnh mô phỏng mù màu là một bước bắt buộc trong bài kiểm tra nhận dạng (mục 22).

## 8. Quân đội

### 8.1 Ngôn ngữ hình khối theo nhánh

| Nhánh | Hình khối chủ đạo | Cấp quân thấy được qua |
| --- | --- | --- |
| Bộ binh | Đứng thẳng, vai rộng dần theo cấp | Chất liệu: gỗ/da → sắt xám → thép bóng + vải màu phe |
| Cung & nỏ | Mảnh, có vật dài chìa ngang | Gỗ nhẹ → nỏ cơ khí có bàn đạp |
| Kỵ binh | Khối ngang (ngựa) + người, lớn dần theo cấp | Ngựa trần → yên da → ngựa phủ giáp bạc |
| Công thành | Khung gỗ lớn; chiều cao là dấu hiệu chính | Ballista thấp rộng → máy bắn đá cao vừa → trebuchet rất cao |
| Hỗ trợ | Tròn, mang dụng cụ | |
| Hải quân | Thân tàu và buồm; số cột buồm tăng theo cấp | Thuyền một buồm → tàu chở thùng → chiến hạm hai cột → chiến hạm nặng có tháp |

### 8.2 Đặc điểm nhận dạng từng quân

Mỗi quân có **ít nhất hai** đặc điểm thấy được từ camera chéo: mũ, vũ khí hoặc vật mang chìa ra ngoài thân, tỉ lệ cơ thể, tư thế. Cột "Chìa khóa" là điều phải nhận ra đầu tiên.

| Quân | Chìa khóa | Mũ / đầu | Vũ khí, tư thế | Tỉ lệ |
| --- | --- | --- | --- | --- |
| Lính chùy | Chùy lớn vác vai, đầu trần | Tóc + băng đô vải màu phe | Chùy to gấp khoảng 2 lần v1, vác chéo; khiên gỗ tròn nhỏ | 0,95, hơi khom |
| Trinh sát | Mũ trùm nhọn, không khiên | Mũ trùm nón xanh rêu | Ống nhòm hoặc cờ hiệu cao, ba lô | 0,85, bước tới |
| Lính khiên | Khiên tháp cao bằng người | Mũ tròn đơn giản | Khiên che trước, giáo ngắn | 1,0 |
| Lính giáo | Giáo dài gấp rưỡi người, dựng đứng | Mũ nón sắt | Khiên tròn | 1,0 |
| Kiếm binh | Chùm lông trên mũ, kiếm giơ | Mũ sắt có chùm lông màu phe | Kiếm dài, khiên chữ nhật | 1,0, vai rộng có giáp vai |
| Thương binh dài | Thương rất dài chĩa xiên ra trước | Mũ phẳng | Thương dài gấp đôi người, không khiên lớn | 1,0 |
| Bộ binh giáp nặng | Khối vuông bạc, mũ kín | Mũ thùng kín | Rìu hoặc búa lớn, khiên bọc kim loại | 1,15 |
| Cung thủ | Cung lớn cầm ngang | Mũ vải mềm | Ống tên sau lưng | 0,95 |
| Kiểm lâm | Mũ trùm + áo choàng lá | Mũ trùm xanh lá | Cung dài, áo choàng phủ vai | 0,95 |
| Lính nỏ | Nỏ ngang ngực, mũ sắt tròn | Mũ sắt tròn | Khiên pavise sau lưng | 1,0 |
| Kỵ binh nhẹ | Ngựa nâu, người mặc áo vải | Mũ vải | Giáo ngắn | Ngựa nhỏ |
| Cung kỵ | Ngựa + cung giương | Khăn đầu | Cung ngắn | Ngựa nhỏ |
| Kỵ sĩ | Thương dài chĩa ngang, khiên tam giác | Mũ sắt | Ngựa khoác vải màu phe | Ngựa vừa |
| Kỵ sĩ giáp nặng | Ngựa phủ giáp bạc | Mũ kín có sừng hoặc chóp | Thương + giáp | Ngựa lớn |
| Paladin | Áo choàng trắng, quầng sáng nhẹ | Mũ kín vàng | Chùy và khiên trắng có biểu tượng | Ngựa trắng |
| Ballista | Thấp, rộng, cánh nỏ lớn | — | Lính kéo nhỏ đứng cạnh | Rộng |
| Máy bắn đá | Cần ném cong, cao vừa | — | Thùng đá | Cao vừa |
| Trebuchet | Rất cao, đối trọng lớn | — | Đối trọng hình hộp | Cao gấp đôi máy bắn đá |
| Công binh | Xe hoặc bó gỗ, búa lớn | Mũ da | Bó gỗ và dụng cụ sau lưng | 0,95 |
| Thuyền trinh sát | Thuyền nhỏ một buồm tam giác | — | | Nhỏ |
| Tàu vận tải | Thân rộng chất thùng hàng | — | Không có buồm chiến | Rộng |
| Chiến hạm | Hai cột buồm, vũ khí ở mũi | — | | Dài |
| Chiến hạm nặng | Thân tối, tháp và lan can | — | | Dài nhất |

### 8.3 Màu phe, trạng thái và nhãn

- **Mặt nạ phe:** mô hình có một vùng đánh dấu (kênh màu đỉnh hoặc một ô trong bảng màu). Code tô lại màu và biểu tượng phe khi chạy, nên một asset dùng cho cả 4 phe.
- **Máu:** nhãn hiện số HP ("7/14"); thanh máu đổi màu theo ngưỡng (trên 60%, 30–60%, dưới 30%). Mức Cao thêm vết nứt giáp khi dưới 50%.
- **Đã hành động:** thân quân giảm bão hòa nhẹ, đế giữ màu phe.
- **Được chọn:** vòng sáng ở đế. Chỉ quân được chọn có hoạt ảnh "thở".
- **Cựu binh** (mục 17): một vạch trên vai mô hình và dấu sao trên nhãn.
- **Biểu tượng loại quân:** 23 biểu tượng riêng, dùng cho nhãn, chế độ chiến lược và bảng dự báo.

### 8.4 Hoạt ảnh

- **Người:** bộ binh, cung và người cưỡi ngựa dùng chung **một bộ xương người** và một bộ clip: đứng, đi, đánh cận chiến, bắn, trúng đòn, chết, chiếm thành (cắm cờ).
- **Ngựa:** bộ xương riêng, clip đứng, phi, chồm.
- **Máy công thành và tàu:** không có xương; chỉ các bộ phận chuyển động (bánh xe, cần ném, buồm).
- **Thời lượng** theo `actionSeconds` (`src/ui/playbackPolicy.ts`), nên chế độ AI nhanh và giảm chuyển động vẫn đúng. Khi giảm chuyển động: nhảy thẳng đến tư thế cuối, vẫn hiện số sát thương.
- **Bị diệt:** quân ngã rồi mờ dần (mức Vừa chỉ mờ dần). Không để lại vật thể lâu dài.

## 9. Cảnh quan

### 9.1 Bộ ô địa hình

- Mỗi loại địa hình có 2–4 biến thể mô hình, cạnh vát; ô xoay theo mã ô để tránh lặp.
- **Chuyển tiếp:**
  - Cát gặp nước có mép bọt và dốc thoải.
  - Đồi gặp đồng bằng có bậc thấp.
  - Núi là vách đá nhô hẳn lên, chiếm trọn ô.
- **Độ cao:** dùng `tile.height` để tạo bậc thang thật, có vách đất lộ ở cạnh.
- **Rìa bản đồ:** đế sa bàn có vách đất đá, biển mờ dần ra xa. Che phần rỗng ngoài 33 × 25 và tạo cảm giác bàn cờ chiến thuật.

| Địa hình | Đặc trưng | Ghi chú hiệu năng |
| --- | --- | --- |
| Đồng bằng | Cỏ hai sắc, khóm hoa hoặc cỏ cao rải ngẫu nhiên | Khóm cỏ vẽ hàng loạt; ẩn ở mức Thấp |
| Rừng | 3–5 cây thuộc 2–3 loài, tán to, thấy rõ thân; quân đứng trong rừng vẫn lộ đầu | Mức Cao có gió trong shader, mức khác đứng yên |
| Đồi | Mô đất tròn, đá lộ, cỏ thưa | |
| Núi | Vách đá xám, chóp tuyết | Một mô hình lớn mỗi ô; không đi qua được nên được phép cao |
| Bờ cát | Cát sáng, dải bọt khi giáp nước | Bọt nướng sẵn theo bản đồ |
| Biển | Một mặt phẳng lớn, đậm nhạt theo khoảng cách bờ | Mức Cao: sóng trong shader 15 FPS; mức khác: tĩnh |

### 9.2 Cải tạo đất và hạ tầng

- **Ruộng / thâm canh / tưới:** luống cây dày và đậm dần theo cấp; ruộng tưới có kênh nước chạy dọc.
- **Đồng cỏ:** hàng rào gỗ và 2–3 con thú đứng yên.
- **Khai thác rừng:** gốc cây, đống gỗ, ô thưa cây hơn.
- **Mỏ đồi / mỏ đá:** cửa hầm có giàn gỗ; mặt đá cắt bậc.
- **Đường:** dải đất hoặc đá lát nối mượt giữa các ô kề. Mảnh thẳng, cong, chữ T hay ngã tư được chọn theo các ô bên cạnh.
- **Cầu:** cầu gỗ có trụ, nối hai bờ đúng hướng.
- **Biên lãnh thổ:** dải màu phe mềm, trong suốt, sát mặt đất, có lặp biểu tượng phe. Thay cho nét đứt hiện tại; chỉ vẽ lại khi lãnh thổ đổi.

### 9.3 Ánh sáng và không khí

- Ánh sáng **chiều muộn cố định**: mặt trời vàng ấm thấp, ánh sáng bầu trời xanh lạnh. Không có chu kỳ ngày–đêm, để không phải vẽ liên tục và màu phe luôn ổn định.
- Sương xa màu xanh xám thay cho nền đen, khớp với mây sương mù chiến tranh.
- Mức Cao: bóng mây trôi trên mặt đất (một texture chiếu, 10–15 FPS).

## 10. Thành trì

### 10.1 Bộ ghép thành theo mô-đun

| Thành phần | Quy tắc hiển thị | Dữ liệu |
| --- | --- | --- |
| Lõi | Làng trống: nhà gỗ mái rơm. Cấp 1: nhà đá nhỏ + cột cờ. Cấp 2: nhà chính hai tầng + sân. Cấp 3: thành chính có tháp trung tâm | `city.owner`, `city.level` |
| Tường | Tường bao quanh ô, cổng hướng về đường hoặc hàng xóm; tường đá dày khi có công trình Tường thành | `city.fort`, `hasBuilding('wall')` |
| Hư hại | Công sự dưới 66%: tường nứt. Dưới 33%: sập lỗ, có đá vụn. Bằng 0: cổng đổ | `fort`, `maxFort` |
| Phòng thủ chủ động | Thành bắn được (mục 16) thì có cung thủ nhỏ trên tường; rê chuột hiện vòng tầm bắn | Luật mục 16 |
| Bị vây | Viền đỏ quanh thành, biểu tượng xích trên nhãn | Luật mục 16.3 |
| Công trình | Mỗi công trình một mô-đun, đặt vào các "khe" quanh lõi theo thứ tự cố định | `buildings`, `specialty` |
| Đang xây | Giàn giáo và đống vật liệu tại khe sắp xây; búa nhỏ trên nhãn (mục 18) | `city.job` |
| Mới bị chiếm | Cờ cũ rách; khói nhẹ ở mức Cao | `city.stability` |
| Phe | Mái, cờ, khiên trên cổng mang màu và biểu tượng phe; làng trống màu trung tính | `FACTIONS[owner]` |
| Thông tin cũ | Shader vùng nhớ (sepia), như địa hình | `remembered` |

| Công trình | Hình ảnh nhận dạng |
| --- | --- |
| Nông trại | Kho thóc đỏ + luống ruộng nhỏ |
| Kho lương | Silo tròn mái nón |
| Xưởng gỗ | Lán + đống gỗ tròn |
| Chợ | Các sạp mái vải sọc |
| Xưởng cơ khí | Bánh răng gỗ lớn trên mái |
| Chuồng ngựa | Chuồng dài + hàng rào |
| Lò rèn / Lò rèn sắt / Xưởng thép | Ống khói thấp, cao, rồi hai ống; ánh lửa cam mạnh dần theo cấp |
| Xưởng công thành | Cần cẩu gỗ |
| Tháp canh | Tháp đá cao có cờ |
| Cảng / Xưởng đóng tàu | Cầu tàu hướng ra nước (giữ cách chọn hướng hiện tại); xưởng đóng tàu có khung thân tàu |

### 10.2 Hiệu năng của thành

- Ghép mô-đun rồi **gộp tĩnh theo vật liệu**, như `mergeRigidParts` đang làm cho quân.
- Chỉ dựng lại khi `level`, `fort`, `buildings`, `job` hoặc `owner` đổi, không dựng lại ở mỗi lần `sync` như v1.
- Tường và mô-đun dùng chung giữa các thành nên vẽ hàng loạt được khi có nhiều thành.

## 11. Hiệu ứng giao chiến

- **Đạn:** mũi tên, đá, tên nỏ có mô hình riêng và vệt bay ngắn; bay theo đường cong như v1.
- **Va chạm:** bụi, tia lửa, mảnh gỗ lấy từ một kho hạt dùng chung, số lượng cố định; không tạo vật thể mới cho mỗi đòn.
- **Số nổi:** sát thương thường; "CHÍ MẠNG" màu cam; "SƯỢT" màu xám (đòn chỉ gây nửa sát thương); phản kích và tường đánh trả có màu riêng.
- **Thành bắn và tường đánh trả:** tên bắn ra từ tường, dùng chung hệ đạn.
- **Chiếm thành:** cờ cũ hạ, cờ mới kéo lên, vòng sáng màu phe lan trên ô.
- **Giới hạn:** tối đa khoảng 50 hạt mỗi đòn; mức Thấp chỉ giữ vòng va chạm như v1. Hiệu ứng chỉ chạy trong thời lượng hành động.

## 12. Mức chất lượng

| Thành phần | Thấp | Vừa (điện thoại / app) | Cao (desktop) |
| --- | --- | --- | --- |
| Mô hình quân | Mô hình dựng bằng code của v1 | Asset v2, LOD1 ở zoom xa | Asset v2 đầy đủ |
| Hoạt ảnh | Như v1 | Clip, 30 FPS | Clip + "thở" khi được chọn |
| Địa hình | Bộ ô đơn giản, không trang trí | Bộ ô v2, ít trang trí | Đầy đủ, có cỏ, hoa |
| Nước | Phẳng | Đậm nhạt tĩnh + bọt nướng sẵn | Sóng shader 15 FPS |
| Bóng | Không | Bóng tròn giả + AO nướng sẵn | Shadow map 2048 |
| Viền sáng quân | Không | Không | Có |
| Hạt hiệu ứng | Không | Một nửa | Đầy đủ |
| Độ phân giải điểm ảnh (DPR) | 1 | ≤ 1,5 | ≤ 2 |

Mọi mức đều dùng chế độ chiến lược ở zoom xa và đều có biểu tượng phe. Cài đặt lưu trong khóa `nation-ui-preferences-v1` đã có (thêm giá trị `medium` cho chất lượng). Lần chạy đầu, game tự chọn mức theo thiết bị (màn hình cảm ứng hoặc GPU yếu → Vừa); người chơi đổi được.

---

# Phần III — Lối chơi

Các giá trị dưới đây là điểm xuất phát để chạy kiểm thử cân bằng (mục 22). Chúng sẽ được chỉnh theo kết quả đo, không phải số chốt.

## 13. Điều khiển và thông tin trận

### 13.1 Đánh hoặc chiếm bằng một lần bấm

Bấm vào quân địch hoặc thành địch ngoài tầm: game tự chọn ô đứng, đi tới rồi đánh trong một thao tác. Đây chỉ là thay đổi giao diện, luật không đổi.

1. **Tìm ô đứng:** trong `reachable(state, unit)`, tìm các ô mà từ đó đòn đánh hợp lệ. Cách làm: chạy thử lệnh `move` trên bản sao trạng thái rồi gọi `previewAttack`, cùng nguyên tắc "lý do lấy từ engine" của `actionReasons.ts`.
2. **Chấm điểm ô đứng** (điểm cao nhất được chọn):
   - Cận chiến: +3 cho rừng hoặc đồi; −2 cho mỗi quân địch khác kề ô; −1 cho mỗi bước đi thêm; ưu tiên ô có phản kích dự báo thấp nhất.
   - Đánh xa: ưu tiên ô ở **tầm tối đa**, rồi đến ô thỏa điều kiện chí mạng (mục 14.2), rồi đồi, rồi ô ít địch kề.
   - Chiếm làng hoặc thành đã vỡ công sự: ô kề gần nhất.
3. **Xem trước:** hiện đường đi, ô đứng và dự báo, ví dụ "Đi 2 ô · gây 5 HP · phản kích 3". Bấm vào ô xanh vẫn chỉ di chuyển như cũ.
4. **Thực hiện:** hai lệnh `move` rồi `attack`, đều qua `execute`. Nếu sau bước đi, sương mù mở ra thông tin làm đòn không còn hợp lệ hoặc dự báo xấu đi rõ (phản kích tăng, xuất hiện địch mới), thì **dừng sau khi đi** và báo lý do.
5. **Không áp dụng cho:** máy công thành (đã đi thì không bắn được), quân đã hành động, và trường hợp không có ô hợp lệ. Trường hợp cuối báo "Không có ô đứng để đánh trong lượt này".
6. Hoạt ảnh đi và đánh nối tiếp nhau, dùng cơ chế khóa giao diện theo `onVisualEnd` đã có.

### 13.2 Bảng dự báo trận

Bảng hai cột (bên mình / bên địch), lấy toàn bộ từ `previewAttack`:

- HP trước và sau đòn;
- sát thương (hoặc khoảng sát thương);
- tỉ lệ đòn sượt và sát thương khi sượt;
- điều kiện chí mạng nào đang thỏa, và điều kiện nào có thể thỏa nếu chọn ô khác;
- phản kích, tường đánh trả;
- HP mất khi chiếm thành;
- cảnh báo khi ô đứng nằm trong vùng nguy hiểm.

Mọi luật ở mục 14–17 đều phải hiện được trong bảng này. Luật nào không giải thích được bằng một dòng trong bảng thì cần đơn giản lại.

### 13.3 Vùng nguy hiểm

- **Một quân:** rê chuột (hoặc chạm, xem 13.5) vào quân địch để tô các ô nó có thể đánh tới ở lượt sau (bước đi + tầm, có tính địa hình và vùng khống chế).
- **Toàn bộ:** một nút bật vùng nguy hiểm của mọi quân địch đang thấy, cộng tầm bắn của thành địch.

Chỉ dùng quân địch thấy được qua `observe`, không lộ sương mù. Vùng được tính khi bật và vẽ bằng lớp phủ (mục 6). Đây là cách chính để trận đánh "bớt dễ đoán" theo hướng có chiều sâu: người chơi biết rủi ro và có thể dụ địch vào vùng của mình.

### 13.4 Hoàn tác di chuyển

Cho hoàn tác lệnh di chuyển gần nhất nếu thỏa đủ ba điều kiện:

1. quân chưa tấn công, xây hay dùng kỹ năng sau đó;
2. bước đi **không làm lộ** ô hay quân mới;
3. vẫn còn trong lượt của mình.

Điều kiện (2) ngăn việc dùng hoàn tác để dò sương mù. Cài đặt: chụp trạng thái trước lệnh (`execute` là hàm thuần nên rẻ). Mục đích chính là giảm bấm nhầm trên điện thoại.

### 13.5 Điều khiển cảm ứng

- **Chạm lần đầu** vào ô hoặc quân địch: xem trước, tương đương rê chuột (đường đi, dự báo, vùng nguy hiểm). **Chạm lần hai:** xác nhận.
- **Giữ lâu:** xem thông tin quân hoặc thành.
- **Chụm hai ngón:** zoom. **Kéo:** di chuyển camera.
- **Vùng chạm** của nhãn quân và nút tối thiểu 44 px.

### 13.6 Tóm tắt lượt AI

Sau lượt địch, hiện danh sách ngắn các sự kiện người chơi nhìn thấy, ví dụ "Đỏ chiếm Làng X · Lục đánh Kiếm binh của bạn (−6 HP)". Bấm vào một dòng để camera nhảy tới. Danh sách dùng trường `viewers` sẵn có trong sự kiện, nên không lộ thông tin. Tính năng này bổ trợ cho chế độ AI nhanh: người chơi tua nhanh mà không bỏ lỡ diễn biến.

## 14. Công thức chiến đấu

Gọi `base` là kết quả `damage()` hiện tại (công, thưởng, giáp, xuyên, giữ trận, rừng, công sự). v2 thêm bốn lớp theo thứ tự: máu, chí mạng có điều kiện, đòn sượt, dao động. Không có lớp trượt: mọi đòn đều gây sát thương.

### 14.1 Sức đánh theo máu còn lại

Lớp này cũng sửa lỗi phản kích ở mục 2.2.

- **Tấn công:** `base × (0,5 + 0,5 × HP / HP tối đa)`, dùng HP của bên tấn công trước đòn. Đầy máu đánh như cũ; còn nửa máu đánh 75%; sắp chết đánh khoảng 50%.
- **Phản kích:** `max(1, round(base_phản_kích × HP còn sau đòn / HP tối đa))`. Phản kích tỉ lệ thẳng theo máu vì quân phòng thủ vừa nhận đòn. Ví dụ ở mục 2.2: kiếm binh còn 1/14 HP chỉ phản kích **1** thay vì 8; còn 11/14 thì phản kích 6.
- **Địa hình phòng thủ:** giữ "rừng −1 sát thương" hiện có, thêm **phản kích ×1,25** khi bên phòng thủ đứng trên rừng hoặc đồi (theo Polytopia: ô phòng thủ có lợi cả khi đánh trả).

Hệ quả: rút quân bị thương về hồi máu (mục 17) trở thành lựa chọn có giá trị, và tấn công quân đã yếu ít rủi ro hơn. Trận đánh có thể dài hơn một chút; điều này chấp nhận được miễn là không gây bế tắc (mục 1).

### 14.2 Chí mạng có điều kiện

Không dùng chí mạng ngẫu nhiên. Mỗi quân có **một** điều kiện, thỏa thì đòn ×1,5. Điều kiện luôn hiện trên bảng dự báo, và trên ô đứng khi người chơi chọn nơi đánh. Người chơi chủ động tạo ra chí mạng bằng đội hình và vị trí. Phản kích không bao giờ chí mạng.

| Quân | Điều kiện chí mạng | Mục đích |
| --- | --- | --- |
| Cung thủ, lính nỏ | Không di chuyển trong lượt | Thưởng cho việc giữ vị trí; giảm sức "thả diều" (mục 15) |
| Kiểm lâm | Bắn từ ô rừng | Vai trò du kích |
| Lính giáo, thương binh dài | Có lính giáo hoặc thương binh đồng minh đứng kề | Khuyến khích đội hình |
| Kiếm binh | Mục tiêu còn ≤ 50% HP | Vai trò kết liễu |
| Lính chùy | Mục tiêu đứng trên ô có cải tạo (ruộng, mỏ, đường) | Vai trò quấy phá |
| Kỵ sĩ, kỵ sĩ giáp nặng | Đã đi ≥ 2 ô đồng bằng hoặc cát trong lượt và mục tiêu không "Dựng thương" | Thay cho thưởng xung phong +3/+4 hiện có, mức tương đương |
| Cung kỵ | Đã đi ≥ 3 ô và mục tiêu không phải kỵ binh | Đánh nhanh rút nhanh vào bộ binh |
| Ballista | Mục tiêu là kỵ binh hoặc tàu | Khắc chế |
| Máy bắn đá, trebuchet | Bắn ở tầm tối đa | Vây thành từ xa |
| Lính khiên, bộ binh giáp nặng, paladin, trinh sát, công binh, tàu | Không có | Bù bằng phòng thủ, tốc độ hoặc vai trò hỗ trợ |

### 14.3 Đòn sượt: không trượt, nhưng có thể đánh yếu

**Không có trượt hoàn toàn: tỉ lệ trượt bằng 0 với mọi đòn.** Mỗi đòn chắc chắn gây sát thương; may rủi nằm ở chỗ đòn có thể là **đòn sượt**, chỉ gây **50% sát thương** (làm tròn, tối thiểu 1). Người chơi luôn biết đòn đánh có tác dụng, chỉ không chắc mạnh đến đâu.

| Loại đòn | Tỉ lệ đòn sượt |
| --- | --- |
| Cận chiến, kỵ binh cận chiến | 10% |
| Cung, nỏ, kiểm lâm, cung kỵ, chiến hạm | 15%; +10% nếu mục tiêu trong rừng; +10% nếu bắn ở cự ly ≥ 3 |
| Máy công thành bắn vào quân | 20% |
| Đòn đang thỏa điều kiện chí mạng (mục 14.2) | Không sượt: chí mạng luôn là chí mạng |
| Phá công sự, phản kích, tường đánh trả, thành bắn | Không sượt (giữ cố định để dễ tính rủi ro và tiến độ vây thành) |

- **Ngắt chuỗi xui:** sau một đòn sượt, đòn kế tiếp của cùng phe trong lượt đó chỉ còn nửa tỉ lệ sượt.
- **Con số hiển thị phải đúng là con số dùng để gieo.** Không làm như XCOM (con số hiển thị khác con số thật); có kiểm thử thống kê.
- **Kỳ vọng sát thương:** cận chiến còn khoảng 95% so với hiện tại; đánh xa trên đồng bằng, cự ly 2 còn khoảng 92%, thấp hơn khi bắn vào rừng hoặc bắn xa. Mức giảm của đánh xa là cái giá cố ý cho việc không bị phản kích, và được bù bằng chí mạng khi đứng yên.
- **Dự báo** hiện cả hai mức, ví dụ "Gây 6 HP (15%: 3 HP) · phản kích 2". Nếu cả mức sượt cũng đủ hạ mục tiêu thì ghi "Chắc chắn hạ".

### 14.4 Dao động và tính tái lập

- **Dao động:** ±1 HP (−1, 0 hoặc +1, đều nhau) cho đòn chủ động, tối thiểu 1. Kỳ vọng không đổi. Không dao động cho phản kích, tường đánh trả và phá công sự.
- **Tái lập:** mọi lần gieo lấy từ hàm băm của `settings.seed`, `serial` (số thứ tự sự kiện, đã có trong State) và id quân tấn công. Không cần thêm trường vào State. Tải lại ván cho đúng kết quả cũ.
- **Tùy chọn "Chiến đấu cố định"** khi tạo ván: tắt đòn sượt và dao động, giữ chí mạng có điều kiện. Tùy chọn này cần thêm một trường trong `settings`, tức đổi schema lưu ván.

### 14.5 AI với công thức mới

- AI chọn mục tiêu theo **giá trị kỳ vọng** và **xác suất hạ gục** (P(sát thương ≥ HP còn lại)), có tính phản kích kỳ vọng.
- AI chủ động tìm điều kiện chí mạng: cung đứng yên, giáo đứng cạnh nhau, kỵ sĩ xung phong.
- Vì kết quả gieo từ dữ liệu có trong State, về kỹ thuật AI có thể tính trước từng đòn. Luật yêu cầu AI chỉ dùng giá trị kỳ vọng, và có kiểm thử cho điều này.

## 15. Đánh xa và vùng khống chế

### 15.1 Hiện trạng

- **Tầm bắn:** cung thủ, kiểm lâm, lính nỏ, cung kỵ, chiến hạm: 2. Ballista, máy bắn đá, chiến hạm nặng: 3. Trebuchet: 4. Máy công thành triển khai thì +1 tầm (trừ trebuchet, vốn phải triển khai mới bắn được).
- **Đường bắn:** cần thông; núi và thành chặn, trừ máy bắn đá và trebuchet (bắn vòng cầu).
- **Phản kích:** chỉ quân cận chiến bị đánh ở ô kề mới đánh trả. Cung bắn từ 2 ô không bị đánh trả; cung bị áp sát cũng không đánh trả.
- **Đối trọng sẵn có:** cung thủ máu thấp (9 HP, giáp 0); lính khiên "Giữ trận" giảm 3 sát thương từ đánh xa; rừng giảm 1; cung trên đồi +1; lính nỏ xuyên 2 giáp và có "Ngắm bắn"; máy công thành đã đi thì không bắn.

**Lỗ hổng "thả diều":** di chuyển không kết thúc lượt hành động, nên cung đi rồi vẫn bắn được. Bán kính đe dọa (bước đi + tầm, trên đồng bằng):

| Quân | Bước đi | Tầm | Bán kính đe dọa |
| --- | --- | --- | --- |
| Lính chùy, thương binh dài, bộ binh giáp nặng | 1 | 1 | 2 |
| Kiếm binh, lính giáo, lính khiên | 2 | 1 | 3 |
| Lính nỏ | 1 | 2 | 3 |
| **Cung thủ** | 2 | 2 | **4** |
| Kỵ sĩ | 3 | 1 | 4 |
| **Kiểm lâm** (còn được đi tiếp sau khi bắn) | 3 | 2 | **5** |
| Kỵ binh nhẹ | 4 | 1 | 5 |
| **Cung kỵ** | 4 | 2 | **6** |

Cung thủ đe dọa xa hơn kiếm binh (4 so với 3) và không bị phản kích, nên một nhóm cung có thể vừa lùi vừa bắn kiếm binh qua nhiều lượt mà không mất máu.

### 15.2 Thiết kế v2

1. **Vùng khống chế.** Quân trên bộ đi vào ô kề một quân địch **tạo vùng khống chế** thì phải dừng lại ở đó.
   - **Tạo vùng:** bộ binh cận chiến và kỵ binh cận chiến.
   - **Không tạo vùng:** quân đánh xa, cung kỵ, máy công thành, công binh, trinh sát, tàu, quân đang ở trên tàu (theo Civ VI). Nếu cung cũng tạo vùng thì tuyến bộ binh mất ý nghĩa.
   - **Ngoại lệ:** trinh sát và kiểm lâm không bị vùng khống chế giữ lại khi đang ở trong rừng.
   - **Hệ quả:** bộ binh trở thành tấm chắn thật cho cung; cung địch không luồn qua tuyến được; kỵ binh nhanh nhưng không vượt qua được đội hình.
2. **Chí mạng khi đứng yên** (mục 14.2). Cung đứng yên gây ×1,5, cung vừa đi vừa bắn chỉ gây sát thương thường. Thả diều vẫn làm được nhưng kém hiệu quả hơn giữ vị trí.
3. **Bị áp sát thì yếu.** Quân đánh xa (trừ cung kỵ) bị đánh ở ô kề nhận thêm 25% sát thương; lính nỏ mất thế "Ngắm bắn" khi bị đánh.
4. **Phương án dự phòng.** Nếu kiểm thử cân bằng (mục 22) vẫn cho thấy cung thả diều được, thêm "đi rồi bắn chỉ gây ×0,75" cho cung thủ và lính nỏ. Kiểm lâm và cung kỵ không bị áp dụng, vì đi rồi bắn là vai trò của chúng.

AI cần hiểu vùng khống chế: giữ tuyến bộ binh trước cung, tập trung hỏa lực. Điều này khớp với các tình huống AI ở bước 2 của [kế hoạch 1.0](../roadmap.md).

## 16. Thành trì: phòng thủ, vây và giá chiếm thành

### 16.1 Hiện trạng

- Cấp thành 1→3: +5 vàng mỗi cấp và thêm chỗ xây; nâng cấp tốn lương.
- Công sự tối đa 20. Tường thành +20 tối đa và +20 ngay khi xây xong.
- Quân đứng trong thành còn công sự được giảm 2 sát thương.
- Tháp canh (cần Tường thành): đầu mỗi lượt của chủ thành, bắn quân địch máu thấp nhất trong 3 ô, gây `max(1, 5 − giáp)`; tốn thêm 1 vàng duy trì.
- Muốn chiếm: phá công sự về 0, thành không còn quân, rồi dùng bộ binh hoặc kỵ binh chiếm. Thành vừa bị chiếm "ổn định" 2 lượt, sản lượng −50%.

### 16.2 Phòng thủ theo cấp

| Chỉ số | Làng trống | Cấp 1 | Cấp 2 | Cấp 3 | + Tường thành | + Tháp canh |
| --- | --- | --- | --- | --- | --- | --- |
| Công sự tối đa | 0 | 20 | 30 | 40 | +20 | — |
| Thành bắn đầu lượt (ô kề) | — | Chỉ khi có tường: 3 | 4 | 5 | Cho phép bắn từ cấp 1 | Tầm 3, +2 sát thương |
| Tường đánh trả quân cận chiến | — | 2 | 3 | 4 | +1 | — |
| Giảm sát thương cho quân đồn trú (khi công sự > 0) | — | 2 | 2 | 3 | +1 | — |
| HP quân chiếm thành mất khi chiếm | 0 | 2 | 4 | 6 | — | — |

- **Thành bắn đầu lượt:** gộp với cơ chế Tháp canh hiện có. Mỗi thành bắn **tối đa một lần mỗi vòng**, nhắm quân địch máu thấp nhất trong tầm. Theo Civ VI, thành cấp 1 không có tường thì không bắn. Có Tháp canh thì tầm 3 và +2 sát thương, không bắn hai lần. Công sự về 0 thì thành ngừng bắn. Sát thương trừ giáp, tối thiểu 1, không sượt.
- **Tường đánh trả:** chỉ khi quân **cận chiến** đánh vào công sự. Quân đánh xa và máy công thành không bị tường đánh trả.
- **Đánh xa yếu trước tường:** cung, nỏ, kiểm lâm, cung kỵ chỉ gây 50% sát thương công sự (`fortDamage`); máy công thành và chiến hạm giữ nguyên. Hai luật này cho máy công thành một vai trò rõ ràng: muốn hạ thành rẻ thì mang máy công thành và hộ tống.
- **Nâng cấp thành có giá trị phòng thủ**, nên người chơi phải chọn giữa nâng thành (vàng và phòng thủ) với dồn lương nuôi quân.

### 16.3 Thành bị vây

Thành **bị vây** khi mọi ô đất kề đều có quân địch hoặc nằm trong vùng khống chế của địch (mục 15.2). Khi bị vây:

- không dùng được lệnh Sửa công sự;
- quân đồn trú không hồi máu;
- sản lượng của thành −25%.

Ngoài lệnh Sửa (5 vàng + 5 đá, +5 công sự) như hiện tại, thành không tự hồi công sự. Vây thành là một cách "trả giá" khác cho phe tấn công: tốn quân và thời gian giữ vòng vây thay vì lao vào tường.

### 16.4 Giá chiếm thành

- Quân chiếm mất HP theo bảng 16.2. Nếu không đủ HP thì không chiếm được, và bảng dự báo báo trước điều này.
- Thành bị chiếm **tụt một cấp** nếu đang từ cấp 2 trở lên. Một công trình quân sự (xác định theo seed) bị phá; các công trình khác giữ nguyên.
- Giữ cơ chế "ổn định 2 lượt, sản lượng −50%".

### 16.5 Chống thế phòng thủ quá mạnh

- Máy công thành có tầm 3–4, vượt tầm bắn của thành không có Tháp canh.
- Nếu mô phỏng cho thấy ván thường xuyên bế tắc (hai phe không chiếm nổi thành của nhau, ván vượt khoảng 1 giờ), giảm sát thương thành bắn trước, giữ nguyên công sự.
- AI phải biết vây thành: mang máy công thành hoặc dồn quân, không lao từng quân vào tường. Nếu không, AI sẽ yếu hẳn với luật mới.

## 17. Hồi máu và cựu binh

- **Lệnh "Nghỉ":** quân không làm gì khác trong lượt, hồi +3 HP trong lãnh thổ phe mình, +1 HP ngoài lãnh thổ. Quân trong thành bị vây không hồi. Giữ các cơ chế hiện có: +2 HP khi đứng yên trong thành nhà, cứu chữa bằng 3 lương (+4 HP).
- **Cựu binh:** quân hạ đủ 3 địch (tính cả hạ bằng phản kích) được thăng một bậc duy nhất: +3 HP tối đa và hồi đầy máu. Tạo gắn bó với từng quân và khuyến khích giữ quân sống; chỉ một bậc để tránh "quân bất tử". Cần thêm trường đếm số địch đã hạ vào `Unit`, tức đổi schema lưu ván.

Hai cơ chế này đi cùng mục 14.1: quân yếu thì đánh yếu, nên việc rút về nghỉ có giá trị thật.

## 18. Xây dựng: đã có, cần dễ phát hiện hơn

**Đã có trong code:**

| Cơ chế | Cách dùng | Giới hạn |
| --- | --- | --- |
| Công trình trong thành (14 loại) | Chọn thành → tab **Công trình**: nông trại, kho lương, xưởng gỗ, chợ, xưởng cơ khí, chuồng ngựa, lò rèn / lò rèn sắt / xưởng thép, xưởng công thành, tường thành, tháp canh, cảng / xưởng đóng tàu | Cần công nghệ, tài nguyên, chỗ trống theo cấp thành |
| Nâng cấp thành | Tab Công trình → Nâng thành | Tối đa cấp 3 |
| Cải tạo ô đất | Chọn thành → tab **Lãnh thổ**: ruộng (3 cấp), đồng cỏ, khai thác rừng, mỏ đồi, mỏ đá, trồng rừng, đường | Trong vùng 2 ô quanh thành |
| Xây thành mới | Nút hình lâu đài ở góc dưới phải → chọn ô vàng | 45 vàng, 20 lương, 30 gỗ, 15 đá; xong vào lượt sau |
| Công binh | Bắc cầu qua nước, sửa công sự và máy công thành | |
| Giới hạn chung | Mỗi thành xây hoặc cải tạo một lần mỗi lượt | |

Game không có dân phu đi xây trên bản đồ như Age of Empires; thêm hệ đó là một hệ thống mới, ngoài phạm vi tài liệu này.

**Làm cho dễ phát hiện (chỉ giao diện):**

- Nhãn thành có búa nhỏ kèm số khi thành còn thứ xây được trong lượt. Tính bằng `buildingReason` và `improvementReason`, không viết luật riêng.
- Nút **Kết lượt** nhắc một lần "2 thành còn có thể xây", không chặn việc kết lượt.
- Lần đầu chọn thành: một dòng gợi ý "Công trình: tăng sản lượng · Lãnh thổ: cải tạo ô đất". Không dùng chuỗi popup hướng dẫn.
- Tooltip nút xây thành mới ghi rõ giá và điều kiện.

---

# Phần IV — Thực hiện

## 19. Kiến trúc code

**Đồ họa:**

- `src/render/assets/` (mới): danh mục asset, tải trước có thanh tiến trình, bộ nhớ đệm, quay về mô hình dựng bằng code khi tải lỗi.
- `TerrainRenderer`: vẽ hàng loạt theo loại ô và biến thể; sương mù, vùng nhớ và lớp phủ chiến thuật nằm trong shader.
- `UnitRenderer`: mô hình có xương, nhân bản từ bản mẫu, tô màu và biểu tượng phe, `AnimationMixer` chỉ chạy cho quân đang hành động; LOD và chế độ chiến lược theo zoom.
- `CityRenderer`: ghép mô-đun theo khe, gộp tĩnh, chỉ dựng lại khi `level`, `fort`, `buildings`, `job` hoặc `owner` đổi.
- `EffectsRenderer`: kho hạt và đạn dùng chung.
- `World` giữ nguyên API hiện có (`sync`, `focus`, `zoom`, `setVisualSettings`, `onVisualEnd`…) và điều phối các renderer trên, nên App gần như không phải đổi.

**Lối chơi:**

- Engine: `damage` và `previewAttack` thêm các lớp ở mục 14; vùng khống chế trong `reachable`; luật thành và vây; lệnh Nghỉ; cựu binh. `previewAttack` trả thêm khoảng sát thương, tỉ lệ đòn sượt, điều kiện chí mạng và tường đánh trả, để bảng dự báo không phải tự tính.
- Hàm mới dùng chung cho giao diện và AI: tính vùng nguy hiểm từ dữ liệu `observe`.
- Giao diện: bấm một lần để đánh, bảng dự báo, vùng nguy hiểm, hoàn tác, tóm tắt lượt AI, điều khiển cảm ứng, gợi ý xây dựng.

**Phân công gợi ý** (ranh giới module ở [kiến trúc](../architecture.md)): luật, AI và dữ liệu thuộc Codex; render và giao diện thuộc Claude. Việc nào chạm cả hai thì luật làm trước, hiển thị làm sau.

## 20. Quy trình làm asset

1. **Bảng nghệ thuật (art bible):** bảng màu (gồm bảng màu phe an toàn), ánh sáng, tỉ lệ người–ô, độ vát cạnh, bộ biểu tượng phe và 23 biểu tượng loại quân. Dùng GPT vẽ lineup 23 quân, mẫu thành 3 cấp và bộ địa hình, rồi chốt bằng tay.
2. **Tạo mô hình:**
   - Quân cần rig: AI tạo 3D từ ảnh concept (Tripo, Meshy).
   - Thành cần chính xác: Rodin hoặc dựng tay.
   - Mô-đun đơn giản (ô đất, tường): dựng tay trong Blender, vì nhanh và sạch hơn AI ở loại này.
3. **Làm sạch bằng script Blender:** giảm tam giác theo ngân sách, chuẩn hóa tỉ lệ và hướng, gán UV vào bảng màu, tạo mặt nạ phe, nướng AO, tạo LOD1. Đặt tên theo quy ước (`unit_swordsman.glb`, `tile_forest_a.glb`, `city_core_l2.glb`).
4. **Rig và hoạt ảnh:** chung một bộ xương người; rig tự động rồi chỉnh tay. Clip đặt tên chuẩn: `idle`, `walk`, `attack`, `shoot`, `hit`, `die`, `capture`.
5. **Xuất và nén:** glTF → `gltf-transform` (meshopt + KTX2). Giữ file gốc chưa nén ở kho riêng.
6. **Kiểm tra tự động:** script đọc mọi `.glb`, báo lỗi khi vượt ngân sách mục 5, thiếu clip bắt buộc hoặc thiếu mặt nạ phe.
7. **Bản quyền:** dùng gói trả phí cho mọi asset AI dùng thương mại; lưu lại phiên bản điều khoản và prompt của từng asset.

## 21. Lộ trình

Làm **luật trước, asset sau**: luật mới cần hiển thị riêng (vòng, biểu tượng, hiệu ứng), làm đồ họa trước thì phải làm lại. Phần nghệ thuật nền (P0) chạy song song với hai pha luật đầu tiên.

| Pha | Nội dung | Điều kiện đóng |
| --- | --- | --- |
| **L1. Thông tin và điều khiển** | Số HP trên nhãn, bảng dự báo, bấm một lần để đánh, vùng nguy hiểm, gợi ý xây dựng, tóm tắt lượt AI | QA trình duyệt: bấm thẳng vào địch cách 3 ô thì đi và đánh trong một thao tác; vùng nguy hiểm không lộ quân trong sương mù |
| **L2. Công thức nền** | Sức đánh theo máu (sửa lỗi phản kích), vùng khống chế, đánh xa bị áp sát, lệnh Nghỉ | Bảng tái hiện mục 2.2 thành unit test; kịch bản đánh xa đạt (mục 22) |
| **L3. Thành và vây** | Phòng thủ theo cấp, thành bắn, tường đánh trả, bị vây, giá chiếm thành | Kịch bản thành đạt; AI Vừa biết vây thành; mô phỏng không cho thấy ván bế tắc |
| **L4. Bất ngờ có kiểm soát** | Chí mạng có điều kiện, đòn sượt có ngắt chuỗi xui, dao động ±1, cựu binh, tùy chọn chiến đấu cố định | Kiểm thử thống kê đạt; chạy lại toàn bộ kịch bản cân bằng một lần |
| **P0. Nghệ thuật nền + lát cắt dọc** (song song L1–L2) | Art bible; biểu tượng phe và màu an toàn; chế độ chiến lược; shader sương mù mới; địa hình đồng bằng, rừng, nước; 3 quân (lính chùy, kiếm binh, trinh sát); thành cấp 1 | Nhận đúng 3 quân trên ảnh xám và ảnh mô phỏng mù màu; cảnh 60 quân ≤ 300 lệnh vẽ trên desktop, ≤ 150 trên **điện thoại thật** |
| **P1. Toàn bộ quân** (sau L4) | 23 quân + LOD1 + clip; biểu tượng cựu binh, chí mạng | Bài kiểm tra nhận dạng 23 quân đạt; cảnh 60 quân hỗn hợp trong ngân sách |
| **P2. Cảnh quan** | Đủ địa hình, chuyển tiếp, cải tạo, đường, cầu, biên lãnh thổ, rìa sa bàn | Bản đồ 33 × 25 đã khám phá hết vẫn trong ngân sách; sương mù không lộ thông tin |
| **P3. Thành trì** | Lõi 3 cấp + làng, tường + hư hại, cung trên tường, trạng thái bị vây, 14 mô-đun công trình, giàn giáo | Phân biệt được cấp và công trình chính trên ảnh chụp ở zoom chơi |
| **P4. Hiệu ứng + app** | Đạn, hạt, chiếm thành, ba mức chất lượng, tự chọn mức; hoàn tác di chuyển, điều khiển cảm ứng | Benchmark và QA đạt ở mức Vừa và Cao; chơi trọn một ván trên điện thoại bằng cảm ứng |

Không bắt đầu P1 khi P0 chưa đạt ngân sách trên điện thoại thật. Nếu lát cắt dọc không đủ nhẹ thì chỉnh phong cách hoặc ngân sách trước khi sản xuất hàng loạt.

## 22. Đo, kiểm thử và cân bằng

### 22.1 Đồ họa

- Dùng lại `tests/perf/fixture.ts`, `measure.mjs`, `qa.mjs`. Thêm chỉ số: thời gian tải asset lần đầu, bộ nhớ GPU, FPS khi pan và khi giao chiến ở cả ba mức.
- **Bài kiểm tra nhận dạng:** chụp đội hình 23 quân ở zoom chơi với ba bản: màu, xám, mô phỏng mù màu. Một người chưa đọc tài liệu gọi tên từng quân và từng phe. Ghi tỉ lệ đúng và thời gian.
- **Thiết bị:** ít nhất một desktop, một laptop dùng GPU tích hợp, một điện thoại tầm trung. Không tuyên bố đạt cho thiết bị chưa đo.

### 22.2 Luật chiến đấu

- **Unit test:**
  - bảng tái hiện lỗi phản kích (mục 2.2);
  - phản kích trong thành có công sự, với thế "Dựng thương" và "Giữ trận";
  - chọn ô đứng: cận chiến tránh ô bị bao vây, cung chọn tầm tối đa, máy công thành bị loại;
  - vùng khống chế: quân nào tạo vùng, quân nào bị giữ lại, ngoại lệ trong rừng.
- **Thống kê ngẫu nhiên:** 10.000 lần gieo cho mỗi cặp quân. Trung bình nằm trong ±5% giá trị mục tiêu; tỉ lệ đòn sượt lệch không quá 1,5 điểm phần trăm; dự báo luôn chứa kết quả thật.
- **Tái lập:** cùng State và cùng lệnh thì cùng kết quả; lưu rồi tải lại cho kết quả giống hệt.
- **Chống gian lận:** AI không đọc được thông tin ngoài `observe`, kể cả vùng nguy hiểm; AI không tính trước kết quả gieo.

### 22.3 Kịch bản cân bằng

Mỗi kịch bản chạy ít nhất 200 lần với seed khác nhau, cả hai bên dùng cùng một chính sách đơn giản:

| Kịch bản | Mục tiêu |
| --- | --- |
| 2 cung thủ vs 2 kiếm binh, cách 4 ô, đồng bằng | Kiếm binh thắng 40–60% |
| 2 cung + 1 lính khiên vs 3 kiếm binh (cùng tổng giá) | Phe có khiên thắng 50–65% (đội hình hỗn hợp được thưởng) |
| 2 cung kỵ vs 2 lính giáo | Sau 6 lượt, cung kỵ hoặc thua hoặc buộc phải rút |
| 1 kiểm lâm trong rừng vs 1 kỵ binh nhẹ | Kiểm lâm sống ≥ 2 lượt |
| Mọi cặp quân cùng giá, cùng bậc, đồng bằng | Không cặp nào thắng > 70% |
| 3 kiếm binh, không máy công thành, vs thành cấp 2 có tường + 1 lính khiên | Không chiếm được trong 6 lượt, hoặc mất ≥ 2 quân |
| 3 kiếm binh + 1 máy bắn đá vs cùng thành | Chiếm được trong 3–5 lượt, mất ≤ 1 quân |
| 1 lính chùy vs làng trống | Chiếm ngay như hiện tại |
| AI Vừa tấn công thành cấp 1 của người chơi | AI mang máy công thành hoặc vây, không lao từng quân vào tường |

Sau mỗi pha luật: chạy `npm test`, bộ seed bước 1 và các tình huống bước 2 của [kế hoạch 1.0](../roadmap.md), benchmark `tests/perf/`, và đo độ dài ván để phát hiện bế tắc (giới hạn mềm khoảng 1 giờ, mục 1).

## 23. Rủi ro và quyết định cần chốt

| Chủ đề | Rủi ro | Quyết định cần người dùng chốt |
| --- | --- | --- |
| Phong cách | AI tạo 23 quân lệch phong cách nhau | (A) sa bàn low-poly màu phẳng + AO — **đề xuất**; (B) low-poly có texture vẽ tay; (C) voxel |
| Nền tảng app | Ngân sách điện thoại quyết định độ chi tiết | App là vỏ WebView (Capacitor/Tauri) dùng chung code, hay chuyển sang engine khác |
| Chi phí | Gói trả phí công cụ AI; thời gian làm sạch và rig | Ngân sách công cụ; tự làm art bible hay thuê họa sĩ |
| Hiệu năng | Mô hình có xương không vẽ hàng loạt được | Chấp nhận khoảng 1 lệnh vẽ mỗi quân ở ≤ 60 quân; vượt mức đó mới làm hoạt ảnh nướng vào texture |
| Chuyển động môi trường | Phá cơ chế chỉ vẽ khi cần, tốn pin | Chỉ ở mức Cao, 15 FPS |
| Mức ngẫu nhiên | Đòn sượt quá thường làm người chơi khó chịu; hoặc quá hiếm làm trận vẫn dễ đoán | Chỉnh tỉ lệ sượt (10–15% là điểm xuất phát) sau chơi thử; có tùy chọn chiến đấu cố định cho người muốn tắt hẳn |
| Độ phức tạp luật | Nhiều luật mới (vùng khống chế, chí mạng, vây, cựu binh) làm game khó học | Thứ tự L1→L4 cho phép dừng ở bất kỳ pha nào nếu chơi thử thấy đủ |
| Bế tắc | Thành mạnh hơn và hồi máu có thể làm hai phe không chiếm nổi thành của nhau | Không cần chốt; theo dõi bằng giới hạn mềm khoảng 1 giờ ở mục 1 |
| Đổi schema lưu ván | Tùy chọn chiến đấu cố định, cựu binh cần trường mới | Chấp nhận ván cũ không mở được trên v2 |

## Nguồn tham khảo

**Đồ họa và hiệu năng**

- Valve — [Illustrative Rendering in Team Fortress 2](https://www.cs.princeton.edu/courses/archive/fall07/cos597B/papers/mitchell-team-fortress.pdf), [GDC 2008 Stylization With A Purpose](https://cdn.steamstatic.com/apps/valve/2008/GDC2008_StylizationWithAPurpose_TF2.pdf)
- [Shape language in game character design — RocketBrush](https://rocketbrush.com/blog/shape-language-in-game-character-design-how-to-make-characters-readable-and-consistent)
- [Readable game art: why clarity beats detail](https://bugnet.io/blog/readable-game-art-why-clarity-beats-detail)
- [One Draw Call, Massive Crowd — three.js forum](https://discourse.threejs.org/t/one-draw-call-massive-crowd-performance-engineering-in-three-js/89928)
- [Three.js performance optimization best practices](https://metadesignsolutions.com/blog/threejs-performance-optimization-best-practices)
- [Palette mesh optimization](https://dmnshd.gg/blog/palette-mesh-optimization)
- [Three.js glTF compression: Draco, Meshopt, KTX2](https://jvinhit.github.io/blog/threejs-16-gltf-compression-draco-meshopt-ktx2/)
- Công cụ AI 3D — [Triverse](https://triverse.ai/blog/best-ai-3d-model-generators-for-game-dev), [Krea](https://www.krea.ai/blog/best-ai-3d-model-generators-2026), [Meshy — dùng thương mại](https://help.meshy.ai/en/articles/9992001-can-i-use-my-generated-assets-for-commercial-projects), [Tripo — dùng thương mại](https://www.tripo3d.ai/help/privacy-policy/how-to-use-tripo-models-commercially)

**Lối chơi**

- Polytopia — [Unit (wiki)](https://polytopia.fandom.com/wiki/Unit), [Battle Calculator](https://frothfrenzy.github.io/polytopiacalculator/oldindex.html)
- Wargroove — [Damage Formula (wiki)](https://wargroovewiki.com/Damage_Formula), [Siliconera: phỏng vấn về chí mạng](https://www.siliconera.com/wargroove-creator-talks-about-commanders-critical-hits-and-pitch-sessions/), [PC Gamer: units và critical hits](https://www.pcgamer.com/wargroove-units-critical-hits-stats-maps)
- Into the Breach — [80.lv: GDC 2019 Inside Look](https://80.lv/articles/gdc-2019-an-inside-look-at-into-the-breach), [Game Developer: Road to the IGF](https://gamedeveloper.com/game-platforms/road-to-the-igf-subset-games-i-into-the-breach-i-)
- Fire Emblem — [Combat forecast (wiki)](https://www.fireemblemwiki.org/wiki/Combat_forecast), [Engage: xem vùng nhắm của địch](https://primagames.com/tips/how-to-see-enemy-targeting-in-fire-emblem-engage), [FE8U FogDR](https://github.com/Huichelaar/FE8U_FogDR)
- Civilization VI — [Combat (wiki)](https://civilization.fandom.com/wiki/Combat_(Civ6)), [Zone of Control](https://forums.civfanatics.com/resources/civ-vi-zone-of-control-zoc.27611/), [Twinfinite: city ranged attacks](https://twinfinite.net/guides/civilization-vi-how-to-use-ranged-attacks-with-your-citie/)
- XCOM — [Jake Solomon về ngẫu nhiên trong XCOM 2](https://www.gamedeveloper.com/design/jake-solomon-explains-the-careful-use-of-randomness-in-i-xcom-2-i-), [PCGamesN: secret dice rolls](https://www.pcgamesn.com/secret-dice-rolls-xcom-enemy-within)
- Tribal Forts — [App Store](https://apps.apple.com/us/app/-/id6529560286)

**Tiếp cận cho người mù màu**

- [Game Accessibility Guidelines](https://gameaccessibilityguidelines.com/?p=91), [Smashing Magazine: Designing For Colorblindness](https://smashingmagazine.com/2024/02/designing-for-colorblindness), [Creative Assembly: Designing for Colour-Blindness](https://creative-assembly.com/node/8005)
