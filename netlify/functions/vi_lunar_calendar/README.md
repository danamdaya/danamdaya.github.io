# 🗓️ Âm lịch Việt Nam
_Trình tính âm lịch tự động mã nguồn mở_

## Gì đây?

Sử dụng thuật toán tính âm lịch của Hồ Ngọc Đức, đây là một chương trình tính âm lịch tự động dưới dạng máy chủ lịch. Khi đã đăng ký theo dõi, chương trình sẽ tự động thêm các sự kiện với tên sự kiện là ngày/tháng âm lịch đã tính toán được vào lịch của bạn.

## Làm được những gì?

- Hoạt động hoàn hảo với ứng dụng Lịch trên iPhone
- Xem nhanh ngày - tháng âm lịch trong khoảng trước và sau 1 năm tính từ ngày hiện tại mà không phải tra Google.
- Vẫn có thể xem lịch kể cả khi không kết nối mạng (trước và sau 1 năm kể từ thời điểm ngắt kết nối internet)
- Tự động tính toán can - chi của ngày/tháng/năm âm lịch, ngày hoàng đạo, giờ hoàng đạo, tiết khí và bao gồm nó trong phần ghi chú của sự kiện.

## Dùng thế nào?

- Cách 1: Sử dụng liên kết của tôi:
    ```
    https://danamdaya.netlify.app/vi_lunar_calendar
    ```  
    Đăng ký theo dõi máy chủ lịch theo đường dẫn trên bằng ứng dụng lịch yêu thích của bạn và thưởng thức (liên hệ tôi qua danamdaya@gmail.com để được cấp quyền hạn).  

- Cách 2: Sử dụng mã nguồn và tự tạo máy chủ lịch của riêng bạn:
    1. Truy cập [Github](https://github.com/), tạo tài khoản và tạo [Github Pages](https://pages.github.com/) của bạn.
    2. Đẩy [index.mjs](https://github.com/danamdaya/danamdaya.github.io/blob/main/netlify/functions/vi_lunar_calendar/index.mjs), [netlify.toml](https://github.com/danamdaya/danamdaya.github.io/blob/main/netlify.toml) và [package.json](https://github.com/danamdaya/danamdaya.github.io/blob/main/package.json) lên kho lưu trữ bạn vừa tạo được theo cấu trúc
        ```
        /
        ├── netlify
        │   └── functions
        │       └── vi_lunar_calendar
        │           └── index.mjs
        ├── netlify.toml
        └── package.json
        ```
    3. Truy cập [Netlify](https://www.netlify.com/) và tạo tài khoản Netlify của bạn.
    4. Liên kết tài khoản Netlify bạn vừa tạo với kho lưu trữ Github của bạn.
    5. Tự cấp quyền hạn truy cập cho bản thân dưới dạng biến môi trường Netlify ENV.
    6. Đăng ký theo dõi máy chủ lịch mà bạn vừa tạo bằng ứng dụng lịch yêu thích của bạn và thưởng thức.
