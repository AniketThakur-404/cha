const express = require('express');
const axios = require('axios');
const WhatsAppCarProtectionBot = require('./bot');
const app = express();
const bot = new WhatsAppCarProtectionBot();

// Replace these with your actual values from Meta Dashboard
const VERIFY_TOKEN = 'CarBot2025';
const ACCESS_TOKEN = 'EAAc9GSD0KEkBP0ZCY2noxnp11RwIhKeqyQ9U43ANItEAbNl1vCULSgBxB5YLZCdCMfYXoQWlTHZCTZA9OaBdpzUMsQg93SZCsCbbeyZB0sHBbxFSZANFbhHrVzJdvNXPm7ZAcucp02TXSsTDENqZCod64G5jpy6IqboJD2XpUKhRQ2S3XHYc5fyTM0mLHseZCyeiZCBXCMPipiL89rIboN4JAbqNvv5FMmlZCodjdgZAAPrztUE88DXseXxRAOkLUuIgDjdqWkKsTl0Uuo4E6KyjSHYK3';
const PHONE_NUMBER_ID = '789143067615427';

// ====================================================
// ✅ 1. DATABASE SETUP (PostgreSQL via Sequelize)
// ====================================================
const sequelize = require('./db');
const User = require('./models/User');
const Session = require('./models/Session');
const Message = require('./models/Message');

User.hasMany(Session);
Session.belongsTo(User);
Session.hasMany(Message);
Message.belongsTo(Session);

// Initialize DB connection
sequelize
  .sync()
  .then(() => console.log('✅ PostgreSQL connected & synced'))
  .catch(err => console.error('❌ Database sync error:', err));

// ====================================================
// Middleware and basic setup
// ====================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

app.use(express.static('public'));

// Health check
app.get('/', (req, res) => {
  res.json({
    message: 'WhatsApp Car Protection Chatbot Server',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// ====================================================
// Webhook verification (GET)
// ====================================================
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified successfully!');
    res.status(200).send(challenge);
  } else {
    console.log('❌ Webhook verification failed');
    res.status(403).send('Verification failed');
  }
});

// ====================================================
// Webhook message receiver (POST)
// ====================================================
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    res.status(200).json({ status: 'received' }); // immediate response to WhatsApp

    if (body.object !== 'whatsapp_business_account') return;
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return;

    const senderId = message.from;
    let messageText = '';

    if (message.type === 'text') messageText = message.text.body;
    else if (message.type === 'interactive') {
      if (message.interactive.type === 'button_reply')
        messageText = message.interactive.button_reply.title;
      else if (message.interactive.type === 'list_reply')
        messageText = message.interactive.list_reply.title;
    } else return;

    console.log(`📩 Incoming from ${senderId}: ${messageText}`);

    // ====================================================
    // 🧠 DATABASE INTEGRATION START
    // ====================================================
    let user = await User.findOne({ where: { phone_number: senderId } });
    if (!user) {
      user = await User.create({ phone_number: senderId });
    }

    let session = await Session.findOne({
      where: { UserId: user.id },
      order: [['updatedAt', 'DESC']],
    });
    if (!session) {
      session = await Session.create({
        UserId: user.id,
        current_step: 'welcome',
      });
    }

    await Message.create({
      SessionId: session.id,
      sender: 'user',
      message_text: messageText,
    });
    // ====================================================

    // Handle numeric reply fallback
    if (/^\d+$/.test(messageText.trim())) {
      const num = parseInt(messageText.trim());
      const sessionData = bot.getSession(senderId);
      const lastBotMsg = getLastBotMessageWithButtons(sessionData);
      if (lastBotMsg?.buttons && num >= 1 && num <= lastBotMsg.buttons.length) {
        messageText = lastBotMsg.buttons[num - 1];
      }
    }

    // 🤖 Process message with bot
    const botResponse = bot.processMessage(senderId, messageText, user.name);

    // Save bot response in DB
    await Message.create({
      SessionId: session.id,
      sender: 'bot',
      message_text: botResponse.text,
    });

    // Update session step & data
    const liveSession = bot.getSession(senderId);
    
    // If name was collected, save it to the user record
    if (liveSession?.user_name && liveSession?.name_collected && !user.name) {
      await user.update({ name: liveSession.user_name });
      console.log(`✅ Saved user name: ${liveSession.user_name} for ${senderId}`);
    }
    
    await session.update({
      current_step: liveSession?.step || 'unknown',
      selected_package: liveSession?.selected_package || null,
      location: liveSession?.location || null,
    });

    // ====================================================
    // 🧠 DATABASE INTEGRATION END
    // ====================================================

    // Send WhatsApp message
    await sendWhatsAppResponse(senderId, botResponse);
  } catch (error) {
    console.error('❌ Webhook error:', error);
  }
});

// Helper - placeholder
function getLastBotMessageWithButtons(session) {
  return null;
}

// ====================================================
// WhatsApp send message logic (unchanged)
// ====================================================
// async function sendWhatsAppResponse(to, response) {
//   const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
//   const headers = {
//     Authorization: `Bearer ${ACCESS_TOKEN}`,
//     'Content-Type': 'application/json',
//   };

