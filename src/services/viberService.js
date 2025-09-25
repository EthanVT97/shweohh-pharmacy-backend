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

const sendViberMessage = async (receiverId, messageContent) => {
  try {
    let payload;

    if (typeof messageContent === 'string') {
      // If messageContent is a plain string, send it as a text message
      payload = {
        receiver: receiverId,
        type: 'text',
        text: messageContent
      };
    } else if (typeof messageContent === 'object' && messageContent !== null) {
      // If messageContent is an object, assume it contains type, text, and potentially keyboard
      if (!messageContent.type || !messageContent.text) {
        throw new Error("Message object must have 'type' and 'text' properties.");
      }

      payload = {
        receiver: receiverId,
        type: messageContent.type,
        text: messageContent.text,
        // Add keyboard if it exists in the messageContent object
        ...(messageContent.keyboard && { keyboard: messageContent.keyboard })
      };
    } else {
      throw new Error('Unsupported messageContent format. Must be a string or an object.');
    }

    const response = await viberApi.post('', payload);
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Error sending Viber message:', error.response ? error.response.data : error.message);
    return { success: false, error: error.response ? error.response.data : error.message };
  }
};

export default { sendViberMessage };
