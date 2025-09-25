import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import prescriptionRoutes from './routes/prescriptions.js';
import messageRoutes from './routes/messages.js';
import viberService from './services/viberService.js';

dotenv.config();

const welcomeMessages = {
  myanmar: `ဆေးဆိုင်မှ ကြိုဆိုပါတယ်! 🏪

ကျေးဇူးပြု၍ အောက်ပါ option များမှ ရွေးချယ်ပါ:

1️⃣ - ဆေးဝါးများ ရှာဖွေရန်
2️⃣ - အမှာစာတင်ရန်  
3️⃣ - ဆေးညွှန်းပို့ရန်
4️⃣ - အကူအညီလိုချင်ပါက

ဖွင့်ချိန်: နံနက် ၉နာရီ - ည ၉နာရီ`,

  english: `Welcome to ရွှေအိုး Pharmacy! 🏪

Please choose from the following options:

1️⃣ - Search Medicines
2️⃣ - Place Order
3️⃣ - Upload Prescription  
4️⃣ - Need Help

Open Hours: 9AM - 9PM Daily`
};

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Welcome to ရွှေအိုး Pharmacy Backend API! 🏪",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      welcome: "/",
      health: "/health",
      products: "/api/products",
      orders: "/api/orders",
      customers: "/api/customers",
      prescriptions: "/api/prescriptions",
      messages: "/api/messages"
    },
    database: "Supabase PostgreSQL"
  });
});

app.get('/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
    
    res.json({
      status: 'OK',
      database: error ? 'Disconnected' : 'Connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'Error', 
      error: error.message 
    });
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const { event, message, sender, message_token } = req.body;
    
    if (event === 'message') {
      const combinedWelcomeText = `${welcomeMessages.myanmar}\n\n${welcomeMessages.english.replace('Welcome to ရွှေအိုး Pharmacy! 🏪\n\n', '')}`;
      
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert({
          viber_id: sender.id,
          name: sender.name,
          first_seen: new Date(),
          last_active: new Date()
        }, { onConflict: 'viber_id' })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error upserting customer from webhook:', customerError);
        return res.status(500).json({ error: customerError.message });
      }

      const customerId = customerData.id;

      const { data: savedMessage, error: messageSaveError } = await supabase
        .from('messages')
        .insert({
          customer_id: customerId,
          sender_type: 'customer',
          message_text: message.text,
          viber_message_id: message_token,
          created_at: new Date()
        })
        .select();

      if (messageSaveError) {
        console.error('Error saving incoming message:', messageSaveError);
      } else {
        io.to('admin_room').emit('new_customer_message', {
          customer_id: customerId,
          customer_name: sender.name,
          viber_id: sender.id,
          message: savedMessage[0]
        });
      }
      res.json({ status: 'ok' });

    } else if (event === 'subscribed') {
      const combinedWelcomeText = `${welcomeMessages.myanmar}\n\n${welcomeMessages.english.replace('Welcome to ရွှေအိုး Pharmacy! 🏪\n\n', '')}`;
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .upsert({
          viber_id: sender.id,
          name: sender.name,
          first_seen: new Date(),
          last_active: new Date()
        }, { onConflict: 'viber_id' })
        .select('id')
        .single();

      if (customerError) {
        console.error('Error upserting customer on subscribe:', customerError);
      } else {
        await viberService.sendViberMessage(sender.id, combinedWelcomeText);
      }
      res.json({ status: 'ok' });
    }
    else {
      res.json({ status: 'ok' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.use('/api/orders', orderRoutes(supabase, io));
app.use('/api/products', productRoutes(supabase));
app.use('/api/customers', customerRoutes(supabase));
app.use('/api/prescriptions', prescriptionRoutes(supabase));
app.use('/api/messages', messageRoutes(supabase));

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log('Admin joined room');
  });
  
  socket.on('new_order', (orderData) => {
    socket.to('admin_room').emit('order_created', orderData);
  });

  socket.on('admin_send_message', async ({ customerViberId, customerId, messageText }) => {
    try {
      if (!customerViberId || !customerId || !messageText) {
        throw new Error('Missing customerViberId, customerId, or messageText for admin_send_message');
      }

      const viberResponse = await viberService.sendViberMessage(customerViberId, messageText);

      if (!viberResponse.success) {
        throw new Error(viberResponse.error);
      }

      const { data: savedMessage, error: messageSaveError } = await supabase
        .from('messages')
        .insert({
          customer_id: customerId,
          sender_type: 'admin',
          message_text: messageText,
          created_at: new Date()
        })
        .select();

      if (messageSaveError) {
        console.error('Error saving admin message to DB:', messageSaveError);
      }

      io.to('admin_room').emit('new_admin_message', {
        customer_id: customerId,
        viber_id: customerViberId,
        message: savedMessage ? savedMessage[0] : { message_text: messageText, sender_type: 'admin', created_at: new Date() }
      });
      
      console.log(`Admin sent message to ${customerViberId}: ${messageText}`);

    } catch (error) {
      console.error('Error handling admin_send_message:', error);
      socket.emit('admin_message_error', { error: error.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 ရွှေအိုး Pharmacy Backend running on port ${PORT}`);
  console.log(`🏪 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Database: Supabase Connected`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
});

export default app;
