// Message templates for consistent communication
export const messageTemplates = {
  welcome: {
    myanmar: `ဆေးဆိုင်မှ ကြိုဆိုပါတယ်! 🏪

ကျေးဇူးပြု၍ အောက်ပါ option များမှ ရွေးချယ်ပါ:

1️⃣ - ဆေးဝါးများ ရှာဖွေရန်
2️⃣ - အမှာစာတင်ရန်  
3️⃣ - ဆေးညွှန်းပို့ရန်
4️⃣ - အကူအညီလိုချင်ပါက

ဖွင့်ချိန်: နံနက် ၉နာရီ - ည ၉နာရီ`,

    english: `Welcome to ရွှေအိုး Pharmacy! 🏪

Please choose from the following options:

1️⃣ - Search Medicines
2️⃣ - Place Order
3️⃣ - Upload Prescription  
4️⃣ - Need Help

Open Hours: 9AM - 9PM Daily`
  },

  orderConfirmation: {
    myanmar: `အမှာစာ လက်ခံပြီးပါပြီ! ✅

အမှာစာနံပါတ်: {orderId}
စုစုပေါင်းငွေ: {totalAmount} ကျပ်
ပို့ဆောင်လိပ်စာ: {deliveryAddress}

ကျွန်ုပ်တို့က မကြာမီ ဆက်သွယ်ပါမယ်။`,

    english: `Order confirmed! ✅

Order ID: {orderId}
Total Amount: {totalAmount} MMK
Delivery Address: {deliveryAddress}

We'll contact you soon.`
  },

  orderStatusUpdate: {
    myanmar: {
      confirmed: `အမှာစာကို အတည်ပြုပြီးပါပြီ! ✅\nအမှာစာနံပါတ်: {orderId}\nကျွန်ုပ်တို့က ပြင်ဆင်နေပါပြီ။`,
      preparing: `အမှာစာကို ပြင်ဆင်နေပါပြီ! 🔄\nအမှာစာနံပါတ်: {orderId}`,
      ready: `အမှာစာ ပြင်ဆင်ပြီးပါပြီ! 📦\nအမှာစာနံပါတ်: {orderId}\nပို့ဆောင်ရန် အသင့်ပါ။`,
      delivered: `အမှာစာ ပို့ဆောင်ပြီးပါပြီ! 🚚✅\nအမှာစာနံပါတ်: {orderId}\nကျေးဇူးတင်ပါတယ်!`,
      cancelled: `အမှာစာကို ပယ်ဖျက်လိုက်ပါပြီ။ ❌\nအမှာစာနံပါတ်: {orderId}`
    },
    english: {
      confirmed: `Order confirmed! ✅\nOrder ID: {orderId}\nWe're preparing your order.`,
      preparing: `Order is being prepared! 🔄\nOrder ID: {orderId}`,
      ready: `Order is ready! 📦\nOrder ID: {orderId}\nReady for delivery.`,
      delivered: `Order delivered successfully! 🚚✅\nOrder ID: {orderId}\nThank you!`,
      cancelled: `Order has been cancelled. ❌\nOrder ID: {orderId}`
    }
  },

  prescriptionReceived: {
    myanmar: `ဆေးညွှန်း လက်ခံပြီးပါပြီ! 📋

ကျွန်ုပ်တို့ဆေးဝိုင်းမှ စစ်ဆေးပြီး မကြာမီ ပြန်လည်ဆက်သွယ်ပါမယ်။

ကျေးဇူးတင်ပါတယ်!`,

    english: `Prescription received! 📋

Our pharmacist will review it and contact you soon.

Thank you!`
  },

  prescriptionStatus: {
    myanmar: {
      reviewed: `ဆေးညွှန်း စစ်ဆေးပြီးပါပြီ! ✅\nလိုအပ်သော ဆေးများ အရန်ရှိပါတယ်။ အမှာစာတင်နိုင်ပါတယ်။`,
      rejected: `ဆေးညွှန်း ပြန်လည်တင်ပေးရန် လိုအပ်ပါတယ်။ 📋❌\nကျေးဇူးပြု၍ ရှင်းလင်းသော ဓာတ်ပုံ ပြန်ပို့ပေးပါ။`,
      fulfilled: `ဆေးညွှန်း အတိုင်း ဆေးများ ပြင်ဆင်ပြီးပါပြီ! 💊✅`
    },
    english: {
      reviewed: `Prescription reviewed! ✅\nRequired medicines are available. You can place an order.`,
      rejected: `Prescription needs resubmission. 📋❌\nPlease send a clearer image.`,
      fulfilled: `Medicines prepared according to prescription! 💊✅`
    }
  },

  help: {
    myanmar: `ကျွန်ုပ်တို့ကို ဆက်သွယ်နည်းများ:

📞 ဖုန်း: 09-XXX-XXX-XXX
📧 အီးမေးလ်: info@shweoo-pharmacy.com
🕘 ဖွင့်ချိန်: နံနက် ၉နာရီ - ည ၉နာရီ
📍 လိပ်စာ: ရန်ကုန်မြို့

မေးခွန်းများ ရှိပါက လွတ်လပ်စွာ မေးမြန်းနိုင်ပါတယ်!`,

    english: `Contact us:

📞 Phone: 09-XXX-XXX-XXX
📧 Email: info@shweoo-pharmacy.com
🕘 Hours: 9AM - 9PM Daily
📍 Address: Yangon

Feel free to ask any questions!`
  }
};

