import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Routes
import orderRoutes from './routes/orders.js';
import productRoutes from './routes/products.js';
import customerRoutes from './routes/customers.js';
import prescriptionRoutes from './routes/prescriptions.js';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Supabase Configuration
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Welcome Message Route
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
      prescriptions: "/api/prescriptions"
    },
    database: "Supabase PostgreSQL"
  });
});

// Health Check Route
app.get('/health', async (req, res) => {
  try {
    // Test database connection
    const { data, error } = await supabase.from('products').select('count').limit(1);
    
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

// Viber Webhook Route
app.post('/webhook', async (req, res) => {
  try {
    const { event, message, sender } = req.body;
    
    if (event === 'message') {
      // Handle incoming message
      const welcomeMessage = {
        receiver: sender.id,
        min_api_version: 7,
        type: "text",
        text: `ဆေးဆိုင်မှ ကြိုဆိုပါတယ်! 🏪\n\nWelcome to ရွှေအိုး Pharmacy!\n\nကျေးဇူးပြု၍ အောက်ပါ option များမှ ရွေးချယ်ပါ:\n\n1️⃣ - ဆေးဝါးများ ရှာဖွေရန်\n2️⃣ - အမှာစာတင်ရန်\n3️⃣ - ဆေးညွှန်းပို့ရန်\n4️⃣ - အကူအညီလိုချင်ပါက\n\nWe're here to serve you 9AM-9PM daily!`
      };

      // Save customer to database
      const { error } = await supabase
        .from('customers')
        .upsert({
          viber_id: sender.id,
          name: sender.name,
          first_seen: new Date(),
          last_active: new Date()
        });

      res.json(welcomeMessage);
    } else {
      res.json({ status: 'ok' });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.use('/api/orders', orderRoutes(supabase, io));
app.use('/api/products', productRoutes(supabase));
app.use('/api/customers', customerRoutes(supabase));
app.use('/api/prescriptions', prescriptionRoutes(supabase));

// Socket.io for Real-time Updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log('Admin joined room');
  });
  
  socket.on('new_order', (orderData) => {
    socket.to('admin_room').emit('order_created', orderData);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// 404 Handler
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
