const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Modern mongoose (v6+) no longer needs useNewUrlParser / useUnifiedTopology
      autoIndex: process.env.NODE_ENV !== 'production', // disable auto-index building in prod for perf
    });

    console.log(`MongoDB Connected successfully`);

    mongoose.connection.on('error', (err) => {
      console.error(`MongoDB connection error after initial connect: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected.');
    });

    return conn;
  } catch (error) {
    console.error(`MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
