-- Enable UUID extension if not already enabled (required for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viber_id TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT,
  price NUMERIC(10, 2) NOT NULL,
  stock INTEGER DEFAULT 0,
  image_url TEXT,
  description TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
-- `items` column uses JSONB to store an array of product objects or product_id/quantity details
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL, -- SET NULL if customer is deleted
  items JSONB NOT NULL, -- e.g., [{"product_id": "uuid", "name": "Paracetamol", "quantity": 2, "price": 1000}]
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  prescription_image TEXT, -- URL to prescription if applicable
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prescriptions Table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE, -- DELETE CASCADE if customer is deleted
  image_url TEXT NOT NULL, -- URL to the uploaded prescription image (e.g., from Supabase Storage)
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Row Level Security (RLS) Policies (Recommended for Supabase for fine-grained access control)
-- These policies need to be adapted to your specific authentication and authorization setup (e.g., admin roles, user IDs).
-- You can set these up in the Supabase UI or through additional SQL migration files.

-- Example Policies (adjust `auth.role()` and `auth.uid()` based on your Supabase Auth setup)

-- Policy for customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select_all" ON customers;
CREATE POLICY "customers_select_all" ON customers FOR SELECT USING (TRUE); -- Allow all users to read customer data (adjust if only admins should)
DROP POLICY IF EXISTS "customers_insert_auth" ON customers;
CREATE POLICY "customers_insert_auth" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "customers_update_auth_or_self" ON customers;
CREATE POLICY "customers_update_auth_or_self" ON customers FOR UPDATE USING (auth.role() = 'authenticated' OR auth.uid() = id); -- Assuming auth.uid() maps to customer id

-- Policy for products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_all" ON products;
CREATE POLICY "products_select_all" ON products FOR SELECT USING (TRUE); -- Publicly readable product catalog
DROP POLICY IF EXISTS "products_manage_admin" ON products;
CREATE POLICY "products_manage_admin" ON products FOR ALL USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin'); -- Only 'admin' role can create/update/delete

-- Policy for orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_self_or_admin" ON orders;
CREATE POLICY "orders_select_self_or_admin" ON orders FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin'); -- Users can see their own orders, admins see all
DROP POLICY IF EXISTS "orders_insert_auth" ON orders;
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id); -- Authenticated users can create orders for themselves
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin'); -- Only admins can update order status

-- Policy for prescriptions table
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_select_self_or_admin" ON prescriptions;
CREATE POLICY "prescriptions_select_self_or_admin" ON prescriptions FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin'); -- Users can see their own prescriptions, admins see all
DROP POLICY IF EXISTS "prescriptions_insert_auth" ON prescriptions;
CREATE POLICY "prescriptions_insert_auth" ON prescriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id); -- Authenticated users can upload prescriptions for themselves
DROP POLICY IF EXISTS "prescriptions_update_admin" ON prescriptions;
CREATE POLICY "prescriptions_update_admin" ON prescriptions FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin'); -- Only admins can update prescription status

-- Functions and Triggers for `updated_at` column (Optional but good practice for automatic timestamp updates)
-- Create a function to update the 'updated_at' column on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to each table to automatically update 'updated_at' on every update
CREATE OR REPLACE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_orders_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_prescriptions_updated_at
BEFORE UPDATE ON prescriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
