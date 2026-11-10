# Tài liệu kỹ thuật: `index.mjs` — Vietnamese Lunar Calendar (Netlify Edge Function)

## 1. Tổng quan

- Đây là một **Netlify Edge Function** (nhận biết qua global `Netlify.env` và export `config.path` ở cuối file), đăng ký tại route **`/vi_lunar_calendar`**.
- Chức năng: sinh một **feed iCalendar (.ics)** chứa lịch âm Việt Nam cho khoảng **~2 năm** (365 ngày trước → 365 ngày sau thời điểm request), mỗi ngày dương lịch là một `VEVENT` gồm: ngày âm, Can-Chi của năm/ngày, "nhật tinh" (trực hoàng đạo/hắc đạo), tiết khí, và các giờ hoàng đạo trong ngày.
- Endpoint được bảo vệ bằng **HTTP Basic Authentication**, xác thực dựa trên biến môi trường của site (mục 2).
- Nội dung được **stream** trực tiếp bằng `ReadableStream` thay vì dựng chuỗi trong bộ nhớ rồi trả 1 lần — hợp lý vì phải sinh ra khoảng 730 `VEVENT`.
- Phần thuật toán âm lịch (dòng 27–282) là thuật toán kinh điển của **Hồ Ngọc Đức** (2006), dựa trên sách *Astronomical Algorithms* của Jean Meeus — comment bản quyền gốc được giữ nguyên trong file.

## 2. Xác thực (dòng 5–22)

```js
const authHeaders = req.headers.get('Authorization');
if (!authHeaders || authHeaders.split(' ')[0] !== 'Basic') → 401
const [user, pwd] = atob(authHeaders.split(' ')[1]).split(':');
if (!Netlify.env.has(user) || pwd !== Netlify.env.get(user)) → 403
```

Cơ chế: không dùng 1 cặp user/pass cố định, mà **mỗi biến môi trường của site chính là một tài khoản hợp lệ** — tên biến = username, giá trị biến = password. Ví dụ tạo env var `alice = "matkhau123"` trên Netlify → login được bằng Basic Auth `alice / matkhau123`. Thêm/xoá tài khoản chỉ cần sửa env var, không cần đổi code hay DB.

⚠️ Hệ quả cần biết: cơ chế này coi **toàn bộ** env var của site là ứng viên username hợp lệ, kể cả những biến không nhằm mục đích xác thực (vd một `API_KEY` nào đó dùng cho việc khác). Nếu tên biến đó vô tình được gửi làm username kèm đúng giá trị làm password, request vẫn qua được — không có danh sách allowlist riêng cho "biến nào được dùng làm tài khoản".

| Trường hợp | Status | Content-Type | Body |
|---|---|---|---|
| Thiếu header / không phải `Basic` | 401 | text/plain | `401 Unauthorized` (+ header `WWW-Authenticate: Basic realm="Restricted Area"`) |
| Sai username/password | 403 | text/plain | `403 Forbidden` |
| Hợp lệ | 200 | text/calendar | nội dung file `.ics` |

## 3. Thuật toán chuyển đổi Dương lịch ↔ Âm lịch (dòng 44–329)

Toàn bộ hàm và bảng dữ liệu ở phần này **không phải các `function` riêng lẻ**, mà là **một khai báo `const` duy nhất nối bằng dấu phẩy** kéo dài từ dòng 44 đến dòng 329 (`PI, INT, jdFromDate, ..., getLunar, can, chi, nhat_tinh, tiet_khi, list_gio_hd, encoder, time`) — các hàm sau tham chiếu ngược lại hàm trước trong cùng scope.

### 3.1 Các hàm chính

| Hàm | Input | Output | Vai trò |
|---|---|---|---|
| `jdFromDate(dd, mm, yy)` | ngày/tháng/năm dương | Julian Day Number (JDN) | quy đổi ngày dương thành số thứ tự ngày liên tục, tự xử lý ranh giới lịch Julian/Gregorian (1582) |
| `NewMoon(k)` | thứ tự kỳ trăng non thứ *k* từ 1/1/1900 | JDN dạng số thực | thời điểm trăng non, dùng chuỗi hiệu chỉnh thiên văn Meeus |
| `SunLongitude(jdn)` | JDN | kinh độ mặt trời (radian, 0–2π) | nền tảng để xác định tiết khí |
| `getSunLongitude(dayNumber, timeZone)` | JDN, múi giờ | 0–11 | trung khí thứ mấy (12 trung khí/năm, mỗi 30°), theo giờ địa phương — **chỉ dùng nội bộ** cho việc định vị tháng 11 âm/tháng nhuận, khác với tiết khí hiển thị ra `DESCRIPTION` (xem 4.3) |
| `getNewMoonDay(k, timeZone)` | thứ tự kỳ trăng non, múi giờ | JDN nguyên | ngày trăng non thứ *k* theo giờ địa phương |
| `getLunarMonth11(yy, timeZone)` | năm dương, múi giờ | JDN | ngày bắt đầu tháng 11 âm lịch (tháng luôn chứa Đông chí) |
| `getLeapMonthOffset(a11, timeZone)` | JDN tháng 11 âm, múi giờ | offset tháng | tháng nào là tháng nhuận, nếu năm âm đó có 13 tháng |
| `getLunar(dd, mm, yy, timeZone)` | ngày dương, múi giờ | `[ngày âm, tháng âm, năm âm, có nhuận?]` | **hàm chính**, gọi toàn bộ hàm trên |

