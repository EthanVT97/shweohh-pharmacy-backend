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

  // Create or update customer (upsert based on viber_id)
  router.post('/', async (req, res) => {
    try {
      const { viber_id, name, phone, address } = req.body;
      
      if (!viber_id) {
        return res.status(400).json({
          success: false,
          error: 'Viber ID is required'
        });
      }

      // Check if customer exists by viber_id for setting first_seen
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('viber_id', viber_id)
        .single();

      let upsertData = {
        viber_id,
        name,
        phone,
        address,
        last_active: new Date()
      };

      if (!existingCustomer) {
        upsertData.first_seen = new Date();
      }
      
      const { data, error } = await supabase
        .from('customers')
        .upsert(upsertData, { onConflict: 'viber_id' }) // Use onConflict for proper upsert based on viber_id
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

  // Update customer by internal ID
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, phone, address, viber_id } = req.body; 

      const { data, error } = await supabase
        .from('customers')
        .update({
          name,
          phone,
          address,
          viber_id, // Allow updating viber_id, though typically internal ID is stable
          last_active: new Date(),
          updated_at: new Date() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found for update'
        });
      }

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

  // Delete customer
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      res.json({
        success: true,
        message: 'Customer deleted successfully'
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
