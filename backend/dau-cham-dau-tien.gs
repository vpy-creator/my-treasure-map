/**
 * My Treasure Map · Dấu chấm đầu tiên (món quà)
 * Nhận tấm thiếp từ trang web, ghi vào Google Sheet, và gửi bản đúc kết tới người viết.
 *
 * CÁCH NỐI (làm một lần, chừng năm phút, trên máy tính):
 * 1. Mở Sheet "My Treasure Map · Dấu chấm đầu tiên (món quà)".
 * 2. Menu Tiện ích mở rộng (Extensions) → Apps Script.
 * 3. Xoá hết code mẫu, dán TOÀN BỘ file này vào, bấm Lưu.
 * 4. Bấm Triển khai (Deploy) → Tuỳ chọn triển khai mới (New deployment).
 *      Loại: Ứng dụng web (Web app)
 *      Thực thi với tư cách: Tôi (Me)
 *      Ai có quyền truy cập: Bất kỳ ai (Anyone)
 *    Bấm Triển khai và cấp quyền khi được hỏi.
 * 5. Sao chép "URL ứng dụng web" (kết thúc bằng /exec) và gửi cho Claude,
 *    hoặc tự dán vào dòng ENDPOINT trong file index.html.
 */

var CONFIG = {
  SHEET_ID: '1JwZ3W7WiFoBacseQhF9Lc2p5t1rjRG2S1jlARZwDBME',
  AUTO_SEND: true,            // true: thư đúc kết tự gửi ngay. false: chỉ tạo nháp trong Gmail để Yên đọc rồi tự bấm gửi.
  DAILY_CAP: 60,              // quá số thư này trong một ngày thì chỉ ghi Sheet, chờ Yên gửi tay
  SENDER_NAME: 'Vũ Phi Yên',
  SUBJECT: 'Dấu chấm đầu tiên trên tấm bản đồ của bạn',
  BOOKING_URL: 'https://product-sprint-freebie-nov26.linhptn.chatgpt.site/offer/yen#dang-ky-offer',
  COURSE_URL: 'https://my-treasure-map.vercel.app/',
  GIFT_URL: 'https://my-treasure-map.vercel.app/dau-cham-dau-tien/'
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var email = clean(d.email, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || d.consent !== true) {
      return json({ status: 'error', message: 'missing email or consent' });
    }
    var row = {
      name: clean(d.name, 80), email: email, loop: clean(d.loop, 300), peak: clean(d.peak, 1500),
      a1: clean(d.a1, 1500), a2: clean(d.a2, 1500), a3: clean(d.a3, 1500),
      deed: clean(d.deed, 1500), day: clean(d.day, 40), note: clean(d.note, 3000)
    };
    var sheet = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheets()[0];
    var mail = deliver(row);
    sheet.appendRow([
      new Date(), safe(row.name), safe(row.email), safe(row.loop), safe(row.peak),
      safe(row.a1), safe(row.a2), safe(row.a3), safe(row.deed), safe(row.day), safe(row.note),
      'Có', mail, ''
    ]);
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: String(err) });
  }
}

function doGet() {
  return json({ status: 'ready' });
}

/* Gửi thư đúc kết, hoặc tạo nháp, và trả về trạng thái để ghi vào Sheet. */
function deliver(row) {
  try {
    var html = letter(row);
    var opts = { htmlBody: html, name: CONFIG.SENDER_NAME };
    if (!CONFIG.AUTO_SEND) {
      GmailApp.createDraft(row.email, CONFIG.SUBJECT, plainText(row), opts);
      return 'Nháp chờ Yên gửi';
    }
    if (overCap()) return 'Chờ gửi tay (đã chạm mức thư trong ngày)';
    GmailApp.sendEmail(row.email, CONFIG.SUBJECT, plainText(row), opts);
    return 'Đã gửi';
  } catch (err) {
    return 'Chưa gửi được: ' + String(err).slice(0, 120);
  }
}

function overCap() {
  var props = PropertiesService.getScriptProperties();
  var key = 'sent-' + Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyyMMdd');
  var n = Number(props.getProperty(key) || 0);
  if (n >= CONFIG.DAILY_CAP) return true;
  props.setProperty(key, String(n + 1));
  return false;
}

