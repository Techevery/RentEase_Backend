"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const db_1 = require("./config/db");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const landlord_routes_1 = __importDefault(require("./routes/landlord.routes"));
const report_routes_1 = __importDefault(require("./routes/report.routes"));
const manager_routes_1 = __importDefault(require("./routes/manager.routes"));
const tenant_routes_1 = __importDefault(require("./routes/tenant.routes"));
const payment_routes_1 = __importDefault(require("./routes/payment.routes"));
const expense_routes_1 = __importDefault(require("./routes/expense.routes"));
const property_routes_1 = __importDefault(require("./routes/property.routes"));
const error_middleware_1 = require("./middleware/error.middleware");
const cloudinary_1 = require("./config/cloudinary");
// Load environment variables
dotenv_1.default.config();
// Initialize Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
(0, db_1.connectDB)();
// Initialize Cloudinary
(0, cloudinary_1.initializeCloudinary)();
// Middleware
app.use((0, cors_1.default)({
<<<<<<< HEAD
// origin: 'https://house-property-management-frontend.vercel.app',
// credentials: true
=======
    origin: 'https://rentease.homeyhost.ng',
    credentials: true
>>>>>>> 72994f1bcae7b9279144eb1149e3a5379acf02e1
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use((0, morgan_1.default)('dev'));
}
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/landlords', landlord_routes_1.default);
app.use('/api/managers', manager_routes_1.default);
app.use('/api/tenants', tenant_routes_1.default);
app.use('/api/payments', payment_routes_1.default);
app.use('/api/expenses', expense_routes_1.default);
app.use('/api/properties', property_routes_1.default);
app.use('/api/reports', report_routes_1.default);
// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Error handling middleware
app.use(error_middleware_1.errorHandler);
// Start server
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
app.use("*", (_, res) => {
    res.status(404).json({ message: 'Not Found' });
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    // Close server & exit process
    process.exit(1);
});
