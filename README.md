# Shwe Oo Pharmacy - Backend API

A robust backend API system designed to power the Shwe Oo Pharmacy Viber Bot and Admin Dashboard, facilitating seamless management of product catalogs, order processing, and prescription verification. This API serves as the central hub for all pharmacy operations, ensuring efficient communication and data management.

## 🚀 Key Features

*   **Viber Bot Integration**: Seamlessly connect with the Viber platform to handle customer interactions, orders, and inquiries.
*   **Product Catalog Management**: Comprehensive API for managing pharmacy products, including adding, updating, and retrieving product information.
*   **Order Processing System**: Streamlined workflow for creating, tracking, and managing customer orders from placement to fulfillment.
*   **Prescription Upload & Verification**: Secure mechanism for customers to upload prescriptions, with an integrated system for verification.
*   **Real-time Notifications**: Instant updates for orders, prescriptions, and other critical events.
*   **Supabase Database Integration**: Leverages Supabase for a scalable and secure backend database solution.
*   **Admin Dashboard API**: Dedicated endpoints to support the administrative dashboard for comprehensive business management.

## 📋 Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Node.js**: Version 18.0 or higher.
*   **Supabase Account**: An active account for database hosting.
*   **Viber Business Account**: Required for Viber Bot integration.

## 🔧 Installation

Follow these steps to get the project up and running on your local machine:

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/yourusername/pharmacy-backend.git
    cd pharmacy-backend
    ```
2.  **Install Dependencies**:
    ```bash
    npm install
    ```
3.  **Environment Setup**:
    Create a `.env` file by copying the example and populate it with your credentials:
    ```bash
    cp .env.example .env
    # Open .env and add your Supabase URL, Supabase Anon Key, and Viber Bot Token.
    ```
4.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    The API will now be running locally, typically on `http://localhost:3000`.

## 🗄️ Database Setup (Supabase)

This project uses Supabase for its backend database.

1.  **Create a New Supabase Project**:
    Navigate to the Supabase dashboard and create a new project.
2.  **Run SQL Schema**:
    Once your project is created, go to the "SQL Editor" and execute the schema provided in `database/schema.sql` to set up your tables and relations.
3.  **Configure Environment Variables**:
    Ensure your `.env` file contains the `SUPABASE_URL` and `SUPABASE_ANON_KEY` obtained from your Supabase project settings.

## 🌐 API Endpoints

The following are the primary API endpoints available. For detailed request/response examples, please refer to the API documentation (if available).

| Method | Endpoint             | Description                       |
| :----- | :------------------- | :-------------------------------- |
| `GET`  | `/`                  | Welcome message for the API       |
| `GET`  | `/health`            | Health check for the API status   |
| `GET`  | `/api/products`      | Retrieve a list of all products   |
| `POST` | `/api/orders`        | Create a new customer order       |
| `GET`  | `/api/customers`     | Get a list of registered customers |
| `POST` | `/api/prescriptions` | Upload a new prescription image   |

## 🚢 Deployment

This section outlines the process for deploying the backend API, with a focus on Render.

### Render Deployment

1.  **Connect GitHub Repository**:
    Link your GitHub repository to your Render account.
2.  **Set Environment Variables**:
    Configure the following environment variables within your Render service settings:
    *   `SUPABASE_URL`
    *   `SUPABASE_ANON_KEY`
    *   `VIBER_BOT_TOKEN`
    *   `NODE_ENV=production`
3.  **Automatic Deployment**:
    Configure Render to automatically deploy new changes from your connected GitHub branch.

## 📞 Support

For any technical assistance or inquiries, please contact the development team.

## 📄 License

This project is licensed under the MIT License. See the `LICENSE` file for details.