//   let data;
//   if (response.buttons && response.buttons.length > 0) {
//     if (response.buttons.length <= 10) {
//       data = {
//         messaging_product: 'whatsapp',
//         recipient_type: 'individual',
//         to: to,
//         type: 'interactive',
//         interactive: {
//           type: 'list',
//           header: { type: 'text', text: 'Select an option' },
//           body: { text: response.text },
//           action: {
//             button: 'View Options',
//             sections: [
//               {
//                 title: 'Available Options',
//                 rows: response.buttons.map((b, i) => ({
//                   id: `opt_${i}_${Date.now()}`,
//                   title: b.slice(0, 24),
//                   description: b.slice(24, 96),
//                 })),
//               },
//             ],
//           },
//         },
//       };
//     } else {
//       let text = response.text + '\n\n*Reply with number:*\n';
//       response.buttons.forEach((b, i) => (text += `\n${i + 1}. ${b}`));
//       data = {
//         messaging_product: 'whatsapp',
//         to: to,
//         type: 'text',
//         text: { preview_url: false, body: text },
//       };
//     }
//   } else {
//     data = {
//       messaging_product: 'whatsapp',
//       to: to,
//       type: 'text',
//       text: { preview_url: false, body: response.text },
//     };
//   }

//   try {
//     console.log('📤 Sending WhatsApp:', JSON.stringify(data, null, 2));
//     await axios.post(url, data, { headers, timeout: 30000 });
//     console.log('✅ Sent successfully to', to);
//   } catch (err) {
//     console.error('❌ Send error:', err.response?.data || err.message);
//   }
// }
async function sendWhatsAppResponse(to, response) {
    const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
    const headers = {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    };
  
    let data;
  
    if (response.buttons && response.buttons.length > 0) {
      if (response.buttons.length <= 10) {
        data = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'list',
            header: {
              type: 'text',
              text: 'Select an option',
            },
            body: {
              text: response.text,
            },
            action: {
              button: 'View Options',
              sections: [
                {
                  title: 'Available Options',
                  rows: response.buttons.map((button, index) => {
                    const fullText = button.trim();
                    let title, description;
  
                    // Smart parsing: detect if text has parentheses for description
                    const parenMatch = fullText.match(/^(.+?)(\(.+\))$/);
  
                    if (parenMatch) {
                      // Text has format: "Main Title(Description)"
                      const mainTitle = parenMatch[1].trim();
                      const descText = parenMatch[2].trim();
  
                      // Ensure title fits in 24 char limit
                      if (mainTitle.length <= 24) {
                        title = mainTitle;
                        description = descText.substring(0, 72); // WhatsApp description limit
                      } else {
                        // Title too long, truncate at 24 and move rest to description
                        title = mainTitle.substring(0, 24);
                        description = (mainTitle.substring(24) + ' ' + descText).substring(0, 72);
                      }
                    } else {
                      // No parentheses detected - use simple split
                      if (fullText.length <= 24) {
                        title = fullText;
                        description = '';
                      } else {
                        // Find natural break point near char 24
                        let breakIndex = 24;
  
                        // Look for space, dash, or slash near the 24-char mark
                        for (let i = 24; i >= 18; i--) {
                          if (fullText[i] === ' ' || fullText[i] === '-' || fullText[i] === '/') {
                            breakIndex = i;
                            break;
                          }
                        }
  
                        title = fullText.substring(0, breakIndex).trim();
                        description = fullText.substring(breakIndex).trim().substring(0, 72);
                      }
                    }
  
                    return {
                      id: `option_${index}_${Date.now()}`,
                      title: title,
                      description: description,
                    };
                  }),
                },
              ],
            },
          },
        };
      } else {
        // For more than 10 buttons, use numbered text format
        let textWithButtons = response.text + '\n\n*Reply with number:*\n';
        response.buttons.forEach((button, index) => {
          textWithButtons += `\n${index + 1}. ${button}`;
        });
  
        data = {
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: {
            preview_url: false,
            body: textWithButtons,
          },
        };
      }
    } else {
      data = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          preview_url: false,
          body: response.text,
        },
      };
    }
  
    try {
      console.log('📤 Sending WhatsApp message:', JSON.stringify(data, null, 2));
  
      const config = {
        headers,
        timeout: 30000,
      };
  
      const apiResponse = await axios.post(url, data, config);
      console.log('✅ Message sent successfully to', to);
      return apiResponse.data;
    } catch (error) {
      console.error('❌ Error sending message:', error.response ? error.response.data : error.message);
  
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      }
  
      // Fallback to simple text if interactive message fails
      if (data.type === 'interactive') {
        console.log('🔄 Attempting fallback to simple text...');
        try {
          let fallbackText = response.text + '\n\n*Available options:*\n';
          response.buttons.forEach((button, index) => {
            fallbackText += `\n${index + 1}. ${button}`;
          });
          fallbackText += '\n\nPlease type the number of your choice.';
  
          const fallbackData = {
            messaging_product: 'whatsapp',
            to: to,
            type: 'text',
            text: {
              preview_url: false,
              body: fallbackText,
            },
          };
  
          const fallbackResponse = await axios.post(url, fallbackData, { headers, timeout: 10000 });
          console.log('✅ Fallback message sent successfully');
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError.message);
        }
      }
  
      throw error;
    }
  }
// ====================================================
// Test and session endpoints (unchanged)
// ====================================================
app.post('/test-message', (req, res) => {
  try {
    const { userId = 'test-user', message, userName = null } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const response = bot.processMessage(userId, message, userName);
    res.json({
      userId,
      userMessage: message,
      botResponse: response,
      sessionData: bot.getSession(userId),
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const session = bot.getSession(userId);
    res.json({ userId, sessionData: session });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/session/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    bot.sessions.delete(userId);
    res.json({ userId, message: 'Session reset successfully' });
  } catch {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ====================================================
// Error handler and server start
// ====================================================
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log('WhatsApp Car Protection Chatbot running on port ' + PORT);
  });
}

module.exports = app;

