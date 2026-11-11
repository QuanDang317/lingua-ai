# UI/UX Design Rules cho dự án LinguaAI

1. **Cấm sử dụng dấu hiệu nhận diện AI (Anti-AI-Slop Rules):**
   - KHÔNG sử dụng màu tím/indigo (`#4F46E5`, `indigo-500/600`, `violet-*`) hoặc dải màu gradient tím-xanh.
   - KHÔNG sử dụng icon ngôi sao lấp lánh (sparkles `✨`) cho các tính năng thông thường.
   - KHÔNG lạm dụng `border-radius: 9999px` (`rounded-full`) cho các nút chức năng lớn hoặc các mục trong menu. Chỉ dùng `rounded-md` (6px) cho button và `rounded-xl` (12px) cho card.
   - KHÔNG đặt từng mục menu trên Sidebar vào trong các khung card có viền và đổ bóng riêng.

2. **Hệ thống màu sắc & Typography chuẩn:**
   - Nền ứng dụng: `#FAF9F5` (Warm Paper) giúp đọc chữ Hán và tiếng Anh lâu không mỏi mắt.
   - Màu chủ đạo: `#0F766E` (Deep Teal) kết hợp `#0F172A` (Slate 900).
   - Font chữ tiếng Trung: Ưu tiên `'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif` với cỡ chữ tối thiểu `1.25rem` cho đoạn văn bản đọc hiểu.

3. **Xử lý chuỗi trong Node.js / Template:**
   - Không viết trực tiếp `&amp;` trong chuỗi tĩnh hoặc render hai lần gây lỗi hiển thị HTML entity trên giao diện.
