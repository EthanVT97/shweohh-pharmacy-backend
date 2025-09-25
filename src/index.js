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
import { PerformanceMonitor, RateLimiter, createHealthEndpoint } from './utils/monitoring.js';
import { messageTemplates, createBilingualMessage, logWebhookEvent, safeAsyncHandler } from './utils/helpers.js';

dotenv.config();

// Initialize monitoring and rate limiting
const monitor = new PerformanceMonitor();
const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

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

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Performance monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path === '/webhook') {
      monitor.recordWebhookRequest(duration);
    }
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: "Welcome to ရွှေအိုး Pharmacy Backend API! 🏪",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    endpoints: {
      welcome: "/",
      health: "/health",
      metrics: "/metrics",
      products: "/api/products",
      orders: "/api/orders",
      customers: "/api/customers",
      prescriptions: "/api/prescriptions",
      messages: "/api/messages",
      webhook: "/webhook"
    },
    database: "Supabase PostgreSQL",
    features: [
      "Viber Bot Integration",
      "Real-time Socket.IO",
      "Bilingual Support (Myanmar/English)",
      "Performance Monitoring",
      "Rate Limiting"
    ]
  });
});

// Enhanced health endpoint
app.get('/health', createHealthEndpoint(supabase, monitor));

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    success: true,
    ...monitor.getMetrics()
  });
});

