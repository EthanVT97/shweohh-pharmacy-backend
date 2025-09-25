CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  prescription_image TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'rejected', 'fulfilled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  message_text TEXT NOT NULL,
  viber_message_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "customers_select_all" ON customers;
CREATE POLICY "customers_select_all" ON customers FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "customers_insert_auth" ON customers;
CREATE POLICY "customers_insert_auth" ON customers FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');
DROP POLICY IF EXISTS "customers_update_auth_or_self" ON customers;
CREATE POLICY "customers_update_auth_or_self" ON customers FOR UPDATE USING (auth.role() = 'authenticated' OR auth.uid() = id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "products_select_all" ON products;
CREATE POLICY "products_select_all" ON products FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "products_manage_admin" ON products;
CREATE POLICY "products_manage_admin" ON products FOR ALL USING (auth.jwt() ->> 'user_role' = 'admin') WITH CHECK (auth.jwt() ->> 'user_role' = 'admin');

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_select_self_or_admin" ON orders;
CREATE POLICY "orders_select_self_or_admin" ON orders FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "orders_insert_auth" ON orders;
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id);
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin');

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_select_self_or_admin" ON prescriptions;
CREATE POLICY "prescriptions_select_self_or_admin" ON prescriptions FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "prescriptions_insert_auth" ON prescriptions;
CREATE POLICY "prescriptions_insert_auth" ON prescriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id);
DROP POLICY IF EXISTS "prescriptions_update_admin" ON prescriptions;
CREATE POLICY "prescriptions_update_admin" ON prescriptions FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin');

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_self_or_admin" ON messages;
CREATE POLICY "messages_select_self_or_admin" ON messages FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "messages_insert_auth" ON messages;
CREATE POLICY "messages_insert_auth" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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
