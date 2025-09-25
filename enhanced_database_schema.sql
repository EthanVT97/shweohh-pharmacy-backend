-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enhanced customers table with additional fields
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viber_id TEXT UNIQUE NOT NULL,
  name TEXT,
  phone TEXT,
  address TEXT,
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_orders INTEGER DEFAULT 0,
  total_spent NUMERIC(10, 2) DEFAULT 0,
  preferred_language TEXT DEFAULT 'myanmar' CHECK (preferred_language IN ('myanmar', 'english', 'both')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced products table with additional fields
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_myanmar TEXT,
  category TEXT,
  subcategory TEXT,
  price NUMERIC(10, 2) NOT NULL,
  discount_price NUMERIC(10, 2),
  stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  image_url TEXT,
  additional_images TEXT[], -- Array of image URLs
  description TEXT,
  description_myanmar TEXT,
  ingredients TEXT,
  usage_instructions TEXT,
  usage_instructions_myanmar TEXT,
  side_effects TEXT,
  contraindications TEXT,
  requires_prescription BOOLEAN DEFAULT FALSE,
  manufacturer TEXT,
  batch_number TEXT,
  expiry_date DATE,
  barcode TEXT,
  sku TEXT UNIQUE,
  weight NUMERIC(8, 3), -- in grams
  dimensions TEXT, -- e.g., "10x5x2 cm"
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'out_of_stock', 'discontinued')),
  featured BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT UNIQUE NOT NULL DEFAULT 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 4, '0'),
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  items JSONB NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  discount_amount NUMERIC(10, 2) DEFAULT 0,
  delivery_fee NUMERIC(10, 2) DEFAULT 0,
  final_amount NUMERIC(10, 2) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_phone TEXT,
  delivery_instructions TEXT,
  prescription_image TEXT,
  prescription_verified BOOLEAN DEFAULT FALSE,
  prescription_verified_by TEXT,
  prescription_verified_at TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  payment_method TEXT DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'bank_transfer', 'mobile_payment')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled', 'returned')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  source TEXT DEFAULT 'viber' CHECK (source IN ('viber', 'website', 'phone', 'walk_in')),
  notes TEXT,
  internal_notes TEXT,
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS order_sequence START 1;

-- Enhanced prescriptions table
CREATE TABLE IF NOT EXISTS prescriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  additional_images TEXT[],
  patient_name TEXT,
  patient_age INTEGER,
  doctor_name TEXT,
  hospital_name TEXT,
  prescription_date DATE,
  notes TEXT,
  customer_notes TEXT,
  pharmacist_notes TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected', 'fulfilled', 'expired')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  expiry_date DATE,
  medicines_identified JSONB, -- Array of identified medicines with details
  estimated_cost NUMERIC(10, 2),
  availability_status TEXT DEFAULT 'checking' CHECK (availability_status IN ('checking', 'available', 'partially_available', 'unavailable')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enhanced messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  conversation_id TEXT, -- For grouping related messages
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin', 'system', 'bot')),
  message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'location', 'contact', 'sticker', 'system')),
  message_text TEXT NOT NULL,
  media_url TEXT,
  media_type TEXT,
  viber_message_id TEXT,
  reply_to_message_id UUID REFERENCES messages(id),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB, -- Store additional message metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- New inventory table for stock management
