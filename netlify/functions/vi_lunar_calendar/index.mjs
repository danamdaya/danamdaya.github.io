import { v4 as uuidv4 } from 'uuid';

export default async (req, context) => {

  const authHeaders = req.headers.get('Authorization');

  if (!authHeaders || authHeaders.split(' ')[0] !== 'Basic') return new Response('401 Unauthorized', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Restricted Area"',
      'Content-Type': 'text/plain'
    }
  });

  const [user, pwd] = atob(authHeaders.split(' ')[1]).split(':');

  console.log(Netlify.env.toObject());

  if (!Netlify.env.has(user) || pwd !== Netlify.env.get(user)) return new Response('403 Forbidden', {
    status: 403,
    headers: {
      'Content-Type': 'text/plain'
    }
  });



  /*
 * Bản quyền (c) 2006 Ho Ngoc Duc. Đã được giữ cho tất cả các quyền.
 * Các thuật toán thiên văn học từ cuốn sách "Astronomical Algorithms" của Jean Meeus, 1998
 *
 * Được phép sử dụng, sao chép, sửa đổi và phân phối phần mềm này và tài liệu của nó cho mục đích cá nhân, phi thương mại miễn là
 * thông báo bản quyền này và tài liệu phù hợp xuất hiện trong tất cả các bản sao.
 * Thuật toán được giải thích bởi Ho Ngoc Duc tại "https://www.informatik.uni-leipzig.de/~duc/amlich/calrules_v02.html"
 */

  /*
   * Copyright (c) 2006 Ho Ngoc Duc. All Rights Reserved.
   * Astronomical algorithms from the book "Astronomical Algorithms" by Jean Meeus, 1998
   *
   * Permission to use, copy, modify, and redistribute this software and its
   * documentation for personal, non-commercial use is hereby granted provided that
   * this copyright notice and appropriate documentation appears in all copies.
   */
  const PI = Math.PI,

    /* Discard the fractional part of a number, e.g., INT(3.2) = 3 */
    INT = d => Math.floor(d),

    /* Compute the (integral) Julian day number of day dd/mm/yyyy, i.e., the number
    * of days between 1/1/4713 BC (Julian calendar) and dd/mm/yyyy.
    * Formula from http://www.tondering.dk/claus/calendar.html
    */
    jdFromDate = (dd, mm, yy) => {
      const a = INT((14 - mm) / 12);
      const y = yy + 4800 - a, m = mm + 12 * a - 3;
      let jd =
        dd +
        INT((153 * m + 2) / 5) +
        365 * y +
        INT(y / 4) -
        INT(y / 100) +
        INT(y / 400) -
        32045;
      if (jd < 2299161) {
        jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
      }
      return jd;
    },

    /* Convert a Julian day number to day/month/year. Parameter jd is an integer */
    // function jdToDate(jd) {
    //   let b, c;
    //   if (jd > 2299160) {
    //     // After 5/10/1582, Gregorian calendar
    //     b = INT((4 * a + 3) / 146097);
    //     c = (jd + 32044) - INT((b * 146097) / 4);
    //   } else {
    //     b = 0;
    //     c = jd + 32082;
    //   }
    //   const d = INT((4 * c + 3) / 1461), e = c - INT((1461 * d) / 4), m = INT((5 * e + 2) / 153);
    //   // day = e - INT((153 * m + 2) / 5) + 1;
    //   // month = m + 3 - 12 * INT(m / 10);
    //   // year = b * 100 + d - 4800 + INT(m / 10);
    //   // return new Array(day, month, year);
    //   return [e - INT((153 * m + 2) / 5) + 1, m + 3 - 12 * INT(m / 10), b * 100 + d - 4800 + INT(m / 10)];
    // }

    /* Compute the time of the k-th new moon after the new moon of 1/1/1900 13:52 UCT
    * (measured as the number of days since 1/1/4713 BC noon UCT, e.g., 2451545.125 is 1/1/2000 15:00 UTC).
    * Returns a floating number, e.g., 2415079.9758617813 for k=2 or 2414961.935157746 for k=-2
    * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
    */
    NewMoon = k => {
      let Jd1, C1, deltat;
      const T = k / 1236.85; // Time in Julian centuries from 1900 January 0.5
      const T2 = T * T;
      const T3 = T2 * T, dr = PI / 180;
      Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
      Jd1 = Jd1 + 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr); // Mean new moon
      const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3, // Sun's mean anomaly
        Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3, // Moon's mean anomaly
        F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3; // Moon's argument of latitude
      C1 =
        (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
      C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
      C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
      C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
      C1 =
        C1 -
        0.0074 * Math.sin(dr * (M - Mpr)) +
        0.0004 * Math.sin(dr * (2 * F + M));
      C1 =
        C1 -
        0.0004 * Math.sin(dr * (2 * F - M)) -
        0.0006 * Math.sin(dr * (2 * F + Mpr));
      C1 =
        C1 +
        0.001 * Math.sin(dr * (2 * F - Mpr)) +
        0.0005 * Math.sin(dr * (2 * Mpr + M));
      if (T < -11) {
        deltat =
          0.001 +
          0.000839 * T +
          0.0002261 * T2 -
          0.00000845 * T3 -
          0.000000081 * T * T3;
      } else {
        deltat = -0.000278 + 0.000265 * T + 0.000262 * T2;
      }
      return Jd1 + C1 - deltat;
    },

    /* Compute the longitude of the sun at any time.
    * Parameter: floating number jdn, the number of days since 1/1/4713 BC noon
    * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
    */
    SunLongitude = jdn => {
      let DL, L;
      const T = (jdn - 2451545.0) / 36525; // Time in Julian centuries from 2000-01-01 12:00:00 GMT
      const T2 = T * T,
        dr = PI / 180, // degree to radian
        M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2, // mean anomaly, degree
        L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2; // mean longitude, degree
      DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
      DL =
        DL +
        (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) +
        0.00029 * Math.sin(dr * 3 * M);
      L = L0 + DL; // true longitude, degree
      L = L * dr;
      L = L - PI * 2 * INT(L / (PI * 2)); // Normalize to (0, 2*PI)
      return L;
    },

    /* Compute sun position at midnight of the day with the given Julian day number.
    * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00.
    * The function returns a number between 0 and 11.
    * From the day after March equinox and the 1st major term after March equinox, 0 is returned.
    * After that, return 1, 2, 3 ...
    */
    getSunLongitude = (dayNumber, timeZone) => INT((SunLongitude(dayNumber - 0.5 - timeZone / 24) / PI) * 6),

    /* Compute the day of the k-th new moon in the given time zone.
    * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00
    */
    getNewMoonDay = (k, timeZone) => INT(NewMoon(k) + 0.5 + timeZone / 24),

    /* Find the day that starts the luner month 11 of the given year for the given time zone */
    getLunarMonth11 = (yy, timeZone) => {
      let nm;
      //off = jdFromDate(31, 12, yy) - 2415021.076998695;
      const off = jdFromDate(31, 12, yy) - 2415021;
      const k = INT(off / 29.530588853);
      nm = getNewMoonDay(k, timeZone);
      const sunLong = getSunLongitude(nm, timeZone); // sun longitude at local midnight
      if (sunLong >= 9) {
        nm = getNewMoonDay(k - 1, timeZone);
      }
      return nm;
    },

    /* Find the index of the leap month after the month starting on the day a11. */
    getLeapMonthOffset = (a11, timeZone) => {
      let last = 0, arc,
        i = 1; // We start with the month following lunar month 11
      const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
      arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
      do {
        last = arc;
        i++;
        arc = getSunLongitude(getNewMoonDay(k + i, timeZone), timeZone);
      } while (arc != last && i < 14);
      return i - 1;
    },

    /* Comvert solar date dd/mm/yyyy to the corresponding lunar date */
    getLunar = (dd, mm, yy, timeZone) => {
      let monthStart,
        a11,
        b11,
        lunarMonth,
        lunarYear,
        lunarLeap = 0;
      const dayNumber = jdFromDate(dd, mm, yy);
      const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
      monthStart = getNewMoonDay(k + 1, timeZone);
      if (monthStart > dayNumber) {
        monthStart = getNewMoonDay(k, timeZone);
      }
      //alert(dayNumber+" -> "+monthStart);
      a11 = getLunarMonth11(yy, timeZone);
      b11 = a11;
      if (a11 >= monthStart) {
        lunarYear = yy;
        a11 = getLunarMonth11(yy - 1, timeZone);
      } else {
        lunarYear = yy + 1;
        b11 = getLunarMonth11(yy + 1, timeZone);
      }
      const diff = INT((monthStart - a11) / 29);
      lunarMonth = diff + 11;
      if (b11 - a11 > 365) {
        let leapMonthDiff = getLeapMonthOffset(a11, timeZone);
        if (diff >= leapMonthDiff) {
          lunarMonth = diff + 10;
          if (diff == leapMonthDiff) {
            lunarLeap = 1;
          }
        }
      }
      if (lunarMonth > 12) {
        lunarMonth = lunarMonth - 12;
      }
      if (lunarMonth >= 11 && diff < 4) {
        lunarYear -= 1;
      }
      return [dayNumber - monthStart + 1, lunarMonth, lunarYear, lunarLeap];
    },

    /* Convert a lunar date to the corresponding solar date */
    // function convertLunar2Solar(
    //   lunarDay,
    //   lunarMonth,
    //   lunarYear,
    //   lunarLeap,
    //   timeZone
    // ) {
    //   let k, a11, b11, off, leapOff, leapMonth, monthStart;
    //   if (lunarMonth < 11) {
    //     a11 = getLunarMonth11(lunarYear - 1, timeZone);
    //     b11 = getLunarMonth11(lunarYear, timeZone);
    //   } else {
    //     a11 = getLunarMonth11(lunarYear, timeZone);
    //     b11 = getLunarMonth11(lunarYear + 1, timeZone);
    //   }
    //   k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    //   off = lunarMonth - 11;
    //   if (off < 0) {
    //     off += 12;
    //   }
    //   if (b11 - a11 > 365) {
    //     leapOff = getLeapMonthOffset(a11, timeZone);
    //     leapMonth = leapOff - 2;
    //     if (leapMonth < 0) {
    //       leapMonth += 12;
    //     }
    //     if (lunarLeap != 0 && lunarMonth != leapMonth) {
    //       return new Array(0, 0, 0);
    //     } else if (lunarLeap != 0 || off >= leapOff) {
    //       off += 1;
    //     }
    //   }
    //   monthStart = getNewMoonDay(k + off, timeZone);
    //   return jdToDate(monthStart + lunarDay - 1);
    // }

    /*
    * End!
    * Thank you Ho Ngoc Duc for the very useful Vietnamese lunar calculation algorithm!
    * Cảm ơn Ho Ngoc Duc vì thuật toán tính ngày âm lịch rất hữu ích!
    */


    // const main = () => {
    //   const time = new Date();
    //   const month = time.getMonth() + 1,
    //     date = time.getDate(),
    //     year = time.getFullYear();
    //   const lunar = getLunar(date, month, year, 7),
    //     can = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"],
    //     chi = ["Tí", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
    //   return `t${month} (${lunar[0]}/${lunar[1]}${(() => { if (lunar[3]) return "*"; return "" })()} ${can[(lunar[2] + 6) % 10]} ${chi[(lunar[2] + 8) % 12]})`;
    //   // return "t12 (30/12* Nham Than)"
    // }

    can = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'],
    chi = ['Tí', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'],
    nhat_tinh = ['Thanh Long hoàng đạo', 'Minh Đường hoàng đạo', 'Thiên Hình hắc đạo', 'Chu Tước hắc đạo', 'Kim Quỹ hoàng đạo', 'Kim Đường hoàng đạo', 'Bạch Hổ hắc đạo', 'Ngọc Đường hoàng đạo', 'Thiên Lao hắc đạo', 'Huyền Vũ hắc đạo', 'Tư Mệnh hoàng đạo', 'Cầu Trần hắc đạo'],
    tiet_khi = [
      {name: 'Xuân Phân', meaning: 'Thời gian \n\tgiữa mùa Xuân'},
      {name: 'Thanh Minh', meaning: 'Thời tiết \n\ttrong sáng'},
      {name: 'Cốc Vũ', meaning: 'Thời tiết có \n\tmưa rào'},
      {name: 'Lập Hạ', meaning: 'Thời gian bắt \n\tđầu mùa Hạ'},
      {name: 'Tiểu Mãn', meaning: 'Thời tiết có \n\tlũ nhỏ, duối vàng'},
      {name: 'Mang Chủng', meaning: 'Chòm sao Tua \n\tRua bắt đầu mọc'},
      {name: 'Hạ Chí', meaning: 'Thời gian \n\tgiữa mùa Hè'},
      {name: 'Tiểu Thử', meaning: 'Thời tiết \n\tnóng nhẹ'},
      {name: 'Đại Thử', meaning: 'Thời tiết oi \n\tbức, nóng nực'},
      {name: 'Lập Thu', meaning: 'Thời gian bắt \n\tđầu mùa Thu'},
      {name: 'Xử Thử', meaning: 'Thời tiết \n\tcó mưa ngâu'},
      {name: 'Bạch Lộ', meaning: 'Thời tiết \n\tcó nắng nhạt'},
      {name: 'Thu Phân', meaning: 'Thời hian \n\tgiữa mùa Thu'},
      {name: 'Hàn Lộ', meaning: 'Thời tiết \n\tmát mẻ'},
      {name: 'Sương Giáng', meaning: 'Sương mù \n\txuất hiện'},
      {name: 'Lập Đông', meaning: 'Thời gian bắt \n\tđầu mùa Đông'},
      {name: 'Tiểu Tuyết', meaning: 'Tuyết xuất hiện \n\tở một số nơi'},
      {name: 'Đại Tuyết', meaning: 'Tuyết bắt \n\tđầu dày'},
      {name: 'Đông Chí', meaning: 'Thời gian giữa \n\tmùa Đông'},
      {name: 'Tiểu Hàn', meaning: 'Trời \n\trét nhẹ'},
      {name: 'Đại Hàn', meaning: 'Trời \n\trét đậm'},
      {name: 'Lập Xuân ', meaning: 'Thời gian bắt \n\tđầu mùa Xuân'},
      {name: 'Vũ Thủy', meaning: 'Thời tiết \n\tcó mưa ẩm'},
      {name: 'Kinh Trập ', meaning: 'Sâu bướm \n\tbắt đầu nở'}
    ],
    list_gio_hd = [843, 3372, 1203, 717, 2868, 3282],
    list_ngay_hd = [[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0, 1], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], [10, 11, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6, 7], [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5], [4, 5, 6, 7, 8, 9, 10, 11, 0, 1, 2, 3]],

    encoder = new TextEncoder(), time = new Date();

  const end = Date.UTC(time.getFullYear(), time.getMonth() + 1, time.getDate(), 0, 0, 0, 0) + 31536000000;
  let start = Date.UTC(time.getFullYear(), time.getMonth() + 1, time.getDate(), 0, 0, 0, 0) - 31536000000;

  const body = new ReadableStream({

    start(controller) {

      controller.enqueue(encoder.encode('BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//github.com/chuanghiten/ical.net//NONSGML ical.net 4.0//EN\nCALSCALE:GREGORIAN\n'));

      while (start <= end) {
        
        controller.enqueue(encoder.encode(`BEGIN:VEVENT\nUID:${uuidv4()}\nDTSTAMP:`));

        const cr_time = new Date(start);
        const [cr_date, cr_month, cr_year] = [`${cr_time.getDate()}`.padStart(2, '0'), `${cr_time.getMonth() + 1}`.padStart(2, '0'), cr_time.getFullYear()];

        controller.enqueue(encoder.encode(`${cr_year}${cr_month}${cr_date}T000000\nDTSTART:${cr_year}${cr_month}${cr_date}\nDTEND:`));

        const tmr_time = new Date(start + 86400000);
        const [tmr_date, tmr_month, tmr_year] = [`${tmr_time.getDate()}`.padStart(2, '0'), `${tmr_time.getMonth() + 1}`.padStart(2, '0'), tmr_time.getFullYear()];

        controller.enqueue(encoder.encode(`${tmr_year}${tmr_month}${tmr_date}\nSUMMARY:`));

        const lunar = getLunar(Number(cr_date), Number(cr_month), cr_year, 7);

        controller.enqueue(encoder.encode(`${lunar[0]}/${lunar[1]}`));

        if (lunar[3]) controller.enqueue(encoder.encode('*'));

        controller.enqueue(encoder.encode(`\nDESCRIPTION:\n\tNgày ${lunar[0]} tháng ${lunar[1]}`));

        if (lunar[3]) controller.enqueue(encoder.encode(' (nhuận)'));

        const chi_of_day = (jdFromDate(Number(cr_date), Number(cr_month), cr_year) + 1) % 12;

        controller.enqueue(encoder.encode(` năm ${can[(lunar[2] + 6) % 10]} ${chi[(lunar[2] + 8) % 12]} ${lunar[2]} (Âm lịch)\\n\\n\n\tNgày ${can[(jdFromDate(Number(cr_date), Number(cr_month), cr_year) + 9) % 10]} ${chi[chi_of_day]} - \n\t${nhat_tinh[list_ngay_hd[lunar[1] % 6][chi_of_day]]}\\n\n\tTháng `));

        if (Number(lunar[1]) === 1) controller.enqueue(encoder.encode('Giêng '));
        else if (Number(lunar[1]) === 12) controller.enqueue(encoder.encode('Chạp '));

        controller.enqueue(encoder.encode(`${can[((lunar[2] * 12) + lunar[1] + 3) % 10]} ${chi[(lunar[1] + 1) % 12]}`));

        if (lunar[3]) controller.enqueue(encoder.encode(' (nhuận)'));
        
        const cr_tiet = INT((INT(SunLongitude(jdFromDate(Number(cr_date), Number(cr_month), cr_year)) * (180 / PI)) / 360) * 24);
        controller.enqueue(encoder.encode(`\n\t\\nTiết ${tiet_khi[cr_tiet].name} (\n\t${tiet_khi[cr_tiet].meaning})`));

        controller.enqueue(encoder.encode(`\\n\\n\n\tGiờ hoàng đạo: \n\t`));

        const gio_hd = list_gio_hd[(chi_of_day) % 6];
        let c = 0;

        for (let i = 0; i < 12; i++) {
          if ((gio_hd >> i) & 1) {
            controller.enqueue(encoder.encode(chi[i]));
            if (c++ < 5) controller.enqueue(encoder.encode(`, \n\t`));
          }
        }

        controller.enqueue(encoder.encode('\nEND:VEVENT\n'));

        start += 86400000;
      }

      // controller.enqueue(encoder.encode('BEGIN:VEVENT\n'));
      // controller.enqueue(encoder.encode(`UID:${uuidv4()}\n`));
      // controller.enqueue(encoder.encode('DTSTAMP:20250725T000000\n'));
      // controller.enqueue(encoder.encode('DTSTART:20250725\n'));
      // controller.enqueue(encoder.encode('DTEND:20250726\n'));
      // controller.enqueue(encoder.encode('SUMMARY:1/6*\n'));
      // controller.enqueue(encoder.encode('DESCRIPTION:Ngày Ất Mùi\\nTháng Quý Mùi (nhuận)\\nNăm Ất Tỵ\n'));
      // controller.enqueue(encoder.encode('END:VEVENT\n'));

      controller.enqueue(encoder.encode('END:VCALENDAR\n'));
      controller.close();
    }
  });

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar'
      //'Content-Type': 'text/plain'
    }
  });
};

export const config = {
  path: '/vi_lunar_calendar'
}
