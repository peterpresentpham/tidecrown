# Bước 3 — Bản đồ nước và AI hải quân

Triển khai tại repo nation gốc, ngày 14/11/2026. Không stage/commit. Không thêm công nghệ hoặc quân ngoài 45 nút/23 loại đang có. Đây là hoàn thiện chức năng; cân bằng giá và tốc độ chiến dịch thuộc bước 4.

## Bản đồ và cách thử

Menu → Ván mới → **Hai bờ biển**. Chọn độ khó, 1–3 AI và mã bản đồ như trước. Kiểu mặc định vẫn là Đất liền. Muốn có địa hình mới phải bắt đầu ván mới; đổi code không tự biến địa hình ván đang lưu.

Bản đồ 33 × 25, 9/12/15 thành và làng; hai bờ đất nối nội bộ bằng hành lang đi được, ngăn bởi eo biển rộng ba ô kéo hết bản đồ. Không có đường bộ vòng qua mép hoặc cầu một ô nối tắt eo biển. Vị trí, địa hình, hướng lật và làng thay đổi theo mã. Mỗi thủ đô có bờ nước xây cảng; làng đầu cách bốn ô, chiếm được trong hai lượt. Các thủ đô chưa nhìn thấy nhau ở lượt đầu. Với 2–3 AI có thể gặp một phe trên cùng bờ trước khi sang biển.

Nghiên cứu Gia công gỗ → Hàng hải, xây cảng tại thành ven biển, tuyển thuyền trinh sát. Học Tàu vận tải để tuyển tàu chở quân. Chọn quân bộ đứng kề, dùng Lên tàu; chọn hành khách và bãi trống kề tàu để Đổ bộ. Lên/xuống tàu dùng hành động của quân; chiếm làng từ lượt sau. Thành địch không phải bãi đổ bộ. Sáu chỗ tính theo trọng lượng (bộ thường 1, kỵ/giáp nặng 2, máy 3). Tàu chìm mất cả hành khách. Buồm mở biển xa; eo biển trung tâm đủ gần bờ cho tàu ban đầu đi được.

## Quyết định của AI

`src/ai/naval.ts` chỉ nhận thế giới đã lọc qua `observe`, giống AI bộ. Mục tiêu được dựng lại từ cảng nhà, quân trên tàu, thành đã biết và các vùng đất đã khám phá; không có thông tin thật về thành/quân trong sương mù, không thêm trạng thái nhiệm vụ vào save.

- Thuyền trinh sát tìm bờ, làng và đường biển; tàu vận tải chờ mục tiêu đã biết, có đường biển đã khảo sát và bãi lên bờ hợp lệ.
- Gom một quân có khả năng chiếm đất trước, giữ lại ít nhất một quân chiếm đất trên bờ nhà; có thể ghép thêm quân hỗ trợ khi còn chỗ. Quân được dành cho vận tải không bị AI bộ kéo đi trong cùng quyết định.
- Chiến hạm được ưu tiên làm hộ tống; thuyền trinh sát có thể đi kèm khi chưa có chiến hạm. Hộ tống tiến/nhường đường trước, vận tải giữ khoảng cách hai ô khi đã phân công hộ tống. Tàu chiến ưu tiên bắn mục tiêu đe dọa vận tải.
- Đánh giá vũ khí địch đang thấy để chọn bãi/đường an toàn hơn, chờ hoặc lùi khi mức nguy hiểm vượt che chắn. Đây là ước lượng chiến thuật cục bộ, không bảo đảm thắng mọi hải chiến.
- Thả cả quân tiên phong lẫn hỗ trợ ở bờ mục tiêu; quân đã đổ bộ chuyển cho AI bộ. Tàu rỗng trở lại cảng gốc, không đón lại chính đội vừa đổ bộ. Bãi kín thì chờ/tìm bãi khác, không ra lệnh đổ bộ bất hợp lệ.
- Ưu tiên kinh tế tối thiểu, công nghệ biển, cảng, thuyền trinh sát và vận tải; giữ ngân sách và chỗ quân cho hải quân. Khi có hàng/quân địch trên biển, tiến tới Buồm/Chiến hạm/xưởng tàu; chiến hạm nặng được tuyển khi đã có công nghệ và đủ ngân sách. Không cấp miễn phí tàu, công nghệ, tài nguyên hay tầm nhìn cho AI.
- Công binh có thể bắc một cầu ngắn đã biết nối hai vùng đất; luật gốc vẫn kiểm tra hai bờ, chi phí và tàu đang chiếm ô cầu. Không bắc được eo biển ba ô.

## Ma trận đối chiếu nội dung hiện có

