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

// Simple inline implementations to avoid import issues
class PerformanceMonitor {
  constructor() {
    this.metrics = {
      webhookRequests: 0,
      messagesSent: 0,
      databaseErrors: 0,
      viberApiErrors: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      peakMemoryUsage: 0,
      activeConnections: 0
    };
    this.startTime = Date.now();
  }

  recordWebhookRequest(responseTime) {
    this.metrics.webhookRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.updateAverageResponseTime();
  }

  recordMessageSent() {
    this.metrics.messagesSent++;
  }

  recordDatabaseError() {
    this.metrics.databaseErrors++;
  }

  recordViberApiError() {
    this.metrics.viberApiErrors++;
  }

  updateAverageResponseTime() {
    if (this.metrics.webhookRequests > 0) {
      this.metrics.averageResponseTime = 
        this.metrics.totalResponseTime / this.metrics.webhookRequests;
    }
  }

  getMetrics() {
    const memUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime;
    
    // Update peak memory usage
    if (memUsage.heapUsed > this.metrics.peakMemoryUsage) {
      this.metrics.peakMemoryUsage = memUsage.heapUsed;
    }

    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      uptimeFormatted: this.formatUptime(uptime),
      memoryUsage: {
        current: memUsage.heapUsed,
        peak: this.metrics.peakMemoryUsage,
        total: memUsage.heapTotal,
        formatted: {
          current: this.formatBytes(memUsage.heapUsed),
          peak: this.formatBytes(this.metrics.peakMemoryUsage),
          total: this.formatBytes(memUsage.heapTotal)
        }
      }
    };
  }

  formatUptime(uptime) {
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h ${minutes % 60}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m ${seconds % 60}s`;
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  logMetrics() {
    console.log('📊 System Metrics:', JSON.stringify(this.getMetrics(), null, 2));
  }
}

class RateLimiter {
  constructor(maxRequests = 100, windowMs = 60000) {
    this.requests = new Map();
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier) {
    const now = Date.now();
    const userRequests = this.requests.get(identifier) || [];
    
    const validRequests = userRequests.filter(time => now - time < this.windowMs);
    
    if (validRequests.length >= this.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    return true;
  }

  cleanup() {
    const now = Date.now();
    for (const [identifier, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => now - time < this.windowMs);
      if (validRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, validRequests);
      }
    }
  }
}

// Message templates
const messageTemplates = {
  welcome: {
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
  }
};

const createBilingualMessage = (myanmarText, englishText) => {
  return `${myanmarText}\n\n${englishText}`;
};

const logWebhookEvent = (event, data) => {
  const timestamp = new Date().toISOString();
  const senderInfo = data.sender || data.user; // Use data.user for conversation_started
  console.log(`[${timestamp}] 📨 Webhook: ${event}`, {
    sender_id: senderInfo?.id,
    sender_name: senderInfo?.name,
    message_preview: data.message?.text?.substring(0, 50) + (data.message?.text?.length > 50 ? '...' : ''),
    message_type: data.message?.type || 'N/A'
  });
};

const safeAsyncHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      res.json({ status: 'ok' });
    }
  };
};

const createHealthEndpoint = (supabase, monitor) => {
  return async (req, res) => {
    try {
      const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      
      res.json({
        status: 'OK',
        database: error ? 'Disconnected' : 'Connected',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        metrics: monitor.getMetrics()
      });
    } catch (error) {
      res.status(500).json({ 
        status: 'Error', 
        error: error.message 
      });
    }
  };
};

// Initialize monitoring and rate limiting
const monitor = new PerformanceMonitor();
const rateLimiter = new RateLimiter(100, 60000);

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

// Auto Welcome Message for conversation_started
const handleConversationStarted = async (eventData) => {
  try {
    const sender = eventData.user; // Viber's conversation_started uses 'user' for sender info
    const senderId = sender.id;
    const senderName = sender.name;

    // Save/update customer on conversation started
    const { data: customerData, error: customerError } = await supabase
      .from('customers')
      .upsert({
        viber_id: senderId,
        name: senderName,
        first_seen: new Date(),
        last_active: new Date()
      }, { onConflict: 'viber_id' })
      .select('id')
      .single();

    if (customerError) {
      console.error('❌ Error upserting customer on conversation_started:', customerError);
      monitor.recordDatabaseError();
      return;
    }

    const customerId = customerData.id;

    const welcomeText = createBilingualMessage(
      messageTemplates.welcome.myanmar,
      messageTemplates.welcome.english
    );

    const welcomeResult = await viberService.sendViberMessage(senderId, welcomeText);
    if (welcomeResult.success) {
      console.log(`✅ Welcome message sent to ${senderName} (${senderId}) on conversation_started.`);
      monitor.recordMessageSent();
      
      // Log welcome message in database
      await supabase
        .from('messages')
        .insert({
          customer_id: customerId,
          sender_type: 'system',
          message_text: welcomeText,
          created_at: new Date()
        });
    } else {
      console.error('❌ Failed to send welcome message on conversation_started:', welcomeResult.error);
      monitor.recordViberApiError();
    }
  } catch (error) {
    console.error('❌ Error in handleConversationStarted:', error);
    monitor.recordDatabaseError();
  }
};

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

// Enhanced webhook handler
app.post('/webhook', safeAsyncHandler(async (req, res) => {
  const event = req.body.event;
  const eventData = req.body;
  
  logWebhookEvent(event, eventData);
  
  // Rate limiting check
  const senderIdForRateLimit = eventData.sender?.id || eventData.user?.id || 'unknown';
  if (!rateLimiter.isAllowed(senderIdForRateLimit)) {
    console.log(`🚫 Rate limit exceeded for ${senderIdForRateLimit}`);
    return res.json({ status: 'ok' });
  }

  try {
    switch (event) {
      case 'conversation_started':
        await handleConversationStarted(eventData);
        break;
      case 'message':
        const { message, sender, message_token } = eventData;
        await handleIncomingMessage(sender, message, message_token);
        break;
      case 'subscribed':
        const { sender: subscribedSender } = eventData;
        await handleUserSubscription(subscribedSender);
        break;
      case 'unsubscribed':
        const { sender: unsubscribedSender } = eventData;
        await handleUserUnsubscription(unsubscribedSender);
        break;
      default:
        console.log(`📋 Unhandled webhook event: ${event}`);
    }
  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    monitor.recordDatabaseError();
  }

  res.json({ status: 'ok' });
}));


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