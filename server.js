// Load environment variables before anything else uses process.env
require('dotenv').config();

const app = require('./app');
const connectDB = require('./config/db');
const http = require('http');
const { Server } = require('socket.io');

const dns = require('dns'); dns.setServers(['1.1.1.1', '8.8.8.8']);
const PORT = process.env.PORT || 5001;

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

const seedOwner = async () => {
  try {
    const User = require('./models/User');
    const existing = await User.findOne({ role: 'owner' });
    if (existing) {
      console.log('ℹ️  Owner account already exists, skipping seed.');
      return;
    }

    const { OWNER_NAME, OWNER_EMAIL, OWNER_PHONE, OWNER_PASSWORD } = process.env;
    if (!OWNER_EMAIL || !OWNER_PASSWORD) {
      console.warn('⚠️  OWNER_EMAIL / OWNER_PASSWORD not set, skipping owner seed.');
      return;
    }

    await User.create({
      name: OWNER_NAME || 'Owner',
      email: OWNER_EMAIL,
      phone: OWNER_PHONE || '9999999999',
      password: OWNER_PASSWORD,
      role: 'owner',
    });
    console.log(`✅ Owner account created → ${OWNER_EMAIL}`);
  } catch (err) {
    console.error('Owner seed error:', err.message);
  }
};

const startServer = async () => {
  await connectDB();
  await seedOwner();

  // Create raw HTTP server from the Express app so Socket.io can attach to it
  const server = http.createServer(app);

  // Initialize Socket.io on top of the same HTTP server
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // Customer joins a room for their specific order
    socket.on('trackOrder', (orderId) => {
      socket.join(`order_${orderId}`);
      console.log(`Socket ${socket.id} tracking order_${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

  // Make io accessible inside controllers via req.app.get('io')
  app.set('io', io);

  server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // Graceful shutdown on SIGTERM (e.g. from container orchestrators / hosting platforms)
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('Process terminated.');
    });
  });
};

startServer();