function letter(r) {
  var hi = r.name ? 'Chào ' + esc(r.name) + ',' : 'Chào bạn,';
  var box = 'border-left:3px solid #D7A38E;padding:2px 0 2px 14px;margin:6px 0 18px;font-family:Georgia,serif;font-style:italic;color:#4A3354;';
  var lab = 'font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9A583F;margin:0;';
  var p = 'margin:0 0 16px;';
  var out = '<div style="max-width:600px;margin:0 auto;padding:28px 22px;background:#F8F1F5;color:#3F3344;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.75;">';
  out += '<p style="' + p + '">' + hi + '</p>';
  out += '<p style="' + p + '">Cảm ơn bạn đã dành một khoảng lặng để ra đứng nơi bìa rừng và nhìn lại vòng đi của mình. Mình gửi lại đây những điều bạn đã viết, để bạn giữ làm dấu chấm đầu tiên trên tấm bản đồ của riêng bạn.</p>';
  out += '<p style="' + lab + '">Bạn đang ở đây</p><p style="font-family:Georgia,serif;font-size:24px;color:#4A3354;margin:2px 0 18px;">' + esc(r.loop || 'Bìa rừng') + '</p>';
  out += '<p style="' + lab + '">Ngọn núi bạn nhìn thấy</p><p style="margin:6px 0 18px;">' + esc(r.peak) + '</p>';
  out += '<p style="' + lab + '">Điều Linh thần tối gìn giữ</p><p style="' + box + '">' + esc(r.a1) + '</p>';
  out += '<p style="' + lab + '">Điều Linh thần tối lo</p><p style="' + box + '">' + esc(r.a2) + '</p>';
  out += '<p style="' + lab + '">Điều Linh thần tối chờ thấy</p><p style="' + box + '">' + esc(r.a3) + '</p>';
  out += '<p style="' + lab + '">Bước đầu tiên của bạn</p><p style="margin:6px 0 22px;">' + esc(r.deed) + (r.day ? ' Hẹn vào ' + esc(r.day) + '.' : '') + '</p>';
  if (r.note) {
    out += '<p style="' + p + '">Mình cũng đã nhận được những cảm nghĩ và câu hỏi bạn gửi kèm, và mình sẽ đọc thật kỹ.</p>';
  }
  out += '<p style="' + p + '">Đây là bước xác định chỗ bạn đang đứng nơi bìa rừng. Khi tâm hồn bạn nói đã đến lúc lên đường, hành trình My Treasure Map đang chờ bạn ở đây.</p>';
  out += '<p style="margin:0 0 22px;"><a href="' + CONFIG.COURSE_URL + '" style="display:inline-block;background:#674B73;color:#F9F3F8;text-decoration:none;padding:12px 24px;border-radius:999px;">Xem hành trình My Treasure Map</a></p>';
  out += '<p style="' + p + '">Tấm thiếp của bạn vẫn nằm ở <a href="' + CONFIG.GIFT_URL + '" style="color:#674B73;">trang món quà</a>, trên trình duyệt bạn đã dùng. Nếu bạn muốn trò chuyện trước khi quyết định, mình luôn sẵn lòng dành cho bạn <a href="' + CONFIG.BOOKING_URL + '" style="color:#674B73;">chừng nửa giờ trò chuyện</a>.</p>';
  out += '<p style="margin:0;">Thân mến,<br>Vũ Phi Yên<br><span style="color:#7B6A80;font-size:14px;">My Treasure Map, EarthWise VN</span></p>';
  return out + '</div>';
}

function plainText(r) {
  return (r.name ? 'Chào ' + r.name + ',' : 'Chào bạn,') + '\n\n' +
    'Mình gửi lại đây những điều bạn đã viết, để bạn giữ làm dấu chấm đầu tiên trên tấm bản đồ của riêng bạn.\n\n' +
    'Bạn đang ở đây: ' + (r.loop || 'Bìa rừng') + '\n\n' +
    'Ngọn núi bạn nhìn thấy: ' + r.peak + '\n\n' +
    'Điều Linh thần tối gìn giữ: ' + r.a1 + '\n\n' +
    'Điều Linh thần tối lo: ' + r.a2 + '\n\n' +
    'Điều Linh thần tối chờ thấy: ' + r.a3 + '\n\n' +
    'Bước đầu tiên của bạn: ' + r.deed + (r.day ? ' Hẹn vào ' + r.day + '.' : '') + '\n\n' +
    'Đây là bước xác định chỗ bạn đang đứng nơi bìa rừng. Khi tâm hồn bạn nói đã đến lúc lên đường, hành trình My Treasure Map đang chờ bạn ở đây: ' + CONFIG.COURSE_URL + '\n\n' +
    'Tấm thiếp của bạn vẫn nằm ở trang món quà: ' + CONFIG.GIFT_URL + '\n' +
    'Nếu bạn muốn trò chuyện trước khi quyết định: ' + CONFIG.BOOKING_URL + '\n\n' +
    'Thân mến,\nVũ Phi Yên\nMy Treasure Map, EarthWise VN';
}

function clean(v, max) { return String(v === undefined || v === null ? '' : v).trim().slice(0, max); }
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
