/** My Treasure Map · Hỏi và Toàn thức trả lời: nhận lá thư đêm và giấc mơ, gửi thư nhắc buổi sáng và thư lời đáp của đêm. */

var CONFIG = {
  SHEET_ID: '1qrFVmULHAg0sP_M5KQOaSJdtW4MkaLwN7gaJvUTrM1g',
  TAB_DREAM: 'Giấc mơ',
  TAB_NIGHT: 'Lá thư đêm',
  TZ: 'Asia/Ho_Chi_Minh',
  MORNING_FROM: 5,            // thư nhắc gửi trong khoảng từ 5 giờ
  MORNING_TO: 9,              // tới trước 9 giờ sáng, giờ Việt Nam
  DAILY_CAP: 80,              // quá số thư này trong một ngày thì chỉ ghi Sheet
  SENDER_NAME: 'Vũ Phi Yên',
  NOTIFY_YEN: true,           // báo cho Yên mỗi khi có giấc mơ mới
  GIFT_URL: 'https://my-treasure-map.vercel.app/hoi-va-toan-thuc-tra-loi/',
  COURSE_URL: 'https://my-treasure-map.vercel.app/',
  ASK_URL: 'https://my-treasure-map.vercel.app/viet-cho-yen/'
};

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);
    var email = clean(d.email, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || d.consent !== true) {
      return json({ status: 'error', message: 'missing email or consent' });
    }
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    var r = {
      name: clean(d.name, 80), email: email, q: clean(d.q, 600), letter: clean(d.letter, 4000),
      dream: clean(d.dream, 6000), wake: clean(d.wake, 300), image: clean(d.image, 1500),
      reading: clean(d.reading, 2000), note: clean(d.note, 2000)
    };
    if (d.kind === 'dem') {
      ss.getSheetByName(CONFIG.TAB_NIGHT).appendRow([
        new Date(), safe(r.name), safe(r.email), safe(r.q), safe(r.letter), 'Chờ gửi sáng mai', ''
      ]);
      return json({ status: 'ok' });
    }
    if (d.kind === 'mo') {
      var mail = deliver(r.email, 'Lời đáp của đêm', dreamPlain(r), dreamHtml(r));
      ss.getSheetByName(CONFIG.TAB_DREAM).appendRow([
        new Date(), safe(r.name), safe(r.email), safe(r.q), safe(r.letter), safe(r.dream), safe(r.wake),
        safe(r.image), safe(r.reading), 'Yên hồi âm bằng thư', safe(r.note), 'Có', mail, '', ''
      ]);
      if (CONFIG.NOTIFY_YEN) notifyYen(r);
      return json({ status: 'ok' });
    }
    return json({ status: 'error', message: 'unknown kind' });
  } catch (err) {
    return json({ status: 'error', message: String(err) });
  }
}

function doGet() {
  return json({ status: 'ready' });
}

/* Chạy MỘT LẦN trong trình soạn thảo để bật thư nhắc buổi sáng (mỗi giờ kiểm tra một lần). */
function caiDatNhacSang() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'nhacBuoiSang') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('nhacBuoiSang').timeBased().everyHours(1).create();
}

/* Gửi thư nhắc cho những lá thư viết từ tối qua trở về trước, trong khung giờ sáng. */
function nhacBuoiSang() {
  var now = new Date();
  var hour = Number(Utilities.formatDate(now, CONFIG.TZ, 'H'));
  if (hour < CONFIG.MORNING_FROM || hour >= CONFIG.MORNING_TO) return;
  var today = Utilities.formatDate(now, CONFIG.TZ, 'yyyyMMdd');
  var sh = SpreadsheetApp.openById(CONFIG.SHEET_ID).getSheetByName(CONFIG.TAB_NIGHT);
  var last = sh.getLastRow();
  if (last < 2) return;
  var rows = sh.getRange(2, 1, last - 1, 7).getValues();
  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row[5] !== 'Chờ gửi sáng mai' || !(row[0] instanceof Date)) continue;
    var day = Utilities.formatDate(row[0], CONFIG.TZ, 'yyyyMMdd');
    var h = Number(Utilities.formatDate(row[0], CONFIG.TZ, 'H'));
    var ready = day < today || (day === today && h < 4);
    if (!ready) continue;
    if ((now - row[0]) > 3 * 24 * 3600 * 1000) { sh.getRange(i + 2, 6).setValue('Quá hạn, chưa gửi'); continue; }
    var r = { name: String(row[1]), email: String(row[2]), q: String(row[3]) };
    var status = deliver(r.email, 'Đêm qua, Toàn thức đã trả lời', morningPlain(r), morningHtml(r));
    sh.getRange(i + 2, 6, 1, 2).setValues([[status === 'Đã gửi' ? 'Đã nhắc' : status, new Date()]]);
  }
}

