# Quy tắc làm việc cho mọi coding agent

## Git — người dùng commit thủ công

- Không tự ý tạo commit. Chỉ chạy `git commit` khi người dùng yêu cầu rõ ràng trong chat hiện tại. Yêu cầu implement, sửa code, kiểm thử hoặc bàn giao không phải là yêu cầu commit.
- Mặc định để thay đổi trong working tree để người dùng tự review và commit; không tự chạy `git add` hoặc thay đổi staging khi chưa được yêu cầu.
- Không dùng merge/cherry-pick hay công cụ khác để tạo commit gián tiếp nếu người dùng chưa yêu cầu thao tác đó rõ ràng.
- Không tự reset, amend, revert hoặc viết lại các commit đã có để xử lý việc trước đây đã commit. Chỉ thực hiện khi được người dùng yêu cầu.
- Bàn giao bằng danh sách file thay đổi, kết quả kiểm thử và các giới hạn còn lại. Không coi commit là điều kiện hoàn thành công việc.
- Quy tắc này áp dụng cho Codex, Claude và mọi agent trong repo/worktree; thay thế các hướng dẫn cũ yêu cầu tự tạo commit trong tài liệu giao việc.

## Lint và định dạng

- ESLint 10 (flat config, `eslint.config.mjs`) + Prettier (`.prettierrc`). Prettier bỏ qua `docs/` và `artifacts/` để giữ bảng markdown và số đo.
- Được chạy mà không cần hỏi: `npm run lint`, `npm run lint:fix`, `npm run format`, `npm run format:check`, `npm run typecheck`, `npm test`, `npm run build`.
- `npm run check` chạy toàn bộ: format, lint, typecheck, test, build. Sau khi sửa code, chạy ít nhất `npm run format` và `npm run lint`.

## Việc tốn thời gian — hỏi trước

- Không tự ý chạy test hoặc phép đo tốn thời gian: self-play (`npm run selfplay`), benchmark, đo hiệu năng, mô phỏng nhiều ván, chụp ảnh/quay trình duyệt hàng loạt, hoặc bất kỳ lệnh nào dự kiến chạy quá khoảng 1 phút.
- Nếu cần, hỏi người dùng trước. Nêu lệnh định chạy, lý do và thời gian ước tính, rồi chờ đồng ý trong chat hiện tại.
- Đồng ý cho một lần chạy không áp dụng cho các lần sau.
