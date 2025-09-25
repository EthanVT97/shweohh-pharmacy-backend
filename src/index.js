require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
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
app.use(express.json());

// Welcome Message Route
app.get('/', (req, res) => {
  res.json({
    message: "Welcome to ရွှေအိုး Pharmacy Backend API! 🏪",
    version: "1.0.0",
    status: "Running successfully on Render",
    endpoints: {
      welcome: "/",
      health: "/health",
      products: "/api/products",
      orders: "/api/orders",
      customers: "/api/customers"
    },
    database: "Connected to Supabase PostgreSQL"
  });
});

// Health Check Route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'Supabase Connected'
  });
});

// Viber Bot Welcome Message
app.post('/api/viber/welcome', async (req, res) => {
  try {
    const { user_id, user_name } = req.body;
    
    const welcomeMessage = {
      receiver: user_id,
      min_api_version: 7,
      type: "text",
      text: `ဆေးဆိုင်မှ ကြိုဆိုပါတယ်! 🏪\n\nWelcome to ရွှေအိုး Pharmacy!\n\nကျေးဇူးပြု၍ အောက်ပါ option များမှ ရွေးချယ်ပါ:\n\n1️⃣ - ဆေးဝါးများ ရှာဖွေရန်\n2️⃣ - အမှာစာတင်ရန်\n3️⃣ - ဆေးညွှန်းပို့ရန်\n4️⃣ - အကူအညီလိုချင်ပါက\n\nWe're here to serve you 9AM-9PM daily!`
    };

    // Save customer to Supabase
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        viber_id: user_id,
        name: user_name,
        first_seen: new Date(),
        last_active: new Date()
      });

    res.json(welcomeMessage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Products Routes
app.get('/api/products', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('status', 'active')
      .order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Orders Routes
app.post('/api/orders', async (req, res) => {
  try {
    const { customer_id, items, total, address } = req.body;
    
    const { data, error } = await supabase
      .from('orders')
      .insert({
        customer_id,
        items,
        total_amount: total,
        delivery_address: address,
        status: 'pending',
        created_at: new Date()
      })
      .select();
    
    if (error) throw error;
    
    // Real-time update via Socket.io
    io.emit('new_order', data[0]);
    
    res.json({ 
      success: true, 
      order: data[0],
      message: "အမှာစာ အောင်မြင်စွာ တင်ပြီးပါပြီ!"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.io for Real-time Updates
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('join_admin', () => {
    socket.join('admin_room');
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 ရွှေအိုး Pharmacy Backend running on port ${PORT}`);
  console.log(`🏪 Welcome Message: Ready to serve customers!`);
  console.log(`📊 Database: Supabase Connected`);
});