// Enhanced webhook handler
app.post('/webhook', safeAsyncHandler(async (req, res) => {
  const startTime = Date.now();
  const { event, message, sender, message_token } = req.body;
  
  logWebhookEvent(event, { sender, message });
  
  // Rate limiting check
  if (!rateLimiter.isAllowed(sender?.id || 'unknown')) {
    console.log(`🚫 Rate limit exceeded for ${sender?.id}`);
    return res.json({ status: 'ok' });
  }

  try {
    if (event === 'message') {
      await handleIncomingMessage(sender, message, message_token);
    } else if (event === 'subscribed') {
      await handleUserSubscription(sender);
    } else if (event === 'unsubscribed') {
      await handleUserUnsubscription(sender);
    } else {
      console.log(`📋 Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    monitor.recordDatabaseError();
  }

  res.json({ status: 'ok' });
}));

// Handle incoming customer messages
async function handleIncomingMessage(sender, message, messageToken) {
  try {
    // Ensure customer exists
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        viber_id: sender.id,
        name: sender.name,
        last_active: new Date()
      }, { onConflict: 'viber_id' })
      .select('id')
      .single();

    if (customerError) {
      console.error('❌ Error upserting customer:', customerError);
      monitor.recordDatabaseError();
      return;
    }

    const customerId = customerData.id;

    // Save customer message
    const { data: savedMessage, error: messageSaveError } = await supabase
      .from('messages')
      .insert({
        customer_id: customerId,
        sender_type: 'customer',
        message_text: message.text || '[Non-text message]',
        viber_message_id: messageToken,
        created_at: new Date()
      })
      .select()
      .single();

    if (messageSaveError) {
      console.error('❌ Error saving customer message:', messageSaveError);
      monitor.recordDatabaseError();
      return;
    }

    // Emit to admin room for real-time updates
    io.to('admin_room').emit('new_customer_message', {
      customer_id: customerId,
      customer_name: sender.name,
      viber_id: sender.id,
      message: savedMessage
    });
    
    console.log(`✅ Customer message processed: ${sender.name}`);
  } catch (error) {
    console.error('❌ Error in handleIncomingMessage:', error);
    monitor.recordDatabaseError();
  }
}

// Handle user subscription
async function handleUserSubscription(sender) {
  try {
    // Save/update customer
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
      console.error('❌ Error saving new subscriber:', customerError);
      monitor.recordDatabaseError();
      return;
    }

    console.log(`✅ New subscriber: ${sender.name} (${sender.id})`);
    
    // Notify admins about new subscriber
    io.to('admin_room').emit('new_subscriber', {
      customer_id: customerData.id,
      customer_name: sender.name,
      viber_id: sender.id
    });

    // Send bilingual welcome message
    const welcomeText = createBilingualMessage(
      messageTemplates.welcome.myanmar,
      messageTemplates.welcome.english
    );

    const welcomeResult = await viberService.sendViberMessage(sender.id, welcomeText);
    if (welcomeResult.success) {
      console.log(`✅ Welcome message sent to ${sender.name}`);
      monitor.recordMessageSent();
      
      // Log welcome message in database
      await supabase
        .from('messages')
        .insert({
          customer_id: customerData.id,
          sender_type: 'system',
          message_text: welcomeText,
          created_at: new Date()
        });
    } else {
      console.error('❌ Failed to send welcome message:', welcomeResult.error);
      monitor.recordViberApiError();
    }
  } catch (error) {
    console.error('❌ Error in handleUserSubscription:', error);
    monitor.recordDatabaseError();
  }
}

// Handle user unsubscription
async function handleUserUnsubscription(sender) {
  try {
    await supabase
      .from('customers')
      .update({ 
        last_active: new Date(),
        updated_at: new Date()
      })
      .eq('viber_id', sender.id);
    
    console.log(`📤 User unsubscribed: ${sender.name} (${sender.id})`);
    
    // Notify admins
    io.to('admin_room').emit('user_unsubscribed', {
      customer_name: sender.name,
      viber_id: sender.id
    });
  } catch (error) {
    console.error('❌ Error processing unsubscribe:', error);
    monitor.recordDatabaseError();
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  socket.on('join_admin', () => {
    socket.join('admin_room');
    console.log('👨‍💼 Admin joined room');
    
    // Send current metrics to admin
    socket.emit('system_metrics', monitor.getMetrics());
  });
  
  // Enhanced admin message handling
  socket.on('admin_send_message', async ({ customerViberId, customerId, messageText }) => {
    try {
      if (!customerViberId || !customerId || !messageText) {
        throw new Error('Missing required fields: customerViberId, customerId, or messageText');
      }

      console.log(`📤 Admin sending message to ${customerViberId}: ${messageText.substring(0, 50)}...`);

      // Send message via Viber API
      const viberResponse = await viberService.sendViberMessage(customerViberId, messageText);

      if (!viberResponse.success) {
        monitor.recordViberApiError();
        throw new Error(`Viber API error: ${viberResponse.error}`);
      }

      monitor.recordMessageSent();

      // Save admin message to database
      const { data: savedMessage, error: messageSaveError } = await supabase
        .from('messages')
        .insert({
          customer_id: customerId,
          sender_type: 'admin',
          message_text: messageText,
          created_at: new Date()
        })
        .select()
        .single();

      if (messageSaveError) {
        console.error('❌ Error saving admin message to DB:', messageSaveError);
        monitor.recordDatabaseError();
      }

      // Emit back to admin room for UI synchronization
      io.to('admin_room').emit('new_admin_message', {
        customer_id: customerId,
        viber_id: customerViberId,
        message: savedMessage || { 
          message_text: messageText, 
          sender_type: 'admin', 
          created_at: new Date() 
        }
      });
      
      console.log(`✅ Admin message sent and logged successfully`);

    } catch (error) {
      console.error('❌ Error handling admin_send_message:', error);
      socket.emit('admin_message_error', { 
        error: error.message,
        customerViberId,
        customerId 
      });
    }
  });

  // Handle admin quick actions
  socket.on('admin_quick_action', async ({ action, customerId, customerViberId, data }) => {
    try {
      let messageText = '';
      
      switch (action) {
        case 'order_confirmed':
          messageText = createBilingualMessage(
            `အမှာစာ လက်ခံပြီးပါပြီ! ✅\nအမှာစာနံပါတ်: ${data.orderId}\nစုစုပေါင်းငွေ: ${data.totalAmount} ကျပ်\nကျွန်ုပ်တို့က မကြာမီ ဆက်သွယ်ပါမယ်။`,
            `Order confirmed! ✅\nOrder ID: ${data.orderId}\nTotal: ${data.totalAmount} MMK\nWe'll contact you soon.`
          );
          break;
        case 'prescription_received':
          messageText = createBilingualMessage(
            messageTemplates.prescriptionReceived.myanmar,
            messageTemplates.prescriptionReceived.english
          );
          break;
        default:
          throw new Error(`Unknown quick action: ${action}`);
      }

      // Send the message
      const viberResponse = await viberService.sendViberMessage(customerViberId, messageText);
      if (viberResponse.success) {
        monitor.recordMessageSent();
        
        // Log in database
        await supabase
          .from('messages')
          .insert({
            customer_id: customerId,
            sender_type: 'admin',
            message_text: messageText,
            created_at: new Date()
          });
        
        socket.emit('quick_action_success', { action, customerId });
      } else {
        monitor.recordViberApiError();
        throw new Error(viberResponse.error);
      }
    } catch (error) {
      console.error('❌ Error handling admin_quick_action:', error);
      socket.emit('quick_action_error', { 
        error: error.message, 
        action, 
        customerId 
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/orders', orderRoutes(supabase, io));
app.use('/api/products', productRoutes(supabase));
app.use('/api/customers', customerRoutes(supabase));
app.use('/api/prescriptions', prescriptionRoutes(supabase));
app.use('/api/messages', messageRoutes(supabase));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('💥 Express error:', err.stack);
  monitor.recordDatabaseError();
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    available_endpoints: {
      welcome: "/",
      health: "/health",
      metrics: "/metrics",
      products: "/api/products",
      orders: "/api/orders",
      customers: "/api/customers",
      prescriptions: "/api/prescriptions",
      messages: "/api/messages",
      webhook: "/webhook"
    }
  });
});

// Cleanup function for graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, starting graceful shutdown...');
  server.close(() => {
    console.log('✅ Server closed successfully');
    process.exit(0);
  });
});

// Periodic cleanup and metrics logging
setInterval(() => {
  rateLimiter.cleanup();
  if (process.env.NODE_ENV !== 'production') {
    monitor.logMetrics();
  }
}, 5 * 60 * 1000); // Every 5 minutes

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 ရွှေအိုး Pharmacy Backend v2.0 running on port ${PORT}`);
  console.log(`🏪 Environment: ${process.env.NODE_ENV}`);
  console.log(`📊 Database: Supabase Connected`);
  console.log(`📍 API URL: http://localhost:${PORT}`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`📈 Metrics: http://localhost:${PORT}/metrics`);
  console.log(`⚡ Features: Viber Bot, Socket.IO, Monitoring, Rate Limiting`);
});

export default app;
