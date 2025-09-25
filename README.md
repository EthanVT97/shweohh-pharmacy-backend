# ရွှေအိုး Pharmacy - Backend API

Viber Bot နှင့် Admin Dashboard အတွက် Backend API System

## 🚀 Features

- ✅ Viber Bot Integration
- ✅ Product Catalog Management
- ✅ Order Processing System
- ✅ Prescription Upload & Verification
- ✅ Real-time Notifications
- ✅ Supabase Database
- ✅ Admin Dashboard API

## 📋 Prerequisites

- Node.js 18.0 or higher
- Supabase account
- Viber Business Account

## 🔧 Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/pharmacy-backend.git
cd pharmacy-backend
1. Install dependencies

```bash
npm install
```

1. Environment setup

```bash
cp .env.example .env
# Edit .env with your credentials
```

1. Start development server

```bash
npm run dev
```

🗄️ Database Setup

1. Create a new Supabase project
2. Run the SQL schema from database/schema.sql
3. Configure environment variables

🌐 API Endpoints

Method Endpoint Description
GET / Welcome message
GET /health Health check
GET /api/products Get all products
POST /api/orders Create new order
GET /api/customers Get customers
POST /api/prescriptions Upload prescription

🚢 Deployment

Render Deployment

1. Connect GitHub repository to Render
2. Set environment variables
3. Deploy automatically

Environment Variables on Render

· SUPABASE_URL
· SUPABASE_ANON_KEY
· VIBER_BOT_TOKEN
· NODE_ENV=production

📞 Support

For technical support, contact the development team.

📄 License

MIT License
