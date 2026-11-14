# Thiết kế kỹ thuật dự kiến

> Tài liệu ý tưởng ban đầu, có các luật/phạm vi đã thay đổi. Không dùng làm checklist bắt buộc cho bản đầu. Phạm vi và điểm dừng hiện hành ở [06 — Kế hoạch 1.0](06-roadmap.md); bản đang chạy ở [08](08-prototype.md).
Đây là kiến trúc đề xuất, chưa chọn hay cài phiên bản thư viện. Trước khi triển khai cần kiểm tra tài liệu chính thức và khả năng tương thích của các phiên bản thực tế.

## Stack và ranh giới

Đề xuất TypeScript, Vite, React cho UI và Three.js cho cảnh 3D. Mô phỏng dùng TypeScript thuần, không phụ thuộc React, WebGL hoặc DOM. Bản đầu chạy cục bộ trong trình duyệt, không cần tài khoản hay backend.

Luồng dữ liệu: UI gửi command → mô phỏng kiểm tra → tạo trạng thái mới và events → renderer diễn hoạt ảnh → UI cập nhật. Mô phỏng xác định kết quả trước hoạt ảnh. Tăng tốc hoặc bỏ hoạt ảnh không làm thay đổi luật.

## Cấu trúc dự kiến

```text
src/
  game/         # state, commands, validation, turn, combat, supply
  data/         # units, buildings, technologies, balance
  map/          # hex, generation, pathfinding, visibility
  ai/           # observation, scoring, planning
  render/       # scene, camera, models, animation, picking
  ui/           # HUD, panels, dialogs, tooltips
  persistence/  # save schema, migration, local storage adapter
  audio/        # effects, volume, mute
```

## Trạng thái chuẩn

- `GameState`: phiên bản schema, seed, trạng thái RNG, vòng, phe hiện tại, trạng thái kết thúc.
- `Tile`: tọa độ axial, địa hình, cao độ, đường, thành nếu có.
- `Faction`: kho tài nguyên, công nghệ, nghiên cứu hiện tại, thủ đô, bộ đếm mục tiêu.
- `City`: chủ sở hữu, cấp, công sự, chuyên môn, cảng, tháp, hàng đợi, lượt ổn định, hạn mức tuyển/sửa.
- `Unit`: loại, phe, ô hoặc tàu đang chở, HP, điểm đi, hành động, phản kích, thế thủ, lựa chọn kỳ cựu, hoạt động lượt trước.
- `Knowledge`: ô khám phá, ô đang thấy và thông tin thành cũ theo từng phe.

Lãnh thổ, tiếp viện và vùng di chuyển là dữ liệu suy ra có cache; không để cache trở thành nguồn sự thật khác với state.

## Command và tính xác định

Các lệnh chính: MoveUnit, Attack, CaptureCity, RecruitUnit, StartResearch, StartConstruction, BuildRoad, RepairFortification, SetGuard, UpgradeVeteran, Embark, Disembark, ChooseCapital, EndTurn.

Mỗi lệnh kiểm tra đúng phe, trạng thái game, điều kiện mở khóa, tài nguyên, vị trí, tầm nhìn và hành động còn lại. Lệnh không hợp lệ trả mã lý do, không thay đổi state một phần. UI preview gọi cùng logic tính toán với lệnh thực thi.

Sử dụng RNG có seed cho sinh map và các lựa chọn hòa điểm của AI. Chiến đấu MVP không ngẫu nhiên. Lưu thứ tự thực thể ổn định; cùng state và command phải cho cùng kết quả, độc lập tốc độ render.

## Sinh bản đồ

Sinh địa hình từ seed → đảm bảo vị trí ba phe → đặt bảy thành và ba mục tiêu → đặt địa hình, cảng tiềm năng và cầu → kiểm tra khả năng tiếp cận.

