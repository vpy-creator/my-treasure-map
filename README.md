# My Treasure Map

Trang của My Treasure Map, Vũ Phi Yên, EarthWise VN.

- `index.html` · trang hành trình My Treasure Map, mô tả khoá trọn vẹn (địa chỉ gốc).
- `dau-cham-dau-tien/` · món quà "Dấu chấm đầu tiên: Bạn đang ở đây", một trang độc lập để gửi riêng. Thanh dọc bên hông dẫn về trang hành trình; cuối món quà mời người đọc vào rừng ngay hoặc lưu trang chờ ngày sẵn sàng.
- `assets/` · tranh bản đồ và nhạc nền dùng chung.
- `viet-cho-yen/` · trang "Viết cho Yên": nơi người đọc gửi câu hỏi hay thông điệp về hành trình xuyên rừng hoặc tiếng gọi của tạo tác. Mọi lời mời trò chuyện trên các trang và trong các thư đều dẫn về đây. Nhận `?tu=dau-cham`, `?tu=hanh-trinh` để gợi sẵn lối vào.
- `backend/dau-cham-dau-tien.gs` · bản lưu của Apps Script nhận tấm thiếp về Google Sheet "My Treasure Map · Dấu chấm đầu tiên (món quà)" và gửi thư đúc kết; cũng nhận thông điệp từ trang Viết cho Yên vào tab "Thông điệp" của Sheet ấy và báo cho Yên qua email.

## Đã dời (26.11.2026)

`dau-cham-dau-tien/` và `viet-cho-yen/` nay sống ở `https://phiyenvu.com/my-treasure-map/` (repo vpy-creator.github.io). `vercel.json` chuyển hai địa chỉ cũ sang đó, để những đường link đã gửi đi vẫn mở được. Hai thư mục ở đây giữ làm bản lưu.
