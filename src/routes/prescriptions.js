import express from 'express';

const prescriptionRoutes = (supabase) => {
  const router = express.Router();

  // Get all prescriptions
  router.get('/', async (req, res) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      let query = supabase
        .from('prescriptions')
        .select(`
          *,
          orders (id, customer_id, total_amount, status),
          customers (name, phone)
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

  // Upload prescription (associate with order)
  router.post('/upload', async (req, res) => {
    try {
      const { order_id, image_url, notes } = req.body;
      
      if (!order_id || !image_url) {
        return res.status(400).json({
          success: false,
          error: 'Order ID and image URL are required'
        });
      }

      // Verify order exists
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('id, customer_id')
        .eq('id', order_id)
        .single();

      if (orderError || !order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .insert({
          order_id,
          image_url,
          notes,
          status: 'pending_review',
          created_at: new Date()
        })
        .select(`
          *,
          orders (id, customer_id, total_amount, status)
        `);

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: data[0],
        message: "ဆေးညွှန်း အောင်မြင်စွာ တင်ပြီးပါပြီ!"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update prescription status
  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, verified_by, verification_notes } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const validStatuses = ['pending_review', 'approved', 'rejected', 'needs_clarification'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status'
        });
      }

      const { data, error } = await supabase
        .from('prescriptions')
        .update({
          status,
          verified_by,
          verification_notes,
          verified_at: new Date()
        })
        .eq('id', id)
        .select(`
          *,
          orders (id, customer_id, total_amount, status)
        `);

      if (error) throw error;

      res.json({
        success: true,
        data: data[0],
        message: `Prescription ${status}`
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get prescriptions by customer
  router.get('/customer/:customer_id', async (req, res) => {
    try {
      const { customer_id } = req.params;
      
      const { data, error } = await supabase
        .from('prescriptions')
        .select(`
          *,
          orders (id, customer_id, total_amount, status)
        `)
        .eq('orders.customer_id', customer_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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

  // Delete prescription
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('prescriptions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Prescription deleted successfully'
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

export default prescriptionRoutes;