function deliver(to, subject, plain, html) {
  try {
    if (overCap()) return 'Chờ gửi tay (đã chạm mức thư trong ngày)';
    GmailApp.sendEmail(to, subject, plain, { htmlBody: html, name: CONFIG.SENDER_NAME });
    return 'Đã gửi';
  } catch (err) {
    return 'Chưa gửi được: ' + String(err).slice(0, 120);
  }
}

function overCap() {
  var props = PropertiesService.getScriptProperties();
  var key = 'sent-' + Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyyMMdd');
  var n = Number(props.getProperty(key) || 0);
  if (n >= CONFIG.DAILY_CAP) return true;
  props.setProperty(key, String(n + 1));
  return false;
}

var STY = {
  wrap: 'max-width:600px;margin:0 auto;padding:28px 22px;background:#F8F1F5;color:#3F3344;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.75;',
  p: 'margin:0 0 16px;',
  lab: 'font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#9A583F;margin:0;',
  box: 'border-left:3px solid #D7A38E;padding:2px 0 2px 14px;margin:6px 0 18px;font-family:Georgia,serif;font-style:italic;color:#4A3354;',
  btn: 'display:inline-block;background:#674B73;color:#F9F3F8;text-decoration:none;padding:12px 24px;border-radius:999px;',
  link: 'color:#674B73;'
};
function hello(r) { return r.name ? 'Chào ' + esc(r.name) + ',' : 'Chào bạn,'; }
function sign() { return '<p style="margin:0;">Thân mến,<br>Vũ Phi Yên<br><span style="color:#7B6A80;font-size:14px;">My Treasure Map, EarthWise VN</span></p>'; }

function morningHtml(r) {
  var o = '<div style="' + STY.wrap + '">';
  o += '<p style="' + STY.p + '">' + hello(r) + '</p>';
  o += '<p style="' + STY.p + '">Đêm qua bạn đã gửi vào đêm một câu hỏi:</p>';
  o += '<p style="' + STY.box + '">' + esc(r.q) + '</p>';
  o += '<p style="' + STY.p + '">Trước khi ngày mới cuốn bạn đi, bạn dành vài phút ghi lại những gì đêm mang về: một giấc mơ, một mảnh hình ảnh, hay ý nghĩ đầu tiên khi vừa mở mắt. Điều nhỏ nhất cũng có thể là một lời đáp.</p>';
  o += '<p style="margin:0 0 22px;"><a href="' + CONFIG.GIFT_URL + '#sang" style="' + STY.btn + '">Ghi lại giấc mơ</a></p>';
  o += '<p style="' + STY.p + '">Nếu bạn mở thư trên một thiết bị khác với lúc viết lá thư đêm qua, trang sẽ hỏi lại câu hỏi của bạn. Bạn chép câu ở trên vào là được.</p>';
  return o + sign() + '</div>';
}
function morningPlain(r) {
  return (r.name ? 'Chào ' + r.name + ',' : 'Chào bạn,') + '\n\n' +
    'Đêm qua bạn đã gửi vào đêm một câu hỏi: ' + r.q + '\n\n' +
    'Trước khi ngày mới cuốn bạn đi, bạn dành vài phút ghi lại những gì đêm mang về: một giấc mơ, một mảnh hình ảnh, hay ý nghĩ đầu tiên khi vừa mở mắt.\n\n' +
    'Ghi lại giấc mơ: ' + CONFIG.GIFT_URL + '#sang\n\n' +
    'Thân mến,\nVũ Phi Yên\nMy Treasure Map, EarthWise VN';
}