// Utility function to combine Myanmar and English messages
export const createBilingualMessage = (myanmarText, englishText) => {
  return `${myanmarText}\n\n${englishText}`;
};

// Message formatting utilities
export const formatOrderMessage = (orderData, language = 'both') => {
  const template = messageTemplates.orderConfirmation;
  
  const formatMessage = (text) => {
    return text
      .replace('{orderId}', orderData.id)
      .replace('{totalAmount}', orderData.total_amount.toLocaleString())
      .replace('{deliveryAddress}', orderData.delivery_address);
  };

  if (language === 'myanmar') {
    return formatMessage(template.myanmar);
  } else if (language === 'english') {
    return formatMessage(template.english);
  } else {
    return createBilingualMessage(
      formatMessage(template.myanmar),
      formatMessage(template.english)
    );
  }
};

// Format order status update messages
export const formatOrderStatusMessage = (orderId, status, language = 'both') => {
  const templates = messageTemplates.orderStatusUpdate;
  
  const formatMessage = (text) => {
    return text.replace('{orderId}', orderId);
  };

  if (language === 'myanmar') {
    return formatMessage(templates.myanmar[status] || templates.myanmar.confirmed);
  } else if (language === 'english') {
    return formatMessage(templates.english[status] || templates.english.confirmed);
  } else {
    return createBilingualMessage(
      formatMessage(templates.myanmar[status] || templates.myanmar.confirmed),
      formatMessage(templates.english[status] || templates.english.confirmed)
    );
  }
};

// Format prescription status messages
export const formatPrescriptionStatusMessage = (status, language = 'both') => {
  const templates = messageTemplates.prescriptionStatus;

  if (language === 'myanmar') {
    return templates.myanmar[status] || templates.myanmar.reviewed;
  } else if (language === 'english') {
    return templates.english[status] || templates.english.reviewed;
  } else {
    return createBilingualMessage(
      templates.myanmar[status] || templates.myanmar.reviewed,
      templates.english[status] || templates.english.reviewed
    );
  }
};

// Get help message
export const getHelpMessage = (language = 'both') => {
  if (language === 'myanmar') {
    return messageTemplates.help.myanmar;
  } else if (language === 'english') {
    return messageTemplates.help.english;
  } else {
    return createBilingualMessage(
      messageTemplates.help.myanmar,
      messageTemplates.help.english
    );
  }
};

// Webhook event logging utility
export const logWebhookEvent = (event, data) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 📨 Webhook: ${event}`, {
    sender_id: data.sender?.id,
    sender_name: data.sender?.name,
    message_preview: data.message?.text?.substring(0, 50) + (data.message?.text?.length > 50 ? '...' : ''),
    message_type: data.message?.type || 'N/A'
  });
};

// Safe async handler wrapper for webhooks
export const safeAsyncHandler = (handler) => {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('❌ Webhook handler error:', error);
      // Always respond OK to prevent Viber webhook retries
      res.json({ status: 'ok' });
    }
  };
};

// Input validation utilities
export const validateOrderData = (orderData) => {
  const errors = [];
  
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Items are required and must be a non-empty array');
  }
  
  if (!orderData.total_amount || orderData.total_amount <= 0) {
    errors.push('Total amount must be greater than 0');
  }
  
  if (!orderData.delivery_address || orderData.delivery_address.trim() === '') {
    errors.push('Delivery address is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateCustomerData = (customerData) => {
  const errors = [];
  
  if (!customerData.viber_id) {
    errors.push('Viber ID is required');
  }
  
  if (customerData.phone && !/^(\+?95|0)?9\d{8,9}$/.test(customerData.phone)) {
    errors.push('Invalid Myanmar phone number format');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Text processing utilities
export const sanitizeText = (text) => {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
};

export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

// Date formatting utilities for Myanmar context
export const formatMyanmarDate = (date) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Yangon'
  };
  
  return new Intl.DateTimeFormat('en-US', options).format(new Date(date));
};

// Currency formatting
export const formatMyanmarCurrency = (amount) => {
  return new Intl.NumberFormat('en-US').format(amount) + ' MMK';
};

// Phone number formatting
export const formatMyanmarPhone = (phone) => {
  if (!phone) return '';
  
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as Myanmar phone number
  if (digits.startsWith('95')) {
    return `+${digits}`;
  } else if (digits.startsWith('09')) {
    return `+95${digits.substring(1)}`;
  } else if (digits.startsWith('9') && digits.length === 10) {
    return `+95${digits}`;
  }
  
  return phone; // Return original if can't format
};

// Export all utilities
export default {
  messageTemplates,
  createBilingualMessage,
  formatOrderMessage,
  formatOrderStatusMessage,
  formatPrescriptionStatusMessage,
  getHelpMessage,
  logWebhookEvent,
  safeAsyncHandler,
  validateOrderData,
  validateCustomerData,
  sanitizeText,
  truncateText,
  formatMyanmarDate,
  formatMyanmarCurrency,
  formatMyanmarPhone
};
