const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// Render (and most hosts) sit behind a proxy. Needed for secure cookies / correct IPs.
app.set('trust proxy', 1);

// =====================
// CORS
// =====================
// CLIENT_URL can hold one URL or several separated by commas.
// Example: CLIENT_URL=https://myfrontend.com,http://localhost:5173
const allowedOrigins = [
  ...(process.env.CLIENT_URL || '').split(','),
  'http://localhost:5173',
]
  .map((o) => o.trim().replace(/\/$/, '')) // remove spaces and trailing slash
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// cors must come BEFORE routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// =====================
// Middleware
// =====================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// =====================
// Route Imports
// =====================
const authRoutes = require('./routes/authRoutes');
const foodRoutes = require('./routes/foodRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const userRoutes = require('./routes/userRoutes');
const cartRoutes = require('./routes/cartRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const uploadRoutes = require('./routes/uploadRoutes');

// =====================
// Health check (open your Render URL in browser to see this)
// =====================
app.get('/', (req, res) => {
  res.json({ success: true, message: 'Restaurant API is running' });
});

app.get('/test', (req, res) => {
  res.json({ success: true, message: 'API is working successfully!' });
});

// =====================
// Route Mounting
// =====================
app.use('/api/auth', authRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);

// Serve uploads folder statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =====================
// 404 Handler
// =====================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// =====================
// Global Error Handler
// =====================
app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
    }),
  });
});

module.exports = app;