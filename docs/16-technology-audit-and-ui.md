# Rà soát cây công nghệ và giao diện — 0.7.0

Ngày 14/11/2026. Bản chạy có 45 công nghệ, 7 nhánh, 23 đơn vị. Tất cả nhánh mở được trong cùng một ván; mọi điều kiện là AND, không có lựa chọn khóa vĩnh viễn nhánh khác.

## Cơ sở thiết kế

Tham khảo [hướng dẫn quân sự và kinh tế chính thức của Age of Empires II](https://www.ageofempires.com/learn-to-play/military-and-economy-aoe2/): phân biệt bộ binh, cung, kỵ và máy công thành theo vai trò, cơ sở huấn luyện; kinh tế hỗ trợ việc duy trì quân. Từ đó, thiết kế của Nation dùng kiến thức vật liệu, cách chế tạo và kỹ năng huấn luyện để giải thích điều kiện. Các liên kết cụ thể bên dưới là quyết định thiết kế của Nation, không phải sao chép cây AoE II hay khẳng định chính xác lịch sử.

[W3C: Use of Color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) yêu cầu thông tin không chỉ dựa vào màu. Giao diện ghép màu với biểu tượng, chữ trạng thái và lý do thiếu điều kiện. Chưa tuyên bố kiểm định WCAG toàn ứng dụng.

## Những điều chỉnh chính

- Chế biến gỗ → Mộc cao cấp. Quản lý rừng là chuyên môn kinh tế, không chặn quân đội.
- Ngựa → Kỵ nhẹ; Kỵ nhẹ + Cung thuật → Kỵ xạ. Kiểm lâm không chặn kỵ binh.
- Rèn sắt → Kiếm thuật; Kỵ nhẹ + Rèn sắt → Kỵ sĩ. Không cần học giáo binh hoặc kiếm binh để cưỡi ngựa.
- Thiết kỵ → Paladin, chuyển Paladin sang nhánh kỵ binh; không bắt học bộ binh giáp nặng.
- Đường bộ + Mộc cao cấp → Công binh; công binh tuyển tại xưởng cơ khí, không đòi xưởng công thành. Thủy lợi không còn gián tiếp buộc nghiên cứu chiến tranh.
- Tàu vận tải → Chiến thuật đổ bộ; không cần công binh.
- Mỗi nút có tối đa hai điều kiện trực tiếp; các liên kết bổ trợ vẫn tạo lựa chọn thứ tự đầu tư. Một nghiên cứu đồng thời, chi phí và thời gian tạo đánh đổi, không khóa nội dung.

## Giao diện và trạng thái

Nhánh theo hàng, mức phát triển theo bốn cột. Cột chỉ là mức độ chuyên môn, không phải thời đại bắt buộc. Điều kiện hiện bằng nhãn bấm được và đường nối có mũi tên. Đường tự tìm lối qua khoảng trống giữa các thẻ, không đi xuyên nội dung thẻ. Chọn một công nghệ làm nổi bật toàn bộ tập điều kiện tổ tiên (AND), kể cả điều kiện đã hoàn tất; các cạnh khác giữ nét mờ. Cạnh trong chuỗi đã hoàn tất có màu xanh dương, cạnh còn cần mở có màu vàng. Tìm kiếm hỗ trợ tiếng Việt không dấu; lọc theo nhánh/trạng thái; chọn đơn vị để xem toàn bộ tập công nghệ tổ tiên cần mở. Bảng bên phải giải thích tác dụng, giá, điều kiện và lý do của từng nút.

- **Xanh sáng / Nghiên cứu được:** đủ kiến thức, đủ cả bốn tài nguyên, có thành ổn định, tới lượt, chưa có nghiên cứu khác và ván chưa kết thúc.
- **Vàng / Đang nghiên cứu:** hiển thị lượt còn lại.
- **Xanh dương / Đã nghiên cứu:** kèm dấu tích.
- **Xám / Chưa mở:** ghi công nghệ còn thiếu.
- **Thiếu tài nguyên:** chỉ rõ số lượng thiếu, không tô như nút sẵn sàng.
- **Chờ:** phân biệt chờ nghiên cứu, chờ lượt hoặc chờ thành ổn định.

Nút **Chỉ xem đường này** gom riêng toàn bộ điều kiện theo thứ tự trước/sau, có nút bỏ mục tiêu để trở về cây đầy đủ. Nếu bộ lọc đang giấu điều kiện, nút **Hiện đủ đường** bỏ bộ lọc và hiển thị toàn bộ chuỗi. Đường được đo lại khi thẻ thay đổi kích thước hoặc đổi bộ lọc, không chạy vòng hoạt ảnh liên tục.

Engine và giao diện dùng chung researchStatus, tránh nút sáng nhưng thao tác bị từ chối. Nghiên cứu mở quyền tuyển/xây; công trình và chi phí tuyển quân vẫn áp dụng.

## Toàn bộ điều kiện hiện hành

| Mã | Công nghệ | Nhánh | Điều kiện trực tiếp | Lý do |
| --- | --- | --- | --- | --- |
| E1 | Nông nghiệp | Lương thực & hạ tầng | Không | Nền trồng trọt, có thể học ngay từ đầu. |
| E2 | Kho lương | Lương thực & hạ tầng | Nông nghiệp | Trồng trọt tạo ra lương thực cần bảo quản. |
| E3 | Thâm canh | Lương thực & hạ tầng | Nông nghiệp | Phát triển kỹ thuật canh tác từ nông nghiệp; không cần học kho lương trước. |
| E4 | Thủy lợi | Lương thực & hạ tầng | Thâm canh + Công binh | Canh tác thâm canh kết hợp kỹ thuật công trình để xây mạng tưới. |
| E5 | Chăn nuôi | Lương thực & hạ tầng | Nông nghiệp | Chăn nuôi phát triển trên nguồn thức ăn từ nông nghiệp. |
| E6 | Thuần dưỡng ngựa | Lương thực & hạ tầng | Chăn nuôi | Thuần dưỡng ngựa là chuyên môn tiếp theo của chăn nuôi. |
| E7 | Thương mại | Lương thực & hạ tầng | Không | Trao đổi hàng hóa là hướng phát triển độc lập, không bắt buộc học kho lương. |
| E8 | Đường bộ | Lương thực & hạ tầng | Chế tác đá | Chế tác đá cung cấp nền móng và vật liệu làm đường; không bắt buộc học thương mại. |
| M1 | Chế biến gỗ | Tài nguyên & luyện kim | Không | Nền gia công gỗ, có thể học ngay từ đầu. |
| M2 | Quản lý rừng | Tài nguyên & luyện kim | Chế biến gỗ | Chuyên môn quản lý nguồn gỗ và trồng rừng; không phải điều kiện để chế tạo vũ khí. |
| M3 | Mộc cao cấp | Tài nguyên & luyện kim | Chế biến gỗ | Gia công chính xác và cơ cấu gỗ phát triển trực tiếp từ chế biến gỗ. |
| M4 | Khai khoáng | Tài nguyên & luyện kim | Không | Nền khai thác khoáng sản, có thể học ngay từ đầu. |
| M5 | Chế tác đá | Tài nguyên & luyện kim | Khai khoáng | Phân nhánh khai khoáng theo hướng xử lý vật liệu đá. |
| M6 | Luyện kim | Tài nguyên & luyện kim | Khai khoáng | Phân nhánh khai khoáng theo hướng luyện kim. |
| M7 | Rèn sắt | Tài nguyên & luyện kim | Luyện kim | Chuyên sâu từ luyện kim sang rèn sắt. |
| M8 | Luyện thép | Tài nguyên & luyện kim | Rèn sắt | Luyện thép tiếp nối rèn sắt; không bắt học nghề mộc. |
| I1 | Khiên trận | Bộ binh | Chế biến gỗ | Gia công gỗ đủ làm nền cho khiên và huấn luyện đội hình khiên. |
| I2 | Giáo binh | Bộ binh | Luyện kim | Vũ khí mũi kim loại dựa trên luyện kim. |
| I3 | Kiếm thuật | Bộ binh | Rèn sắt | Kiếm thuật dựa trên vũ khí rèn sắt; không cần mở giáo binh. |
| I4 | Thương dài | Bộ binh | Giáo binh + Chế biến gỗ | Kết hợp đội hình giáo với kỹ thuật làm cán gỗ dài. |
| I5 | Bộ binh giáp nặng | Bộ binh | Kiếm thuật + Luyện thép | Kết hợp chiến đấu bộ binh dùng kiếm và giáp thép. |
| R1 | Cung thuật | Cung & nỏ | Chế biến gỗ | Gia công gỗ tạo nền chế tạo cung. |
| R2 | Kiểm lâm | Cung & nỏ | Cung thuật + Trinh sát | Kết hợp cung thuật với kỹ năng trinh sát; không cần quản lý rừng kinh tế. |
| R3 | Chế tạo nỏ | Cung & nỏ | Mộc cao cấp + Luyện kim | Nỏ là cơ cấu gỗ chính xác kết hợp kim loại; không bắt học đơn vị cung thủ. |
| R4 | Xạ kích chính xác | Cung & nỏ | Chế tạo nỏ | Chuyên môn ngắm bắn của lính nỏ, không phụ thuộc luyện kim nâng cao. |
| C1 | Trinh sát | Trinh sát & kỵ binh | Không | Trinh sát bộ là lựa chọn mở đầu độc lập. |
| C2 | Kỵ binh nhẹ | Trinh sát & kỵ binh | Thuần dưỡng ngựa | Thuần dưỡng ngựa mở nền huấn luyện kỵ binh; không cần mở trinh sát bộ. |
| C3 | Kỵ xạ | Trinh sát & kỵ binh | Kỵ binh nhẹ + Cung thuật | Kết hợp cưỡi ngựa và cung thuật; không cần mở kiểm lâm. |
| C4 | Kỵ sĩ | Trinh sát & kỵ binh | Kỵ binh nhẹ + Rèn sắt | Kết hợp kỵ binh với trang bị rèn sắt; không cần mở kiếm binh hoặc giáo binh. |
| C5 | Thiết kỵ | Trinh sát & kỵ binh | Kỵ sĩ + Luyện thép | Nâng kỵ sĩ bằng giáp thép. |
| C6 | Con đường Paladin | Trinh sát & kỵ binh | Thiết kỵ | Chuyên môn cứu chữa của kỵ binh tinh nhuệ; không cần đi qua bộ binh nặng. |
| S1 | Kỹ thuật công thành | Công trình & công thành | Mộc cao cấp + Luyện kim | Máy chiến tranh kết hợp cơ khí gỗ với kim loại. |
| S2 | Ballista | Công trình & công thành | Kỹ thuật công thành + Chế tạo nỏ | Ballista kết hợp nguyên lý nỏ với kỹ thuật chế tạo máy công thành. |
| S3 | Máy bắn đá | Công trình & công thành | Kỹ thuật công thành | Máy bắn đá phát triển từ kỹ thuật công thành; đá là chi phí chế tạo, không bắt nâng mỏ đá. |
| S4 | Hậu cần vây hãm | Công trình & công thành | Kỹ thuật công thành + Đường bộ | Kết hợp kỹ thuật máy với đường bộ để tổ chức vận chuyển và triển khai. |
| S5 | Trebuchet | Công trình & công thành | Máy bắn đá + Hậu cần vây hãm | Phát triển catapult thành máy lớn, có hậu cần triển khai; không bắt học giáp thép. |
| S6 | Tường thành | Công trình & công thành | Chế tác đá | Công trình phòng thủ dựa trên chế tác đá. |
| S7 | Tháp canh | Công trình & công thành | Tường thành + Cung thuật | Kết hợp công trình phòng thủ với cung thủ giữ tháp. |
| S8 | Công binh | Công trình & công thành | Đường bộ + Mộc cao cấp | Kết hợp hạ tầng đường bộ và cơ khí gỗ để làm cầu, sửa chữa; không cần học phá thành. |
| N1 | Hàng hải | Hàng hải | Chế biến gỗ | Đóng thuyền bắt đầu từ gia công gỗ. |
| N2 | Tàu vận tải | Hàng hải | Hàng hải | Tàu chở quân phát triển trực tiếp từ hàng hải. |
| N3 | Buồm và đóng tàu | Hàng hải | Hàng hải + Mộc cao cấp | Kết hợp hàng hải với kỹ thuật đóng thân tàu và cơ cấu gỗ tốt hơn. |
| N4 | Chiến hạm | Hàng hải | Buồm và đóng tàu + Cung thuật | Kết hợp tàu đi biển với vũ khí bắn xa. |
| N5 | Chiến hạm hạng nặng | Hàng hải | Chiến hạm + Ballista | Lắp vũ khí ballista lên nền chiến hạm. |
| N6 | Chiến thuật đổ bộ | Hàng hải | Tàu vận tải | Chuyên môn lên bờ của lực lượng vận tải; không bắt học công binh hoặc công thành. |

## Dữ liệu phát triển và kiểm tra

Schema 7, khóa lưu nation-tech-v7. Không chuyển các ván schema cũ; người chơi bắt đầu ván mới. Đây là quyết định phát triển đã được người dùng cho phép. Không thêm lớp tương thích với luật cũ.

Kiểm thử bao gồm mở đủ 45 nút trong một ván, tuyển quân/công trình, đường nghiên cứu không dính nhánh không liên quan, trạng thái sáng khớp quyền thực thi, tài nguyên thiếu, hàng đợi và vòng lưu/đọc schema mới.