Điều kiện chấp nhận: mỗi phe có ít nhất một mục tiêu tiếp cận được; có đường đến biển và đủ không gian tuyển quân; các đảo có bờ hợp lệ để lên/xuống tàu; không có mục tiêu bị núi bao kín. So sánh khoảng cách mở rộng và tài nguyên mở đầu giữa các phe. Nếu seed không đạt, sinh lại với số lần giới hạn rồi dùng seed dự phòng đã kiểm thử.

## AI

AI nhận một observation đã lọc theo sương mù. Không truyền toàn bộ GameState có quân ẩn vào bộ chọn mục tiêu. Lưu trí nhớ riêng về vị trí địch nhìn thấy trước đó, đánh dấu tuổi thông tin.

Các bước: đánh giá nguy cơ mất thành → bảo vệ đơn vị công thành/vận tải → chọn mục tiêu lãnh thổ → cấp nhiệm vụ cho quân → chi kinh tế và nghiên cứu → thực hiện lệnh hợp lệ → kết lượt.

AI cơ bản ưu tiên mục tiêu gần và dùng counter quân. AI nâng cao thử phối hợp, cắt tiếp viện và rút đơn vị yếu. Mốc MVP chỉ yêu cầu một AI chơi đủ luật; độ khó nhiều cấp làm sau khi đo được chất lượng. Không thưởng tài nguyên ngầm.

Giới hạn ngân sách tính toán theo lượt. Nếu quá hạn, thực hiện phương án tốt nhất đã có và kết lượt; không để UI treo. Có thể đưa AI sang Web Worker khi profiling cho thấy cần.

## Lưu game

Ưu tiên IndexedDB sau lớp adapter có thể thay bằng bộ nhớ cho kiểm thử. Lưu state ở điểm command hoàn tất, khi không còn giao dịch đang áp dụng; hoạt ảnh chưa xong không ngăn lưu kết quả đã xác định. Lưu trước khi chuyển sang AI và sau khi AI kết lượt.

Mỗi bản lưu chứa schemaVersion, buildVersion, seed và thời điểm lưu. Ghi vào bản tạm rồi thay bản chính sau thành công; giữ một bản trước đó. Bản không tương thích phải được phát hiện, không âm thầm reset hoặc ghi đè. Cho phép xuất/nhập JSON ở công cụ debug; UI phát hành có thể thêm sau.

## Hiệu năng và khả năng truy cập

Mục tiêu ban đầu: 60 FPS trên máy phát triển ở 1080p, tối thiểu 30 FPS trên một laptop đồ họa tích hợp được ghi rõ khi thử nghiệm. Đây là mục tiêu cần đo, không phải bảo đảm mọi thiết bị.

Đo trên bản đồ tiêu chuẩn với tối đa 60 thực thể quân/tàu và toàn bộ trang trí. Lượt AI mục tiêu dưới 2 giây/phe, không tính hoạt ảnh. Nếu không đạt, ưu tiên giảm draw calls, bóng và chi tiết trang trí trước.

Phím tắt có nhãn; nút dùng được bằng bàn phím; trạng thái không chỉ phân biệt bằng màu; tùy chọn giảm chuyển động, tăng tốc và tắt âm. Nếu WebGL không khả dụng, hiển thị thông báo rõ ràng thay vì màn hình trống.

## Kiểm thử cần thiết

- Unit: công thức sát thương, phản kích, chiếm thành, thời điểm tác vụ, mở khóa công nghệ.
- Scenario: cắt/nối tiếp viện, phong tỏa, tàu chìm có quân, mất thành nghiên cứu, thiếu lương, đổi thủ đô.
- Invariant: không âm tài nguyên sau xử lý, không hai quân cùng ô, không hành động sai lượt, không công nghệ có prerequisite vòng tròn.
- Determinism: cùng seed và command log cho cùng state cuối.
- Save round-trip: lưu/đọc giữ nguyên trạng thái và lượt kế tiếp.
- UI smoke: bắt đầu ván → tuyển → di chuyển → đánh → nghiên cứu → kết lượt → tải lại → tiếp tục.
- Playtest: kiểm tra chiến thuật, độ rõ và thời lượng; unit test không thay thế phần này.
