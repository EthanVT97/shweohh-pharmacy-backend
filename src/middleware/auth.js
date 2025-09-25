// Basic authentication middleware for admin routes
export const authenticateAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const token = authHeader.split(' ')[1];
  
  // Simple token validation (in production, use JWT or similar)
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(403).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }

  next();
};

// API key validation for external services
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key'
    });
  }

  next();
};

// CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL,
      process.env.ADMIN_URL
    ].filter(Boolean);

    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};
