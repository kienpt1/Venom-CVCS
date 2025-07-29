const express = require('express');
const venom = require('venom-bot');

const app = express();
// Middleware xử lý JSON và x-www-form-urlencoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const activeAlerts = new Map();
let client = null;

// Khởi tạo phiên WhatsApp
venom
  .create({
    session: 'sessionName_0001',
    headless: 'new',
    devtools: false,
    useChrome: true,
    executablePath: '/usr/bin/google-chrome-stable',
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
      '--disable-accelerated-2d-canvas',
      '--disable-infobars',
      '--window-size=1280,800',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  })
  .then((_client) => {
    client = _client;
    console.log('✅ Venom client is ready');
    startListeners(client);
  })
  .catch((err) => {
    console.error('❌ Venom startup error:', err);
  });

// Kiểm tra trạng thái Venom
app.get('/venom-status', (req, res) => {
  if (client) {
    res.send('✅ Venom is running');
  } else {
    res.status(503).send('⛔ Venom is not ready');
  }
});

app.post('/prtg-webhook-electric-me', async (req, res) => {
  if (!client) {
    return res.status(500).send('⛔ Venom chưa sẵn sàng');
  }
  
  const data = req.body;
  console.log('📩 Nhận webhook điện:', JSON.stringify(data, null, 2));
  if (
    typeof data !== 'object' ||
    !data.status ||
    !data.EQID ||
    !data.Location ||
    !data.Alert_Description ||
    !data.datetime
  ) {
    console.error('⚠️ Dữ liệu không hợp lệ hoặc thiếu trường');
    return res.status(400).send('❌ Webhook không hợp lệ. Thiếu trường dữ liệu.');
  }

  const groupId = '120363421330078437@g.us';
  const normalizedStatus = data.status.toLowerCase();
  const normalizedDescription = data.Alert_Description.replace(/\s+/g, ' ').trim();
  const key = `${data.EQID}-${normalizedDescription}`;
  const now = Date.now();
  const previous = activeAlerts.get(key);
  let shouldSend = false;
  let repeatNotice = '';

  if (!previous) {
    shouldSend = true;
  } else {
    if (previous.datetime !== data.datetime) {
      // Thời gian khác -> là alert mới hoặc lặp lại sau thời gian dài
      if (now - previous.timestamp > 300000) { // 5 phút
        repeatNotice = '\n🔁 *Cảnh báo lặp lại sau 5 phút*';
        shouldSend = true;
      }
    }
  }

  if (!shouldSend) {
    return res.send('ℹ️ Không cần gửi lại alert.');
  }

  const message = `📡 *CẢNH BÁO TỪ TRẠM CVCS*\n📍 Trạm: ${data.Location}\n🔢 EQID: ${data.EQID}\n⚠️ Mô tả: ${data.Alert_Description}\n🕒 Thời gian: ${data.datetime}${repeatNotice}`;

  try {
    await client.sendText(groupId, message);
    activeAlerts.set(key, {
      status: normalizedStatus,
      timestamp: now,
      datetime: data.datetime  // Lưu để so sánh lần sau
    });
    res.send('✅ Đã gửi cảnh báo vào WhatsApp');
  } catch (err) {
    console.error('❌ Lỗi gửi tin nhắn:', err);
    res.status(500).send('❌ Gửi tin nhắn thất bại');
  }
});
// Lắng nghe sự kiện WhatsApp
function startListeners(client) {
  client.getAllChats().then((chats) => {
    chats.forEach((chat) => {
      if (chat.isGroup) {
        console.log(`📣 Nhóm: ${chat.name} - ID: ${chat.id._serialized}`);
      }
    });
  });

  client.onAnyMessage((message) => {
    if (message.fromMe) return; // Bỏ qua tin nhắn do bot gửi ra
    console.log('📥 Nhận tin nhắn:', message.body);
  });

  client.onStateChange((state) => {
    console.log('📶 Trạng thái:', state);
  });

  client.onMessageReaction((reaction) => {
    console.log('🧡 Phản ứng:', reaction);
  });
}

// Chạy server
const PORT = 4587;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server đang chạy tại http://localhost:${PORT}`);
});
