# Quy tắc làm việc cho mọi coding agent

## Git — người dùng commit thủ công

- Không tự ý tạo commit. Chỉ chạy `git commit` khi người dùng yêu cầu rõ ràng trong chat hiện tại. Yêu cầu implement, sửa code, kiểm thử hoặc bàn giao không phải là yêu cầu commit.
- Mặc định để thay đổi trong working tree để người dùng tự review và commit; không tự chạy `git add` hoặc thay đổi staging khi chưa được yêu cầu.
- Không dùng merge/cherry-pick hay công cụ khác để tạo commit gián tiếp nếu người dùng chưa yêu cầu thao tác đó rõ ràng.
- Không tự reset, amend, revert hoặc viết lại các commit đã có để xử lý việc trước đây đã commit. Chỉ thực hiện khi được người dùng yêu cầu.
- Bàn giao bằng danh sách file thay đổi, kết quả kiểm thử và các giới hạn còn lại. Không coi commit là điều kiện hoàn thành công việc.
- Quy tắc này áp dụng cho Codex, Claude và mọi agent trong repo/worktree; thay thế các hướng dẫn cũ yêu cầu tự tạo commit trong tài liệu giao việc.
