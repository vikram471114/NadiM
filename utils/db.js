import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB cluster
    // Mongoose new versions handle options like useNewUrlParser automatically
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ DB Connection Error: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

// Graceful shutdown on process termination
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed due to app termination.');
    process.exit(0);
});

export default connectDB;
