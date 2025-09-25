# 🏪 ရွှေအိုး Pharmacy - Enhanced Backend API v2.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/express-4.18.2-blue)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/socket.io-4.7.4-black)](https://socket.io/)
[![Supabase](https://img.shields.io/badge/supabase-2.38.5-green)](https://supabase.com/)

A **production-ready**, robust backend API system designed to power the ရွှေအိုး (Shwe Oo) Pharmacy Viber Bot and Admin Dashboard. This enhanced version includes advanced features like real-time monitoring, comprehensive inventory management, prescription verification, and bilingual customer support.

## 🚀 **What's New in v2.0**

### ✨ **Major Enhancements**
- **🔄 Real-time Performance Monitoring** - Track system health, response times, and error rates
- **📊 Advanced Analytics Dashboard** - Comprehensive business intelligence and reporting
- **🛡️ Enhanced Security & Rate Limiting** - Protection against abuse and unauthorized access
- **💬 Bilingual Support (Myanmar/English)** - Complete localization for better customer experience
- **📦 Advanced Inventory Management** - Stock tracking, low stock alerts, and automated reordering
- **🔍 Prescription Verification System** - AI-assisted prescription review and validation
- **🚚 Delivery Tracking** - Real-time order and delivery status updates
- **📱 Enhanced Viber Bot Integration** - Rich interactive messaging with keyboards and quick actions
- **⚡ Socket.IO Real-time Updates** - Instant notifications and live dashboard updates
- **📈 Comprehensive Logging** - Detailed application logs and error tracking

### 🎯 **Core Features**

#### **Customer Management**
- ✅ Customer registration and profile management
- ✅ Order history and purchase tracking
- ✅ Prescription upload and verification
- ✅ Multiple delivery addresses support
- ✅ Loyalty program integration ready

#### **Product & Inventory**
- ✅ Advanced product catalog with categories
- ✅ Real-time stock management
- ✅ Low stock alerts and notifications
- ✅ Batch and expiry date tracking
- ✅ Barcode and SKU support

#### **Order Processing**
- ✅ Multi-step order workflow
- ✅ Prescription validation
- ✅ Payment integration ready
- ✅ Delivery scheduling
- ✅ Real-time status updates

#### **Communication**
- ✅ Viber Bot integration
- ✅ Bilingual messaging (Myanmar/English)
- ✅ Admin chat system
- ✅ Automated notifications
- ✅ Message history tracking

## 📋 **Prerequisites**

Before you begin, ensure you have:

- **Node.js**: Version 18.0 or higher
- **npm**: Version 9.0 or higher
- **Supabase Account**: For database hosting
- **Viber Business Account**: For bot integration
- **Git**: For version control

## 🔧 **Quick Start Installation**

### 1. **Clone & Setup**
```bash
# Clone the repository
git clone https://github.com/shweoo/pharmacy-backend.git
cd pharmacy-backend

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. **Environment Configuration**
Edit your `.env` file with your credentials:

```bash
# Required - Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Required - Viber Bot
VIBER_BOT_TOKEN=your-viber-bot-token-here
VIBER_WEBHOOK_URL=https://your-domain.com/webhook

# Optional - Additional Features
JWT_SECRET=your-super-secret-jwt-key
ADMIN_TOKEN=your-admin-token
```

### 3. **Database Setup**
```bash
# Run the enhanced database schema
# Go to your Supabase dashboard > SQL Editor
# Execute the contents of database/enhanced_schema.sql

# Or use the migration script (if available)
npm run db:migrate
```

### 4. **Start Development Server**
```bash
# Start in development mode
npm run dev

# Or start in production mode
npm start
```

Your API will be running at `http://localhost:3000` 🎉

## 🌐 **API Endpoints Overview**

### **Core Endpoints**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Welcome & API info | ❌ |
| `GET` | `/health` | System health check | ❌ |
| `GET` | `/metrics` | Performance metrics | ❌ |
| `POST` | `/webhook` | Viber webhook handler | ❌ |

### **Product Management**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/products` | List all products | ❌ |
| `GET` | `/api/products/:id` | Get single product | ❌ |
| `POST` | `/api/products` | Create new product | ✅ Admin |
| `PUT` | `/api/products/:id` | Update product | ✅ Admin |
| `DELETE` | `/api/products/:id` | Delete product | ✅ Admin |
| `GET` | `/api/products/meta/categories` | Get categories | ❌ |

### **Order Management**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/orders` | List orders (filtered) | ✅ Admin |
| `GET` | `/api/orders/:id` | Get single order | ✅ |
| `POST` | `/api/orders` | Create new order | ❌ |
| `PATCH` | `/api/orders/:id/status` | Update order status | ✅ Admin |
| `PATCH` | `/api/orders/:id/items` | Update order items | ✅ Admin |
| `DELETE` | `/api/orders/:id` | Cancel order | ✅ Admin |
| `GET` | `/api/orders/stats/dashboard` | Order statistics | ✅ Admin |

### **Customer Management**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/customers` | List customers | ✅ Admin |
| `GET` | `/api/customers/viber/:viber_id` | Get by Viber ID | ✅ |
| `POST` | `/api/customers` | Create/update customer | ❌ |
| `PUT` | `/api/customers/:id` | Update customer | ✅ |
| `DELETE` | `/api/customers/:id` | Delete customer | ✅ Admin |

### **Prescription Management**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/prescriptions` | List prescriptions | ✅ Admin |
| `GET` | `/api/prescriptions/:id` | Get single prescription | ✅ |
| `POST` | `/api/prescriptions` | Upload prescription | ❌ |
| `PATCH` | `/api/prescriptions/:id/status` | Update status | ✅ Admin |
| `DELETE` | `/api/prescriptions/:id` | Delete prescription | ✅ Admin |

### **Messaging**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/messages/:customerId` | Get customer messages | ✅ |
| `POST` | `/api/messages` | Send message | ✅ |

## 🔌 **Socket.IO Real-time Events**

### **Admin Events**
```javascript
// Join admin room
socket.emit('join_admin');

// Send message to customer
socket.emit('admin_send_message', {
  customerViberId: 'viber-id',
  customerId: 'customer-uuid',
  messageText: 'Hello customer!'
});

// Quick actions
socket.emit('admin_quick_action', {
  action: 'order_confirmed',
  customerId: 'customer-uuid',
  customerViberId: 'viber-id',
  data: { orderId: 'order-uuid', totalAmount: 25000 }
});
```

### **Real-time Notifications**
```javascript
// Listen for new orders
socket.on('new_order', (orderData) => {
  console.log('New order received:', orderData);
});

// Listen for customer messages
socket.on('new_customer_message', (messageData) => {
  console.log('New customer message:', messageData);
});

// Listen for system metrics
socket.on('system_metrics', (metrics) => {
  console.log('System performance:', metrics);
});
```

## 📊 **Enhanced Database Schema**

The v2.0 schema includes comprehensive tables for:

### **Core Tables**
- `customers` - Enhanced customer profiles with statistics
- `products` - Complete product catalog with inventory
- `orders` - Advanced order management with tracking
- `prescriptions` - Prescription verification system
- `messages` - Complete communication history

### **Advanced Tables**
- `inventory_logs` - Stock movement tracking
- `categories` - Product categorization
- `customer_addresses` - Multiple delivery addresses
- `deliveries` - Delivery tracking and management
- `promotions` - Discount and promotional campaigns
- `system_settings` - Configurable system parameters

### **Helpful Views**
- `customer_summary` - Customer analytics
- `order_summary` - Order dashboard view
- `product_inventory_status` - Stock status overview
- `daily_sales_summary` - Sales analytics

## 🚢 **Deployment Options**

### **Render.com (Recommended)**
```yaml
# render.yaml is included
# Simply connect your GitHub repo to Render
# Set environment variables in dashboard
# Auto-deployment on push
```

### **Docker Deployment**
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

### **Manual Server Deployment**
```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run pm2:start

# Monitor
pm2 monit
```

## 🛡️ **Security Features**

- ✅ **Rate Limiting** - Prevent API abuse
- ✅ **Input Validation** - Sanitize all inputs
- ✅ **CORS Protection** - Configurable origins
- ✅ **Helmet.js** - Security headers
- ✅ **JWT Authentication** - Secure admin access
- ✅ **Row Level Security** - Database-level permissions
- ✅ **Webhook Verification** - Secure Viber integration

## 📈 **Monitoring & Analytics**

### **Built-in Metrics**
- Request/response times
- Error rates and types
- Memory and CPU usage
- Database connection health
- Viber API status
- Real-time user activity

### **Health Check Endpoints**
```bash
# Basic health check
GET /health

# Detailed metrics
GET /metrics

# System status
GET /api/system/status
```

### **Logging**
- Structured JSON logs
- Daily log rotation
- Error tracking
- Performance monitoring
- User activity logs

## 🔧 **Configuration Guide**

### **Business Settings**
Configure your pharmacy settings in the database:

```sql
-- Update system settings
UPDATE system_settings 
SET value = 'ရွှေအိုး Pharmacy' 
WHERE key = 'pharmacy_name';

-- Set delivery fee
UPDATE system_settings 
SET value = '2000' 
WHERE key = 'delivery_fee';
```

### **Feature Flags**
Enable/disable features via environment variables:

```bash
ENABLE_PRESCRIPTION_VERIFICATION=true
ENABLE_AUTOMATIC_INVENTORY_TRACKING=true
ENABLE_CUSTOMER_LOYALTY_PROGRAM=false
```

## 🧪 **Testing**

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

## 📝 **Scripts**

```bash
# Development
npm run dev              # Start with nodemon
npm run lint             # Check code style
npm run lint:fix         # Fix linting issues

# Production
npm start                # Start production server
npm run pm2:start        # Start with PM2
npm run pm2:restart      # Restart PM2

# Database
npm run db:migrate       # Run migrations
npm run db:seed          # Seed test data
npm run db:backup        # Backup database

# Utilities
npm run setup:webhook    # Configure Viber webhook
npm run health          # Quick health check
npm run logs            # View application logs
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Database Connection Failed**
```bash
# Check Supabase credentials
# Verify SUPABASE_URL and SUPABASE_ANON_KEY
# Test connection manually
```

#### **Viber Webhook Not Working**
```bash
# Verify VIBER_BOT_TOKEN
# Check webhook URL is accessible
# Review Viber webhook logs
```

#### **Socket.IO Connection Issues**
```bash
# Check CORS settings
# Verify frontend URL configuration
# Test with Socket.IO client
```

### **Debug Mode**
```bash
# Enable debug logging
DEBUG_MODE=true npm run dev

# Check health endpoint
curl http://localhost:3000/health

# Monitor real-time logs
npm run logs
```

## 🤝 **Contributing**

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch: `git checkout -b feature/amazing-feature`
3. **Commit** your changes: `git commit -m 'Add amazing feature'`
4. **Push** to the branch: `git push origin feature/amazing-feature`
5. **Open** a Pull Request

### **Development Guidelines**
- Follow ESLint configuration
- Write tests for new features
- Update documentation
- Use conventional commit messages

## 📞 **Support & Contact**

- **📧 Email**: dev@shweoo-pharmacy.com
- **🐛 Issues**: [GitHub Issues](https://github.com/shweoo/pharmacy-backend/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/shweoo/pharmacy-backend/discussions)
- **📖 Wiki**: [Project Wiki](https://github.com/shweoo/pharmacy-backend/wiki)

## 📄 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Viber** for providing the messaging platform
- **Supabase** for the excellent database and backend services
- **Myanmar Developer Community** for inspiration and support
- **All contributors** who help make this project better

---

<div align="center">

**Built with ❤️ in Myanmar for ရွှေအိုး Pharmacy**

*Empowering healthcare accessibility through technology*

</div>