`jdToDate` (dòng 71–87) và `convertLunar2Solar` (dòng 242–276) — chiều chuyển đổi ngược lại (JDN→dương, âm→dương) — **đã bị comment, không được gọi** trong file này.

### 3.2 Bảng dữ liệu tra cứu (dòng 297–327)

- `can` (10 phần tử): Giáp, Ất, Bính, Đinh, Mậu, Kỷ, Canh, Tân, Nhâm, Quý — Thiên Can.
- `chi` (12 phần tử): Tí, Sửu, Dần, Mão, Thìn, Tỵ, Ngọ, Mùi, Thân, Dậu, Tuất, Hợi — Địa Chi.
- `nhat_tinh` (12 phần tử): tên "12 trực" (Thanh Long hoàng đạo, Minh Đường hoàng đạo, … Cầu Trần hắc đạo) — nhãn hoàng đạo/hắc đạo của ngày.
- `tiet_khi` (24 phần tử): tên + ý nghĩa của 24 tiết khí (Xuân Phân, Thanh Minh, …, Kinh Trập).
- `list_gio_hd` (6 số nguyên): mỗi số là **bitmask 12-bit**, bit thứ *i* bật = Chi thứ *i* (0=Tí…11=Hợi) là giờ hoàng đạo. Đã verify bằng code: cả 6 số đều có đúng **6 bit bật/12 bit** (843, 3372, 1203, 717, 2868, 3282), khớp quy tắc "6 giờ hoàng đạo + 6 giờ hắc đạo mỗi ngày"; số nào áp dụng phụ thuộc `chi_of_day % 6`.
- `list_ngay_hd` (dòng 327, comment): bảng thay thế biểu diễn trực tiếp bằng mảng chỉ số thay vì bitmask — không dùng.

## 4. Luồng sinh file ICS (dòng 331–416)

### 4.1 Xác định khoảng thời gian (dòng 331–332)

```js
const end = Date.UTC(y, time.getMonth() + 1, d, 0,0,0,0) + 31536000000; // +365 ngày
let start = Date.UTC(y, time.getMonth() + 1, d, 0,0,0,0) - 31536000000; // -365 ngày
```

⚠️ **Đáng chú ý**: `time.getMonth() + 1` — vì `Date.UTC` nhận tháng theo kiểu 0-index, biểu thức này thực chất trỏ sang **tháng kế tiếp**, không phải tháng hiện tại. Đã verify: nếu hôm nay 28/7/2026 thì `start`/`end` thực tế là **28/8/2025 → 28/8/2027**, chứ không phải 28/7/2025 → 28/7/2027 như tên biến gợi ý. Nên kiểm tra lại nếu ý định ban đầu là "đúng 1 năm trước/sau hôm nay".

Ngoài ra `31536000000` = `86400000 × 365` là hằng số cố định, không tính năm nhuận, nên biên chính xác có thể lệch 1 ngày quanh các năm nhuận.

### 4.2 Vòng lặp sinh `VEVENT` (dòng 340–393)

Lặp `start → end`, mỗi vòng +1 ngày, sinh 1 `VEVENT`:

| Property | Giá trị | Ghi chú |
|---|---|---|
| `UID` | `uuidv4()` random | đổi mỗi lần fetch lại feed, không ổn định giữa các lần generate |
| `DTSTAMP` | ngày của chính event + `T000000` | theo RFC 5545, `DTSTAMP` thường là thời điểm *tạo bản ghi*; ở đây lại dùng ngày của event đó thay vì thời điểm request thực tế |
| `DTSTART` / `DTEND` | `YYYYMMDD`, cách nhau 1 ngày | không có `;VALUE=DATE` tường minh — client phổ biến (Google/Apple/Outlook) tự suy ra từ 8 số, nhưng không hoàn toàn chuẩn RFC 5545 (mặc định value-type của `DTSTART` là `DATE-TIME`) |
| `SUMMARY` | `ngày/tháng âm` (+ `*` nếu nhuận) | vd `15/6*` |
| `DESCRIPTION` | xem 4.3 | |

Một điểm timezone cần lưu ý: `cr_time = new Date(start)` (với `start` dựng bằng `Date.UTC`) rồi đọc ra bằng `getDate()/getMonth()/getFullYear()` — tức **giờ local của môi trường chạy edge function**, không phải `getUTC*()`. Nếu runtime không chạy ở UTC+0, ngày đọc ra có thể lệch 1 ngày so với ngày UTC dự kiến. Đây là giả định ngầm, không được đảm bảo tường minh trong code.

`getLunar(..., 7)` (dòng 354) hardcode timezone **UTC+7** (giờ Việt Nam) cho toàn bộ tính toán âm lịch.

