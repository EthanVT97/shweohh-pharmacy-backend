import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const VIBER_API_URL = 'https://chatapi.viber.com/pa/send_message';
const VIBER_BOT_TOKEN = process.env.VIBER_BOT_TOKEN;

const viberApi = axios.create({
  baseURL: VIBER_API_URL,
  headers: {
    'X-Viber-Auth-Token': VIBER_BOT_TOKEN,
    'Content-Type': 'application/json'
  }
});

const sendViberMessage = async (receiverId, messageText) => {
  try {
    const response = await viberApi.post('', {
      receiver: receiverId,
      type: 'text',
      text: messageText
    });
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending Viber message:', error.response ? error.response.data : error.message);
    return { success: false, error: error.response ? error.response.data : error.message };
  }
};

export default { sendViberMessage };