CREATE TABLE IF NOT EXISTS inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('restock', 'sale', 'adjustment', 'expired', 'damaged', 'returned')),
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  unit_cost NUMERIC(10, 2),
  total_cost NUMERIC(10, 2),
  supplier TEXT,
  batch_number TEXT,
  expiry_date DATE,
  notes TEXT,
  performed_by TEXT,
  order_id UUID REFERENCES orders(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table for better organization
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  name_myanmar TEXT,
  description TEXT,
  description_myanmar TEXT,
  parent_id UUID REFERENCES categories(id),
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer addresses table for multiple delivery addresses
CREATE TABLE IF NOT EXISTS customer_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., 'Home', 'Office', 'Mom's house'
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  township TEXT,
  city TEXT DEFAULT 'Yangon',
  postal_code TEXT,
  landmark TEXT,
  phone TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  delivery_instructions TEXT,
  coordinates POINT, -- GPS coordinates if available
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Delivery tracking table
CREATE TABLE IF NOT EXISTS deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_info TEXT,
  pickup_time TIMESTAMP WITH TIME ZONE,
  estimated_delivery TIMESTAMP WITH TIME ZONE,
  actual_delivery TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'returned')),
  tracking_updates JSONB,
  delivery_proof_image TEXT,
  recipient_name TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Promotions and discounts table
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed_amount', 'free_shipping', 'buy_x_get_y')),
  value NUMERIC(10, 2) NOT NULL,
  minimum_order_amount NUMERIC(10, 2),
  maximum_discount_amount NUMERIC(10, 2),
  applicable_products UUID[],
  applicable_categories UUID[],
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_customer_limit INTEGER DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customer promotion usage tracking
CREATE TABLE IF NOT EXISTS promotion_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  promotion_id UUID REFERENCES promotions(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  discount_amount NUMERIC(10, 2) NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  data_type TEXT DEFAULT 'string' CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, data_type) VALUES
('pharmacy_name', 'ရွှေအိုး Pharmacy', 'Pharmacy name in Myanmar', 'string'),
('pharmacy_name_en', 'Shwe Oo Pharmacy', 'Pharmacy name in English', 'string'),
('phone_number', '09-XXX-XXX-XXX', 'Main contact phone number', 'string'),
('address', 'Yangon, Myanmar', 'Main pharmacy address', 'string'),
('opening_hours', '9AM - 9PM Daily', 'Operating hours', 'string'),
('delivery_fee', '1000', 'Standard delivery fee in MMK', 'number'),
('free_delivery_threshold', '50000', 'Minimum order for free delivery', 'number'),
('max_delivery_distance', '15', 'Maximum delivery distance in km', 'number'),
('order_processing_time', '30', 'Average order processing time in minutes', 'number'),
('prescription_review_time', '60', 'Average prescription review time in minutes', 'number')
ON CONFLICT (key) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customers_viber_id ON customers(viber_id);
CREATE INDEX IF NOT EXISTS idx_customers_last_active ON customers(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(featured) WHERE featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING gin(name gin_trgm_ops);
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Enable trigram indexing for better search

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_source ON orders(source);

CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);
CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_order ON prescriptions(order_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_reviewed_at ON prescriptions(reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_customer_date ON messages(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_unread ON messages(is_read, created_at) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON inventory_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_type ON inventory_logs(type);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_order ON inventory_logs(order_id);

CREATE INDEX IF NOT EXISTS idx_deliveries_order ON deliveries(order_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON deliveries(driver_name);

-- Row Level Security (RLS) Policies
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
CREATE POLICY "orders_insert_auth" ON orders FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "orders_update_admin" ON orders;
CREATE POLICY "orders_update_admin" ON orders FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin');

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_select_self_or_admin" ON prescriptions;
CREATE POLICY "prescriptions_select_self_or_admin" ON prescriptions FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "prescriptions_insert_auth" ON prescriptions;
CREATE POLICY "prescriptions_insert_auth" ON prescriptions FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "prescriptions_update_admin" ON prescriptions;
CREATE POLICY "prescriptions_update_admin" ON prescriptions FOR UPDATE USING (auth.jwt() ->> 'user_role' = 'admin');

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "messages_select_self_or_admin" ON messages;
CREATE POLICY "messages_select_self_or_admin" ON messages FOR SELECT USING (auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');
DROP POLICY IF EXISTS "messages_insert_auth" ON messages;
CREATE POLICY "messages_insert_auth" ON messages FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = customer_id OR auth.jwt() ->> 'user_role' = 'admin');

-- Trigger functions
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_stats()
RETURNS TRIGGER AS $
BEGIN
    -- Update customer statistics when orders change
    IF TG_OP = 'INSERT' THEN
        UPDATE customers 
        SET 
            total_orders = total_orders + 1,
            total_spent = total_spent + NEW.final_amount,
            last_active = NOW()
        WHERE id = NEW.customer_id;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- If order status changed to delivered
        IF OLD.status != 'delivered' AND NEW.status = 'delivered' THEN
            UPDATE customers 
            SET last_active = NOW()
            WHERE id = NEW.customer_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE customers 
        SET 
            total_orders = GREATEST(0, total_orders - 1),
            total_spent = GREATEST(0, total_spent - OLD.final_amount)
        WHERE id = OLD.customer_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_product_stock()
RETURNS TRIGGER AS $
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update product stock based on inventory log
        UPDATE products 
        SET 
            stock = NEW.new_stock,
            updated_at = NOW()
        WHERE id = NEW.product_id;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_customer_last_active()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.sender_type = 'customer' THEN
        UPDATE customers 
        SET last_active = NEW.created_at 
        WHERE id = NEW.customer_id;
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := 'ORD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('order_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Create triggers
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

CREATE OR REPLACE TRIGGER update_categories_updated_at
    BEFORE UPDATE ON categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_customer_addresses_updated_at
    BEFORE UPDATE ON customer_addresses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trigger_update_customer_stats
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_stats();

CREATE OR REPLACE TRIGGER trigger_update_product_stock
    AFTER INSERT ON inventory_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_product_stock();

CREATE OR REPLACE TRIGGER trigger_update_customer_last_active
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_last_active();

CREATE OR REPLACE TRIGGER trigger_generate_order_number
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION generate_order_number();

-- Helpful views for admin dashboard
CREATE OR REPLACE VIEW customer_summary AS
SELECT 
    c.*,
    COUNT(DISTINCT o.id) as order_count,
    COALESCE(SUM(o.final_amount), 0) as total_revenue,
    COUNT(DISTINCT p.id) as prescription_count,
    (SELECT COUNT(*) FROM messages WHERE customer_id = c.id AND sender_type = 'customer') as message_count,
    (SELECT created_at FROM messages WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_date,
    (SELECT status FROM orders WHERE customer_id = c.id ORDER BY created_at DESC LIMIT 1) as last_order_status
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
LEFT JOIN prescriptions p ON c.id = p.customer_id
GROUP BY c.id;

CREATE OR REPLACE VIEW order_summary AS
SELECT 
    o.*,
    c.name as customer_name,
    c.phone as customer_phone,
    c.viber_id as customer_viber_id,
    COUNT(p.id) as prescription_count,
    d.status as delivery_status,
    d.driver_name,
    d.estimated_delivery as delivery_estimate
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
LEFT JOIN prescriptions p ON o.id = p.order_id
LEFT JOIN deliveries d ON o.id = d.order_id
GROUP BY o.id, c.id, d.id;

CREATE OR REPLACE VIEW product_inventory_status AS
SELECT 
    p.*,
    c.name as category_name,
    CASE 
        WHEN p.stock <= 0 THEN 'out_of_stock'
        WHEN p.stock <= p.min_stock_level THEN 'low_stock'
        ELSE 'in_stock'
    END as inventory_status,
    (SELECT SUM(quantity_change) FROM inventory_logs WHERE product_id = p.id AND type = 'sale' AND created_at >= NOW() - INTERVAL '30 days') as sales_last_30_days,
    (SELECT created_at FROM inventory_logs WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as last_inventory_update
FROM products p
LEFT JOIN categories c ON p.category = c.name;

CREATE OR REPLACE VIEW recent_customer_activity AS
SELECT 
    c.id,
    c.name,
    c.viber_id,
    c.last_active,
    m.message_text as last_message,
    m.created_at as last_message_time,
    m.sender_type as last_sender,
    o.status as last_order_status,
    o.created_at as last_order_date
FROM customers c
LEFT JOIN LATERAL (
    SELECT message_text, created_at, sender_type
    FROM messages 
    WHERE customer_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
) m ON true
LEFT JOIN LATERAL (
    SELECT status, created_at
    FROM orders 
    WHERE customer_id = c.id 
    ORDER BY created_at DESC 
    LIMIT 1
) o ON true
ORDER BY c.last_active DESC;

CREATE OR REPLACE VIEW daily_sales_summary AS
SELECT 
    DATE(created_at) as sale_date,
    COUNT(*) as total_orders,
    SUM(final_amount) as total_revenue,
    AVG(final_amount) as avg_order_value,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
    COUNT(CASE WHEN prescription_image IS NOT NULL THEN 1 END) as prescription_orders
FROM orders 
GROUP BY DATE(created_at)
ORDER BY sale_date DESC;

-- Functions for common operations
CREATE OR REPLACE FUNCTION get_low_stock_products(threshold INTEGER DEFAULT NULL)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    current_stock INTEGER,
    min_stock_level INTEGER,
    category TEXT
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.name,
        p.stock,
        p.min_stock_level,
        p.category
    FROM products p
    WHERE p.stock <= COALESCE(threshold, p.min_stock_level)
    AND p.status = 'active'
    ORDER BY p.stock ASC;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_customer_order_history(customer_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
    order_id UUID,
    order_number TEXT,
    total_amount NUMERIC,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    items_count INTEGER
) AS $
BEGIN
    RETURN QUERY
    SELECT 
        o.id,
        o.order_number,
        o.final_amount,
        o.status,
        o.created_at,
        jsonb_array_length(o.items)
    FROM orders o
    WHERE o.customer_id = customer_uuid
    ORDER BY o.created_at DESC
    LIMIT limit_count;
END;
$ LANGUAGE plpgsql;

-- Initial data seeding (optional)
-- Insert some sample categories
INSERT INTO categories (name, name_myanmar, description) VALUES
('Pain Relief', 'နာကျင်မှု သက်သာရေး', 'Pain relief medications'),
('Antibiotics', 'ပိုးသတ်ဆေး', 'Antibiotic medications'),
('Vitamins', 'ဗီတာမင်', 'Vitamin supplements'),
('Cold & Flu', 'အအေးမိ နှင့် ဖျားနာ', 'Cold and flu medications'),
('Digestive Health', 'အစာခြေစနစ်', 'Digestive system medications'),
('Heart Health', 'နှလုံးကျန်းမာရေး', 'Cardiovascular medications'),
('Diabetes', 'ဆီးချိုရောဂါ', 'Diabetes medications'),
('Baby Care', 'ကလေးပစ္စည်း', 'Baby care products'),
('Personal Care', 'တစ်ကိုယ်ရေ စောင့်ရှောက်မှု', 'Personal care items')
ON CONFLICT DO NOTHING;

-- Create notification function for real-time updates
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        PERFORM pg_notify(
            'order_status_changed',
            json_build_object(
                'order_id', NEW.id,
                'customer_id', NEW.customer_id,
                'old_status', OLD.status,
                'new_status', NEW.status,
                'order_number', NEW.order_number
            )::text
        );
    END IF;
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER notify_order_status_change_trigger
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_status_change();

-- Enable real-time subscriptions for important tables
ALTER PUBLICATION supabase_realtime ADD TABLE customers;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE prescriptions;

COMMENT ON DATABASE postgres IS 'Enhanced ရွှေအိုး Pharmacy Database - Production Ready';
COMMENT ON TABLE customers IS 'Customer information and statistics';
COMMENT ON TABLE products IS 'Product catalog with full details';
COMMENT ON TABLE orders IS 'Order management with comprehensive tracking';
COMMENT ON TABLE prescriptions IS 'Prescription management and verification';
COMMENT ON TABLE messages IS 'Customer communication history';
COMMENT ON TABLE inventory_logs IS 'Stock movement tracking';
COMMENT ON TABLE deliveries IS 'Delivery tracking and management';