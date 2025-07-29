const venom = require('venom-bot');

venom
  .create({
    session: 'sessionName',
    headless: true,
    useChrome: true,
    executablePath: '/usr/bin/google-chrome-stable',
    browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  .then(async (client) => {
    console.log('✅ Venom client is ready');

    const chats = await client.getAllChats();
    console.log(`💬 Total chats: ${chats.length}`);

    chats.forEach((chat, index) => {
      console.log(`📦 Chat ${index + 1}:`);
      console.log(`🆔 chatId: ${chat.id._serialized}`);
      console.log(`📛 Name: ${chat.name || 'No Name'}`);
      console.log(`👥 Is Group: ${chat.isGroup}`);
      console.log('---');
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start Venom:', error);
  });
