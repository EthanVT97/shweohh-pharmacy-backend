import express from 'express';

const productRoutes = (supabase) => {
  const router = express.Router();

  // Get all products with filtering
  router.get('/', async (req, res) => {
    try {
      const { category, search, in_stock, page = 1, limit = 50 } = req.query;
      
      let query = supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .order('name');

      // Apply filters
      if (category) {
        query = query.eq('category', category);
      }

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      if (in_stock === 'true') {
        query = query.gt('stock', 0);
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
          limit: parseInt(limit),
          total: data.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get single product
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) {
        return res.status(404).json({
          success: false,
          error: 'Product not found'
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

  // Create new product
  router.post('/', async (req, res) => {
    try {
      const { name, category, price, stock, image_url, description } = req.body;
      
      if (!name || !price) {
        return res.status(400).json({
          success: false,
          error: 'Name and price are required'
        });
      }

      const { data, error } = await supabase
        .from('products')
        .insert({
          name,
          category,
          price,
          stock: stock || 0,
          image_url,
          description,
          status: 'active',
          created_at: new Date()
        })
        .select();

      if (error) throw error;

      res.status(201).json({
        success: true,
        data: data[0],
        message: "Product created successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update product
  router.put('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, category, price, stock, image_url, description, status } = req.body;
      
      const { data, error } = await supabase
        .from('products')
        .update({
          name,
          category,
          price,
          stock,
          image_url,
          description,
          status,
          updated_at: new Date()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        data: data[0],
        message: "Product updated successfully"
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Delete product (soft delete)
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('products')
        .update({
          status: 'inactive',
          updated_at: new Date()
        })
        .eq('id', id)
        .select();

      if (error) throw error;

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get product categories
  router.get('/meta/categories', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .not('category', 'is', null)
        .eq('status', 'active');

      if (error) throw error;

      const categories = [...new Set(data.map(item => item.category))].filter(Boolean);

      res.json({
        success: true,
        data: categories
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

export default productRoutes;