function dreamHtml(r) {
  var o = '<div style="' + STY.wrap + '">';
  o += '<p style="' + STY.p + '">' + hello(r) + '</p>';
  o += '<p style="' + STY.p + '">Cảm ơn bạn đã tin gửi giấc mơ của mình. Mình gửi lại đây lời đáp của đêm, để bạn giữ trong hộp thư và đọc lại khi cần.</p>';
  o += '<p style="' + STY.lab + '">Câu hỏi bạn gửi vào đêm</p><p style="margin:6px 0 18px;">' + esc(r.q) + '</p>';
  o += '<p style="' + STY.lab + '">Giấc mơ mang về</p><p style="' + STY.box + '">' + esc(r.dream) + '</p>';
  if (r.wake) o += '<p style="' + STY.lab + '">Lúc thức dậy</p><p style="margin:6px 0 18px;">' + esc(r.wake) + '</p>';
  o += '<p style="' + STY.lab + '">Hình ảnh còn đọng lại</p><p style="' + STY.box + '">' + esc(r.image) + '</p>';
  o += '<p style="' + STY.lab + '">Điều bạn nghe thấy</p><p style="margin:6px 0 22px;">' + esc(r.reading) + '</p>';
  o += '<p style="' + STY.p + '">Mình sẽ đọc giấc mơ này thật chậm và hồi âm bạn bằng thư. Bạn luôn là người hiểu giấc mơ của mình nhất, còn mình đi cùng bằng những câu hỏi.</p>';
  o += '<p style="' + STY.p + '">Đây mới là một đêm nơi bìa rừng. Khi tâm hồn bạn nói đã đến lúc lên đường, hành trình My Treasure Map đang chờ bạn ở đây.</p>';
  o += '<p style="margin:0 0 22px;"><a href="' + CONFIG.COURSE_URL + '" style="' + STY.btn + '">Xem hành trình My Treasure Map</a></p>';
  o += '<p style="' + STY.p + '">Mỗi đêm bạn đều có thể gửi một câu hỏi mới ở <a href="' + CONFIG.GIFT_URL + '" style="' + STY.link + '">trang món quà</a>. Và nếu bạn có thắc mắc về tiếng gọi của tạo tác, hay về hành trình My Treasure Map, bạn cứ <a href="' + CONFIG.ASK_URL + '" style="' + STY.link + '">viết cho mình</a>.</p>';
  return o + sign() + '</div>';
}
function dreamPlain(r) {
  return (r.name ? 'Chào ' + r.name + ',' : 'Chào bạn,') + '\n\n' +
    'Mình gửi lại đây lời đáp của đêm, để bạn giữ trong hộp thư.\n\n' +
    'Câu hỏi bạn gửi vào đêm: ' + r.q + '\n\n' +
    'Giấc mơ mang về: ' + r.dream + '\n\n' +
    (r.wake ? 'Lúc thức dậy: ' + r.wake + '\n\n' : '') +
    'Hình ảnh còn đọng lại: ' + r.image + '\n\n' +
    'Điều bạn nghe thấy: ' + r.reading + '\n\n' +
    'Mình sẽ đọc giấc mơ này thật chậm và hồi âm bạn bằng thư.\n\n' +
    'Khi tâm hồn bạn nói đã đến lúc lên đường, hành trình My Treasure Map đang chờ bạn ở đây: ' + CONFIG.COURSE_URL + '\n' +
    'Nếu bạn có thắc mắc về tiếng gọi của tạo tác, hay về hành trình, bạn cứ viết cho mình: ' + CONFIG.ASK_URL + '\n\n' +
    'Thân mến,\nVũ Phi Yên\nMy Treasure Map, EarthWise VN';
}

function notifyYen(r) {
  try {
    var me = Session.getEffectiveUser().getEmail();
    if (!me) return;
    var subject = '[My Treasure Map] Giấc mơ mới' + (r.name ? ' · ' + r.name : '');
    var body = 'Người gửi: ' + (r.name || '(không tên)') + ' <' + r.email + '>\n' +
      'Yên hồi âm giấc mơ này bằng thư (bấm Trả lời).\n\n' +
      'Câu hỏi: ' + r.q + '\n\nGiấc mơ: ' + r.dream + '\n\nHình ảnh: ' + r.image + '\n\nĐiều họ nghe thấy: ' + r.reading +
      (r.note ? '\n\nHỏi thêm, khung giờ: ' + r.note : '') +
      '\n\nSổ giấc mơ: https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '/edit';
    GmailApp.sendEmail(me, subject, body, { name: 'My Treasure Map', replyTo: r.email });
  } catch (err) {}
}

function clean(v, max) { return String(v === undefined || v === null ? '' : v).trim().slice(0, max); }
function safe(v) { return /^[=+\-@]/.test(v) ? "'" + v : v; }
function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');
}
function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