### 4.3 `DESCRIPTION` — hai kiểu xuống dòng trộn lẫn

Đây là phần dễ gây nhầm lẫn nhất khi đọc code vì có **2 cơ chế xuống dòng khác nhau** cùng xuất hiện:

1. **`\\n`** (2 ký tự `\` + `n` trong output thật) — đúng chuẩn RFC 5545: bên trong 1 giá trị `TEXT`, xuống dòng phải escape thành literal `\n`. Client đọc ICS hiểu đây là chỗ **xuống dòng khi hiển thị** nội dung `DESCRIPTION`.
2. **`\n\t`** (ký tự newline + tab thật) — đây là kỹ thuật **line folding** của RFC 5545: một dòng logic có thể tách thành nhiều dòng vật lý bằng CRLF + khoảng trắng/tab ở đầu dòng kế tiếp; parser chuẩn sẽ **loại bỏ** cặp này khi ráp lại. Tác dụng thực tế: cho phép tách chuỗi dài thành nhiều lệnh `controller.enqueue()` dễ đọc hơn trong source, mà không phá nội dung ICS thật (miễn client tuân thủ unfolding).
   - Riêng chỗ nối `SUMMARY` → `DESCRIPTION` (`\nDESCRIPTION:`) là xuống dòng property thật (bắt buộc — mỗi property 1 dòng), không phải fold.

Ghi chú thêm: toàn file dùng **LF (`\n`)** thay vì **CRLF (`\r\n`)** — RFC 5545 yêu cầu CRLF, nhưng phần lớn client phổ biến vẫn chấp nhận LF trong thực tế.

Thứ tự nội dung `DESCRIPTION`: ngày/tháng/năm âm (+ nhuận) → Can-Chi năm → Can-Chi ngày → nhật tinh của ngày → tiết khí (tên + ý nghĩa) → danh sách giờ hoàng đạo.

Riêng chỉ số tiết khí `cr_tiet` (dòng 375) tính **trực tiếp** `SunLongitude(jdFromDate(...))`, **không trừ 0.5 ngày / không cộng offset timezone** như hàm nội bộ `getSunLongitude` vẫn làm ở chỗ khác trong file — nghĩa là tiết khí lấy theo mốc JDN (quy ước 12:00 UTC) chứ không phải nửa đêm giờ Việt Nam như phần còn lại của thuật toán. Chênh lệch chỉ có ý nghĩa vào đúng ngày giáp ranh giữa 2 tiết khí.

## 5. Response & routing

```js
return new Response(body, {
  status: 200,
  headers: { 'Content-Type': 'text/calendar' }
});

export const config = { path: '/vi_lunar_calendar' };
```

`config.path` là cú pháp khai báo route của Netlify Edge Functions — function chỉ chạy khi request khớp `/vi_lunar_calendar`. Không có `try/catch` bọc quanh phần sinh ICS; nếu xác thực qua, response luôn `200`.

## 6. Phụ thuộc & giả định triển khai

- `import { v4 as uuidv4 } from 'uuid'` — bare specifier (không phải URL), cần có import map (`netlify.toml` / `import_map.json`) hoặc Netlify hỗ trợ `npm:` specifier lúc deploy; bản thân file không tự đủ để biết `uuid` resolve từ đâu.
- `Netlify.env` chỉ tồn tại trong runtime Edge Functions (Deno-based) của Netlify — không chạy trực tiếp như script Node.js thông thường nếu không mock lại global này.
- Chuỗi `PRODID` (dòng 338) ghi `-//github.com/chuanghiten/ical.net//...ical.net 4.0//EN` — tham chiếu tới thư viện **ical.net** (.NET) dù code này hoàn toàn tự viết tay bằng JS, không dùng thư viện đó. Có thể là giá trị mẫu copy lại chưa chỉnh.

## 7. Phần code đã comment / không dùng

| Vị trí       | Nội dung                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| dòng 71–87   | `jdToDate(jd)` — JDN → dương lịch                                                                       |
| dòng 242–276 | `convertLunar2Solar(...)` — âm lịch → dương lịch                                                        |
| dòng 285–295 | `main()` cũ — build chuỗi tóm tắt kiểu `t7 (15/6 Giáp Thìn)`, có thể là tiền thân của endpoint hiện tại |
| dòng 327     | `list_ngay_hd` — bảng thay thế `list_gio_hd`                                                            |
| dòng 395–402 | 1 khối `VEVENT` viết tay mẫu, có vẻ dùng để test format lúc phát triển                                  |

Các đoạn trên không được gọi tới ở đâu khác nên có thể xoá an toàn nếu muốn dọn file.

## 8. Ví dụ gọi endpoint

```bash
curl -u "TEN_BIEN_MOI_TRUONG:GIA_TRI_BIEN" \
  "https://<site-cua-ban>.netlify.app/vi_lunar_calendar" \
  -o lich_am.ics
```

Trong đó `TEN_BIEN_MOI_TRUONG` là **tên** một biến môi trường đã cấu hình trên site Netlify, `GIA_TRI_BIEN` là **giá trị** của chính biến đó.
