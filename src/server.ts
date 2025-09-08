import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import morgan from 'morgan';
import { connectDB } from './config/db';
import authRoutes from './routes/auth.routes';
import landlordRoutes from './routes/landlord.routes';
import reportRoutes from './routes/report.routes';
import managerRoutes from './routes/manager.routes';
import tenantRoutes from './routes/tenant.routes';
import paymentRoutes from './routes/payment.routes';
import expenseRoutes from './routes/expense.routes';
import propertyRoutes from './routes/property.routes';
import { errorHandler } from './middleware/error.middleware';
import { initializeCloudinary } from './config/cloudinary';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Cloudinary
initializeCloudinary();

// Middleware
app.use(cors({
  origin: 'https://rentease.homeyhost.ng/api',

  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/landlords', landlordRoutes);
app.use('/api/managers', managerRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/reports', reportRoutes);


// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

app.use("*", (_, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`Unhandled Rejection: ${err.message}`);
  // Close server & exit process
  process.exit(1);
});
