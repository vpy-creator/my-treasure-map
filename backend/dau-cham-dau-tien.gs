/**
 * My Treasure Map · Dấu chấm đầu tiên (món quà) + Viết cho Yên (thông điệp)
 * Nhận tấm thiếp từ trang món quà, ghi vào Google Sheet, gửi bản đúc kết tới người viết.
 * Nhận thông điệp từ trang "Viết cho Yên", ghi vào tab "Thông điệp" của cùng Sheet, và báo cho Yên qua email.
 *
 * CÁCH CẬP NHẬT (khi file này đổi, chừng ba phút, trên máy tính):
 * 1. Mở Sheet "My Treasure Map · Dấu chấm đầu tiên (món quà)" → Tiện ích mở rộng (Extensions) → Apps Script.
 * 2. Xoá hết code cũ, dán TOÀN BỘ file này vào, bấm Lưu.
 * 3. Bấm Triển khai (Deploy) → Quản lý các bản triển khai (Manage deployments).
 *    Bấm biểu tượng cây bút cạnh bản đang chạy → mục Phiên bản (Version) chọn "Phiên bản mới" (New version) → Triển khai.
 *    Làm cách này thì đường link /exec giữ nguyên, các trang web vẫn nối đúng chỗ.
 * 4. Lần đầu sau khi thêm phần gửi email báo, Google có thể hỏi cấp quyền thêm; bấm cho phép.
 *
 * CÁCH NỐI LẦN ĐẦU (nếu chưa từng nối): Deploy → New deployment → Web app → Execute as: Me →
 * Who has access: Anyone → copy đường link /exec, dán vào dòng ENDPOINT trong các file index.html.
 */

var CONFIG = {
  SHEET_ID: '1JwZ3W7WiFoBacseQhF9Lc2p5t1rjRG2S1jlARZwDBME',
  TAB_MESSAGE: 'Thông điệp',  // tab nhận thông điệp từ trang Viết cho Yên; script tự tạo nếu chưa có
  AUTO_SEND: true,            // true: thư đúc kết tự gửi ngay. false: chỉ tạo nháp trong Gmail để Yên đọc rồi tự bấm gửi.
  NOTIFY_YEN: true,           // báo cho Yên qua email mỗi khi có thông điệp mới
  DAILY_CAP: 60,              // quá số thư này trong một ngày thì chỉ ghi Sheet, chờ Yên gửi tay
  SENDER_NAME: 'Vũ Phi Yên',
  SUBJECT: 'Dấu chấm đầu tiên trên tấm bản đồ của bạn',
  COURSE_URL: 'https://my-treasure-map.vercel.app/',
  GIFT_URL: 'https://my-treasure-map.vercel.app/dau-cham-dau-tien/',
  ASK_URL: 'https://my-treasure-map.vercel.app/viet-cho-yen/'
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var email = clean(d.email, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || d.consent !== true) {
      return json({ status: 'error', message: 'missing email or consent' });
    }
    if (d.kind === 'thong-diep') return receiveMessage(d, email);
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

/* ===== VIẾT CHO YÊN: thông điệp và câu hỏi ===== */
function receiveMessage(d, email) {
  var m = {
    name: clean(d.name, 80), email: email, from: clean(d.from, 60),
    message: clean(d.message, 6000), page: clean(d.page, 300)
  };
  if (!m.message) return json({ status: 'error', message: 'empty message' });
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var tab = ss.getSheetByName(CONFIG.TAB_MESSAGE);
  if (!tab) {
    tab = ss.insertSheet(CONFIG.TAB_MESSAGE);
    tab.appendRow(['Thời gian', 'Tên', 'Email', 'Đến từ lối nào', 'Thông điệp', 'Trang gửi', 'Báo Yên', 'Đã hồi âm', 'Ghi chú của Yên']);
    tab.setFrozenRows(1);
  }
  var notified = notifyYen(m);
  tab.appendRow([new Date(), safe(m.name), safe(m.email), safe(m.from), safe(m.message), safe(m.page), notified, '', '']);
  return json({ status: 'ok' });
}

function notifyYen(m) {
  if (!CONFIG.NOTIFY_YEN) return 'Tắt';
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (!me) return 'Không rõ địa chỉ của Yên';
    var who = m.name || '(không tên)';
    var subject = '[My Treasure Map] Thông điệp mới · ' + who + (m.from ? ' · ' + m.from : '');
    var body = 'Người gửi: ' + who + ' <' + m.email + '>\n' +
      (m.from ? 'Đến từ lối: ' + m.from + '\n' : '') +
      (m.page ? 'Gửi từ trang: ' + m.page + '\n' : '') +
      '\n' + m.message + '\n\n' +
      'Bấm Trả lời (Reply) là thư đi thẳng tới người gửi.\n' +
      'Sổ thông điệp: https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '/edit';
    GmailApp.sendEmail(me, subject, body, { name: 'My Treasure Map', replyTo: m.email });
    return 'Đã báo';
  } catch (err) {
    return 'Chưa báo được: ' + String(err).slice(0, 120);
  }
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
    out += '<p style="' + p + '">Mình cũng đã nhận được những cảm nghĩ và câu hỏi bạn gửi kèm. Mình sẽ đọc thật kỹ, và nếu trong đó có điều bạn hỏi, mình sẽ hồi âm bạn bằng thư.</p>';
  }
  out += '<p style="' + p + '">Đây là bước xác định chỗ bạn đang đứng nơi bìa rừng. Khi tâm hồn bạn nói đã đến lúc lên đường, hành trình My Treasure Map đang chờ bạn ở đây.</p>';
  out += '<p style="margin:0 0 22px;"><a href="' + CONFIG.COURSE_URL + '" style="display:inline-block;background:#674B73;color:#F9F3F8;text-decoration:none;padding:12px 24px;border-radius:999px;">Xem hành trình My Treasure Map</a></p>';
  out += '<p style="' + p + '">Tấm thiếp của bạn vẫn nằm ở <a href="' + CONFIG.GIFT_URL + '" style="color:#674B73;">trang món quà</a>, trên trình duyệt bạn đã dùng. Nếu bạn có thắc mắc về hành trình xuyên rừng, bạn cứ <a href="' + CONFIG.ASK_URL + '" style="color:#674B73;">viết cho mình</a>. Mình đọc từng thông điệp và hồi âm bằng thư.</p>';
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
    'Nếu bạn có thắc mắc về hành trình xuyên rừng, bạn cứ viết cho mình: ' + CONFIG.ASK_URL + '\n' +
    'Mình đọc từng thông điệp và hồi âm bằng thư.\n\n' +
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
