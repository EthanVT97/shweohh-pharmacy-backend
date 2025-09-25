import express from 'express';

const messageRoutes = (supabase) => {
  const router = express.Router();

  router.get('/:customerId', async (req, res) => {
    try {
      const { customerId } = req.params;
      const { page = 1, limit = 50 } = req.query;

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: true })
        .range((page - 1) * limit, page * limit - 1);

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
      console.error('Error fetching messages:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  router.post('/', async (req, res) => {
    try {
      const { customer_id, sender_type, message_text } = req.body;

      if (!customer_id || !sender_type || !message_text) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: customer_id, sender_type, message_text'
        });
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          customer_id,
          sender_type,
          message_text,
          created_at: new Date()
        })
        .select();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: data[0],
        message: 'Message logged successfully'
      });
    } catch (error) {
      console.error('Error logging message:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

export default messageRoutes;
