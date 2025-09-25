import express from 'express';

const customerRoutes = (supabase) => {
  const router = express.Router();

  // Get all customers
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, search } = req.query;
      
      let query = supabase
        .from('customers')
        .select(`
          *,
          orders (id, total_amount, status, created_at)
        `)
        .order('last_active', { ascending: false });

      if (search) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query.range(
        (page - 1) * limit, 
        page * limit - 1
      );

      if (error) throw error;

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get customer by Viber ID
  router.get('/viber/:viber_id', async (req, res) => {
    try {
      const { viber_id } = req.params;
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          orders (id, total_amount, status, created_at)
        `)
        .eq('viber_id', viber_id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found'
        });
      }

      res.json({
        success: true,
        data
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Create or update customer
  router.post('/', async (req, res) => {
    try {
      const { viber_id, name, phone, address } = req.body;
      
      if (!viber_id) {
        return res.status(400).json({
          success: false,
          error: 'Viber ID is required'
        });
      }

      const { data, error } = await supabase
        .from('customers')
        .upsert({
          viber_id,
          name,
          phone,
          address,
          last_active: new Date(),
          first_seen: new Date()
        })
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: "Customer saved successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update customer
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, address } = req.body;
      
      const { data, error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          address,
          last_active: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      res.json({
        success: true,
        data,
        message: "Customer updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get customer statistics
  router.get('/stats/summary', async (req, res) => {
    try {
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, created_at');

      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('customer_id, total_amount, created_at');

      if (customersError || ordersError) {
        throw customersError || ordersError;
      }

      // Calculate statistics
      const totalCustomers = customers.length;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const newCustomersToday = customers.filter(c => 
        new Date(c.created_at) >= today
      ).length;

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, order) => sum + (order.total_amount || 0), 0);

      res.json({
        success: true,
        data: {
          total_customers: totalCustomers,
          new_customers_today: newCustomersToday,
          total_orders: totalOrders,
          total_revenue: totalRevenue
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

export default customerRoutes;
