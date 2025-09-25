import express from 'express';
import { validateOrderData, formatOrderStatusMessage, formatMyanmarCurrency } from '../utils/helpers.js';
import viberService from '../services/viberService.js';

const orderRoutes = (supabase, io) => {
  const router = express.Router();

  // Get all orders with advanced filtering and pagination
  router.get('/', async (req, res) => {
    try {
      const { 
        status, 
        customer_id, 
        date_from, 
        date_to, 
        min_amount, 
        max_amount,
        page = 1, 
        limit = 20,
        sort_by = 'created_at',
        sort_order = 'desc',
        search
      } = req.query;
      
      let query = supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            address,
            viber_id
          )
        `);

      // Apply filters
      if (status) {
        query = query.eq('status', status);
      }
      
      if (customer_id) {
        query = query.eq('customer_id', customer_id);
      }

      if (date_from) {
        query = query.gte('created_at', date_from);
      }

      if (date_to) {
        query = query.lte('created_at', date_to);
      }

      if (min_amount) {
        query = query.gte('total_amount', parseFloat(min_amount));
      }

      if (max_amount) {
        query = query.lte('total_amount', parseFloat(max_amount));
      }

      if (search) {
        // Search in customer name or order notes
        query = query.or(`notes.ilike.%${search}%,customers.name.ilike.%${search}%`);
      }

      // Apply sorting
      const ascending = sort_order.toLowerCase() === 'asc';
      query = query.order(sort_by, { ascending });

      // Apply pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query = query.range(offset, offset + parseInt(limit) - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      // Calculate summary statistics
      const { data: summaryData } = await supabase
        .from('orders')
        .select('status, total_amount')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      const summary = {
        total_orders: data?.length || 0,
        total_amount: data?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0,
        status_breakdown: data?.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {}) || {},
        daily_stats: {
          orders_today: summaryData?.length || 0,
          revenue_today: summaryData?.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0) || 0
        }
      };

      res.json({
        success: true,
        data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count || data?.length || 0,
          total_pages: Math.ceil((count || data?.length || 0) / parseInt(limit))
        },
        summary,
        filters: {
          status,
          customer_id,
          date_from,
          date_to,
          min_amount,
          max_amount,
          search
        }
      });
    } catch (error) {
      console.error('❌ Error fetching orders:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get single order with full details
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            address,
            viber_id,
            first_seen,
            last_active
          ),
          prescriptions (
            id,
            image_url,
            status,
            notes,
            created_at
          )
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

      // Get customer's order history
      const { data: orderHistory } = await supabase
        .from('orders')
        .select('id, total_amount, status, created_at')
        .eq('customer_id', data.customer_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5);

      res.json({
        success: true,
        data: {
          ...data,
          customer_order_history: orderHistory || []
        }
      });
    } catch (error) {
      console.error('❌ Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Create new order with enhanced validation
  router.post('/', async (req, res) => {
    try {
      const { customer_id, items, total_amount, delivery_address, prescription_image, notes, phone } = req.body;
      
      // Validate order data
      const validation = validateOrderData({ items, total_amount, delivery_address });
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors
        });
      }

      // Validate items structure
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Items must be a non-empty array'
        });
      }

      // Validate each item
      for (const item of items) {
        if (!item.product_id || !item.name || !item.quantity || !item.price) {
          return res.status(400).json({
            success: false,
            error: 'Each item must have product_id, name, quantity, and price'
          });
        }
      }

      // Check if customer exists and get their info
      let customerData = null;
      if (customer_id) {
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .select('*')
          .eq('id', customer_id)
          .single();

        if (customerError) {
          console.log('Customer not found, order will be created without customer reference');
        } else {
          customerData = customer;
        }
      }

      // Create the order
      const { data: orderData, error } = await supabase
        .from('orders')
        .insert({
          customer_id: customerData?.id || null,
          items,
          total_amount: parseFloat(total_amount),
          delivery_address,
          prescription_image,
          notes,
          status: 'pending',
          created_at: new Date()
        })
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            address,
            viber_id
          )
        `)
        .single();

      if (error) throw error;

      // Send confirmation message to customer if they have viber_id
      if (customerData?.viber_id) {
        const confirmationMessage = formatOrderStatusMessage(
          orderData.id,
          'confirmed'
        );
        
        const messageResult = await viberService.sendViberMessage(
          customerData.viber_id,
          confirmationMessage
        );

        if (!messageResult.success) {
          console.error('❌ Failed to send order confirmation:', messageResult.error);
        }
      }

      // Real-time update via Socket.io
      io.emit('new_order', {
        ...orderData,
        customer_name: customerData?.name || 'Walk-in Customer',
        customer_phone: phone || customerData?.phone || 'No phone',
        formatted_amount: formatMyanmarCurrency(orderData.total_amount)
      });

      // Also emit to admin room specifically
      io.to('admin_room').emit('order_created', orderData);

      res.status(201).json({
        success: true,
        data: orderData,
        message: customerData ? 
          "အမှာစာ အောင်မြင်စွာ တင်ပြီးပါပြီ!" : 
          "Order created successfully!",
        confirmation_sent: !!customerData?.viber_id
      });
    } catch (error) {
      console.error('❌ Error creating order:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Update order status with automatic notifications
  router.patch('/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes, notify_customer = true } = req.body;
      
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
          error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Get current order to check customer info
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (
            id,
            name,
            phone,
            viber_id
          )
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!currentOrder) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      // Update the order
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
          customers (
            id,
            name,
            phone,
            address,
            viber_id
          )
        `)
        .single();

      if (error) throw error;

      // Send status update message to customer
      if (notify_customer && currentOrder.customers?.viber_id) {
        const statusMessage = formatOrderStatusMessage(id, status);
        
        const messageResult = await viberService.sendViberMessage(
          currentOrder.customers.viber_id,
          statusMessage
        );

        if (!messageResult.success) {
          console.error('❌ Failed to send status update:', messageResult.error);
        }
      }

      // Real-time update via Socket.io
      io.emit('order_updated', {
        ...data,
        formatted_amount: formatMyanmarCurrency(data.total_amount),
        previous_status: currentOrder.status
      });

      io.to('admin_room').emit('order_status_changed', {
        order_id: id,
        old_status: currentOrder.status,
        new_status: status,
        customer_name: currentOrder.customers?.name || 'Unknown'
      });

      res.json({
        success: true,
        data,
        message: `Order status updated to ${status}`,
        notification_sent: !!(notify_customer && currentOrder.customers?.viber_id),
        previous_status: currentOrder.status
      });
    } catch (error) {
      console.error('❌ Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Add items to existing order
  router.patch('/:id/items', async (req, res) => {
    try {
      const { id } = req.params;
      const { items, recalculate_total = true } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Items must be a non-empty array'
        });
      }

      // Get current order
      const { data: currentOrder, error: fetchError } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!currentOrder) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      // Combine existing items with new items
      const updatedItems = [...(currentOrder.items || []), ...items];
      
      // Recalculate total if requested
      let newTotal = currentOrder.total_amount;
      if (recalculate_total) {
        newTotal = updatedItems.reduce((sum, item) => 
          sum + (parseFloat(item.price) * parseInt(item.quantity)), 0
        );
      }

      // Update the order
      const { data, error } = await supabase
        .from('orders')
        .update({
          items: updatedItems,
          total_amount: newTotal,
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Emit real-time update
      io.to('admin_room').emit('order_items_updated', {
        order_id: id,
        new_items: items,
        total_items: updatedItems.length,
        new_total: newTotal
      });

      res.json({
        success: true,
        data,
        message: 'Order items updated successfully',
        items_added: items.length,
        new_total: formatMyanmarCurrency(newTotal)
      });
    } catch (error) {
      console.error('❌ Error updating order items:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Get order statistics
  router.get('/stats/dashboard', async (req, res) => {
    try {
      const { period = '7d' } = req.query;
      
      // Calculate date range based on period
      let dateFrom;
      const now = new Date();
      
      switch (period) {
        case '24h':
          dateFrom = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get orders within the period
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .gte('created_at', dateFrom.toISOString());

      if (error) throw error;

      // Calculate statistics
      const stats = {
        period,
        total_orders: orders.length,
        total_revenue: orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0),
        average_order_value: orders.length > 0 ? 
          orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) / orders.length : 0,
        status_breakdown: orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {}),
        daily_breakdown: {},
        top_customers: {}
      };

      // Calculate daily breakdown
      orders.forEach(order => {
        const date = new Date(order.created_at).toISOString().split('T')[0];
        if (!stats.daily_breakdown[date]) {
          stats.daily_breakdown[date] = { orders: 0, revenue: 0 };
        }
        stats.daily_breakdown[date].orders += 1;
        stats.daily_breakdown[date].revenue += parseFloat(order.total_amount);
      });

      res.json({
        success: true,
        data: stats,
        formatted: {
          total_revenue: formatMyanmarCurrency(stats.total_revenue),
          average_order_value: formatMyanmarCurrency(stats.average_order_value)
        }
      });
    } catch (error) {
      console.error('❌ Error fetching order statistics:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Cancel order
  router.delete('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { reason, notify_customer = true } = req.body;
      
      // Get order details first
      const { data: orderData, error: fetchError } = await supabase
        .from('orders')
        .select(`
          *,
          customers (viber_id, name)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (!orderData) {
        return res.status(404).json({
          success: false,
          error: 'Order not found'
        });
      }

      // Update order status to cancelled instead of deleting
      const { data, error } = await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          notes: reason ? `Cancelled: ${reason}` : 'Order cancelled',
          updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Notify customer if requested
      if (notify_customer && orderData.customers?.viber_id) {
        const cancellationMessage = formatOrderStatusMessage(id, 'cancelled');
        if (reason) {
          cancellationMessage += `\n\nရှင်းလင်းချက်: ${reason}`;
        }
        
        await viberService.sendViberMessage(
          orderData.customers.viber_id,
          cancellationMessage
        );
      }

      // Emit real-time update
      io.to('admin_room').emit('order_cancelled', {
        order_id: id,
        customer_name: orderData.customers?.name || 'Unknown',
        reason: reason || 'No reason provided'
      });

      res.json({
        success: true,
        data,
        message: 'Order cancelled successfully',
        notification_sent: !!(notify_customer && orderData.customers?.viber_id)
      });
    } catch (error) {
      console.error('❌ Error cancelling order:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

export default orderRoutes;