| Nội dung | Tuyển/mở khóa/giá/cơ sở/lưu | Vai trò và AI | Hiển thị |
| --- | --- | --- | --- |
| 45 công nghệ, bảy nhánh | `research.test.ts`: nghiên cứu đủ 45 trong một ván, round-trip; không khóa nhánh | Công nghệ kinh tế có luật sản xuất; quân/công trình mở qua điều kiện hiện có | Cây, màu và đường điều kiện giữ bản đã có |
| Chùy, trinh sát, khiên, giáo, kiếm, thương dài, bộ giáp nặng | `units.test.ts`: tuyển đúng điều kiện, đợi lượt sau, save | Chiếm đất/tuyến trước/giữ trận/khắc chế, kiểm tra ở `units.test.ts`, `tactics.test.ts` | Mô hình và hoạt ảnh đi/đánh hiện có |
| Cung, kiểm lâm, nỏ | Cùng ma trận tuyển 23 loại | Tầm xa, rút sau bắn/ngắm/xuyên giáp; AI giữ sau tuyến và tập trung hỏa lực | Đạn và tác động hiện có |
| Kỵ nhẹ, cung kỵ, kỵ sĩ, kỵ giáp nặng, Paladin | Cùng ma trận tuyển; chuồng/nguyên liệu/cơ sở giữ đúng | Xung phong, bắn-rút, cứu chữa; AI chữa/rút có scenario bước 2. Không khẳng định một chiến dịch tự tuyển đủ mọi biến thể | Đi/đánh/chữa hiện có |
| Ballista, máy bắn đá, trebuchet, công binh | Cùng ma trận tuyển và save | Phá tường/đường bắn/triển khai, AI hộ tống máy; sửa và cầu được kiểm tra luật | Đạn/sửa/xây hiện có |
| Thuyền trinh sát | Cảng + Hàng hải; nước, tầm nhìn 4; `units.test.ts` | Khám phá biển và hộ tống ban đầu; ván thường tự đóng được | Thuyền đi/bắn hiện có |
| Vận tải | Cảng + Vận tải; sáu chỗ, trọng lượng, save và chìm | Gom quân, vượt biển, thả quân, về cảng; `naval.test.ts` và scenario trình duyệt | Lên/xuống/đi đồng bộ sự kiện hiện có |
| Chiến hạm | Xưởng tàu + Chiến hạm; đúng giá/duy trì | Hộ tống trong scenario, bắn bảo vệ vận tải | Thuyền/đạn hải chiến hiện có |
| Chiến hạm nặng | Xưởng tàu + công nghệ tương ứng; đúng giá/duy trì | Tầm 3/xuyên giáp; AI dùng làm hộ tống và tuyển khi thấy nguy cơ, đã mở công nghệ | Mô hình/đạn hiện có |

Không viết lại hệ render/animation trong bước này, tránh chồng phần UI/hiệu năng Claude. Các bài kiểm tra logic không thay thế nghiệm thu cảm giác hoạt ảnh hoặc FPS ở bước 5.

## Bằng chứng kiểm tra

- `npm test`: 117/117; gồm bộ 30 mã pace và thêm 10 mã cho mỗi cấu hình 2/3 AI của bước 1, các scenario bộ bước 2, 45 công nghệ và 23 đơn vị.
- `tests/naval.test.ts`: 60 bản đồ (20 mã × 1/2/3 AI) cho hai vùng đất, thủ đô ven biển, khoảng cách làng, sinh lặp lại, fog và save. Thêm 30 bản đồ kiểm tra tuyến biển gần bờ tới bờ đối diện, tám mã chiếm làng đầu hai lượt.
- Scenario AI: lên cả lính chiếm đất/cung, hộ tống qua biển, thả hết hàng, chiếm làng; mỗi bước đi vận tải có hàng kiểm tra hộ tống trong hai ô. Kiểm tra tàu rỗng về nhà, hỗ trợ xuống sau tiên phong, bãi bị chặn rồi mở lại, địch mạnh và không dùng thông tin ẩn. Kịch bản lệnh thủ công cũng đổ bộ rồi chiếm được làng theo đúng lượt.
- `node --import tsx scripts/measure-navy.ts`: nhật ký [step3-naval-summary.json](../measurements/step3-naval-summary.json), mã `naval-campaign`, người chơi chỉ kết lượt, tối đa 60 vòng, không cấp tài nguyên/công nghệ. Vừa/1 AI: trinh sát biển 13, vận tải 24, lên tàu 25, đổ bộ 26, thắng 47; sáu lệnh lên/bốn lệnh xuống. Dễ/2 AI: vận tải 20, lên 23; người chơi bị phe cùng bờ loại ở 24 trước khi có đổ bộ. Khó/3 AI: vận tải 17, lên 24, xuống 25, người chơi bị loại 25. Không gọi cấu hình 2 AI là một ván đã chứng minh đổ bộ.
- Trình duyệt dev 1280 × 720: chọn Hai bờ biển, khởi tạo, reload giữ thành/tài nguyên/địa hình; scenario `/tests/naval.html` lên hai quân lượt 1, đổ bộ lượt 2, chiếm Bến đối diện lượt 3, tàu quay về. Không ghi ván scenario vào localStorage. Không có console error trong scenario.
- `npm run build`: TypeScript và Vite qua; còn cảnh báo bundle >500 kB đã có. Production preview ở cổng 3010: reload ván, mở lại thiết lập thấy Hai bờ biển vẫn được chọn; không có console error. Screenshot cục bộ: `artifacts/step3-production.png` (không stage artifact).

## Giới hạn và bước tiếp

Bản đồ là hai bờ ngẫu nhiên, không phải trình sinh nhiều quần đảo. AI có thể đổ bộ bằng thuyền trinh sát đi kèm nếu khu vực chưa có địch; chiến hạm yêu cầu kinh tế và công nghệ thật, không buộc mọi chuyến phải có chiến hạm mới được khởi hành. Mức đe dọa/bãi/mục tiêu suy ra lại mỗi quyết định, chưa có chiến dịch hải quân nhiều mũi hoặc phong tỏa hậu cần. Chưa đo cân bằng trên nhiều mã và người chơi chủ động; mốc thắng người chơi đứng yên không phải thời lượng một ván người chơi thật.

Phần chức năng hải quân/bản đồ nước của bước 3 đã kiểm chứng. Tiếp theo là bước 4: cân bằng ba hướng mở đầu và ghi ván hoàn chỉnh; bước 5/Claude vẫn cần ghép và nghiệm thu UX/hiệu năng theo kế hoạch 06. Không tự thêm hệ thống hoặc kéo dài phạm vi.
