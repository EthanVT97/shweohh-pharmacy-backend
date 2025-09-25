import express from 'express';

const orderRoutes = (supabase, io) => {
  const router = express.Router();

  // Get all orders
  router.get('/', async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone, address)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
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

  // Get single order
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (name, phone, address)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
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

  // Create new order
  router.post('/', async (req, res) => {
    try {
      const { customer_id, items, total_amount, delivery_address, prescription_image } = req.body;
      
      if (!items || !total_amount || !delivery_address) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: items, total_amount, delivery_address'
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .insert({
          customer_id,
          items,
          total_amount,
          delivery_address,
          prescription_image,
          status: 'pending',
          created_at: new Date()
        })
        .select(`
          *,
          customers (name, phone, address)
        `);

      if (error) throw error;

      // Real-time update via Socket.io
      io.emit('new_order', data[0]);

      res.status(201).json({
        success: true,
        data: data[0],
        message: "အမှာစာ အောင်မြင်စွာ တင်ပြီးပါပြီ!"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update order status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const { data, error } = await supabase
        .from('orders')
        .update({
          status,
          notes,
          updated_at: new Date()
        })
        .eq('id', id)
        .select(`
          *,
          customers (name, phone, address)
        `);

      if (error) throw error;

      // Real-time update
      io.emit('order_updated', data[0]);

      res.json({
        success: true,
        data: data[0],
        message: `Order status updated to ${status}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Delete order
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Order deleted successfully'
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

export default orderRoutes;
