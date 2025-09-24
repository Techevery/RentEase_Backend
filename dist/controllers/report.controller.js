"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExpensesBreakdown = exports.getPropertyPerformance = exports.getFinancialSummary = void 0;
const payment_model_1 = __importStar(require("../models/payment.model"));
const expense_model_1 = __importStar(require("../models/expense.model"));
const property_model_1 = require("../models/property.model");
const mongoose_1 = __importDefault(require("mongoose"));
// Get financial summary for all properties
// GET /api/reports/financial-summary
const getFinancialSummary = async (req, res, next) => {
    try {
        // Get all approved payments for landlord's properties
        const approvedPayments = await payment_model_1.default.find({
            landlordId: req.user.id,
            status: payment_model_1.PaymentStatus.APPROVED
        });
        // Get all approved expenses for landlord's properties
        const approvedExpenses = await expense_model_1.default.find({
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.APPROVED
        });
        // Calculate totals
        const totalRevenue = approvedPayments.reduce((sum, payment) => sum + payment.amount, 0);
        const totalExpenses = approvedExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        const netIncome = totalRevenue - totalExpenses;
        // Calculate monthly breakdown
        const currentDate = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(currentDate.getMonth() - 6);
        const monthlyRevenue = approvedPayments
            .filter(payment => payment.paymentDate >= sixMonthsAgo)
            .reduce((acc, payment) => {
            const monthYear = payment.paymentDate.toISOString().slice(0, 7); // YYYY-MM
            if (!acc[monthYear])
                acc[monthYear] = 0;
            acc[monthYear] += payment.amount;
            return acc;
        }, {});
        const monthlyExpenses = approvedExpenses
            .filter(expense => expense.expenseDate >= sixMonthsAgo)
            .reduce((acc, expense) => {
            const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM
            if (!acc[monthYear])
                acc[monthYear] = 0;
            acc[monthYear] += expense.amount;
            return acc;
        }, {});
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
                    netIncome: parseFloat(netIncome.toFixed(2)),
                    profitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(2)) : 0
                },
                counts: {
                    totalPayments: approvedPayments.length,
                    totalExpenses: approvedExpenses.length
                },
                monthlyBreakdown: {
                    revenue: monthlyRevenue,
                    expenses: monthlyExpenses
                },
                timeframe: {
                    from: sixMonthsAgo,
                    to: currentDate
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getFinancialSummary = getFinancialSummary;
// Get property performance breakdown
// GET /api/reports/property-performance
const getPropertyPerformance = async (req, res, next) => {
    try {
        // Get all properties for the landlord
        const properties = await property_model_1.House.find({ landlordId: req.user.id });
        const propertyPerformance = await Promise.all(properties.map(async (property) => {
            // Get approved payments for this property
            const propertyPayments = await payment_model_1.default.find({
                houseId: property._id,
                status: payment_model_1.PaymentStatus.APPROVED
            });
            // Get approved expenses for this property
            const propertyExpenses = await expense_model_1.default.find({
                houseId: property._id,
                status: expense_model_1.ExpenseStatus.APPROVED
            });
            const totalRevenue = propertyPayments.reduce((sum, payment) => sum + payment.amount, 0);
            const totalExpenses = propertyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
            const netIncome = totalRevenue - totalExpenses;
            // Get occupancy rate (assuming you have flats data)
            const flats = await mongoose_1.default.model('Flat').find({ houseId: property._id });
            const occupiedFlats = flats.filter(flat => flat.status === 'occupied').length;
            const occupancyRate = flats.length > 0 ? (occupiedFlats / flats.length) * 100 : 0;
            return {
                property: {
                    id: property._id,
                    name: property.name,
                    address: property.address,
                    totalFlats: property.totalFlats,
                    occupiedFlats,
                    occupancyRate: parseFloat(occupancyRate.toFixed(2))
                },
                financials: {
                    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
                    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
                    netIncome: parseFloat(netIncome.toFixed(2)),
                    profitMargin: totalRevenue > 0 ? parseFloat(((netIncome / totalRevenue) * 100).toFixed(2)) : 0
                },
                counts: {
                    payments: propertyPayments.length,
                    expenses: propertyExpenses.length
                }
            };
        }));
        // Sort by net income (highest first)
        propertyPerformance.sort((a, b) => b.financials.netIncome - a.financials.netIncome);
        res.status(200).json({
            success: true,
            data: propertyPerformance,
            summary: {
                totalProperties: properties.length,
                averageOccupancyRate: propertyPerformance.length > 0
                    ? parseFloat((propertyPerformance.reduce((sum, prop) => sum + prop.property.occupancyRate, 0) / properties.length).toFixed(2))
                    : 0,
                totalRevenueAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.totalRevenue, 0).toFixed(2)),
                totalExpensesAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.totalExpenses, 0).toFixed(2)),
                totalNetIncomeAcrossProperties: parseFloat(propertyPerformance.reduce((sum, prop) => sum + prop.financials.netIncome, 0).toFixed(2))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getPropertyPerformance = getPropertyPerformance;
// Get expenses breakdown by category
// GET /api/reports/expenses-breakdown
const getExpensesBreakdown = async (req, res, next) => {
    try {
        const { fromDate, toDate, propertyId } = req.query;
        // Build query
        let query = {
            landlordId: req.user.id,
            status: expense_model_1.ExpenseStatus.APPROVED
        };
        // Date range filter
        if (fromDate || toDate) {
            query.expenseDate = {};
            if (fromDate)
                query.expenseDate.$gte = new Date(fromDate);
            if (toDate)
                query.expenseDate.$lte = new Date(toDate);
        }
        // Property filter
        if (propertyId) {
            query.houseId = propertyId;
        }
        // Get all approved expenses with proper population
        const expenses = await expense_model_1.default.find(query)
            .populate([
            {
                path: 'houseId',
                select: 'name address',
                match: { _id: { $exists: true } } // Ensure house exists
            },
            {
                path: 'flatId',
                select: 'number',
                match: { _id: { $exists: true } } // Ensure flat exists
            },
            {
                path: 'managerId',
                select: 'name email',
                match: { _id: { $exists: true } } // Ensure manager exists
            }
        ])
            .sort('-expenseDate');
        // Filter out expenses with null houseId after population
        const validExpenses = expenses.filter(expense => expense.houseId !== null);
        // Calculate category breakdown
        const categoryBreakdown = validExpenses.reduce((acc, expense) => {
            const category = expense.category;
            if (!acc[category]) {
                acc[category] = {
                    count: 0,
                    totalAmount: 0,
                    averageAmount: 0,
                    percentage: 0,
                    expenses: []
                };
            }
            acc[category].count += 1;
            acc[category].totalAmount += expense.amount;
            acc[category].expenses.push(expense);
            return acc;
        }, {});
        // Calculate total amount for percentages
        const totalAmount = validExpenses.reduce((sum, expense) => sum + expense.amount, 0);
        // Calculate averages and percentages
        Object.keys(categoryBreakdown).forEach(category => {
            categoryBreakdown[category].averageAmount =
                categoryBreakdown[category].totalAmount / categoryBreakdown[category].count;
            categoryBreakdown[category].percentage = totalAmount > 0
                ? (categoryBreakdown[category].totalAmount / totalAmount) * 100
                : 0;
        });
        // Calculate monthly breakdown
        const monthlyBreakdown = validExpenses.reduce((acc, expense) => {
            const monthYear = expense.expenseDate.toISOString().slice(0, 7); // YYYY-MM
            if (!acc[monthYear]) {
                acc[monthYear] = {
                    totalAmount: 0,
                    count: 0,
                    byCategory: {}
                };
            }
            acc[monthYear].totalAmount += expense.amount;
            acc[monthYear].count += 1;
            // Category breakdown within month
            if (!acc[monthYear].byCategory[expense.category]) {
                acc[monthYear].byCategory[expense.category] = 0;
            }
            acc[monthYear].byCategory[expense.category] += expense.amount;
            return acc;
        }, {});
        // Get top expenses
        const topExpenses = [...validExpenses]
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);
        // Get property-wise breakdown if no specific property filter
        let propertyBreakdown = {};
        if (!propertyId) {
            propertyBreakdown = validExpenses.reduce((acc, expense) => {
                const house = expense.houseId;
                if (!house || !house._id)
                    return acc; // Skip if house is null
                const propertyId = house._id.toString();
                const propertyName = house.name || 'Unknown Property';
                if (!acc[propertyId]) {
                    acc[propertyId] = {
                        name: propertyName,
                        totalAmount: 0,
                        count: 0,
                        byCategory: {}
                    };
                }
                acc[propertyId].totalAmount += expense.amount;
                acc[propertyId].count += 1;
                // Category breakdown within property
                if (!acc[propertyId].byCategory[expense.category]) {
                    acc[propertyId].byCategory[expense.category] = 0;
                }
                acc[propertyId].byCategory[expense.category] += expense.amount;
                return acc;
            }, {});
        }
        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalExpenses: validExpenses.length,
                    totalAmount: parseFloat(totalAmount.toFixed(2)),
                    averageExpense: validExpenses.length > 0 ? parseFloat((totalAmount / validExpenses.length).toFixed(2)) : 0
                },
                categoryBreakdown: Object.entries(categoryBreakdown)
                    .sort(([, a], [, b]) => b.totalAmount - a.totalAmount)
                    .reduce((acc, [category, data]) => {
                    acc[category] = {
                        ...data,
                        totalAmount: parseFloat(data.totalAmount.toFixed(2)),
                        averageAmount: parseFloat(data.averageAmount.toFixed(2)),
                        percentage: parseFloat(data.percentage.toFixed(2))
                    };
                    return acc;
                }, {}),
                monthlyBreakdown,
                propertyBreakdown,
                topExpenses: topExpenses.map(expense => {
                    const house = expense.houseId;
                    const flat = expense.flatId;
                    const manager = expense.managerId;
                    return {
                        id: expense._id,
                        amount: expense.amount,
                        category: expense.category,
                        description: expense.description,
                        vendor: expense.vendor,
                        expenseDate: expense.expenseDate,
                        property: (house === null || house === void 0 ? void 0 : house.name) || 'Unknown Property',
                        flat: (flat === null || flat === void 0 ? void 0 : flat.number) || 'N/A',
                        manager: (manager === null || manager === void 0 ? void 0 : manager.name) || 'Unknown Manager'
                    };
                }),
                allExpenses: validExpenses.map(expense => {
                    const house = expense.houseId;
                    const flat = expense.flatId;
                    const manager = expense.managerId;
                    return {
                        id: expense._id,
                        amount: expense.amount,
                        category: expense.category,
                        description: expense.description,
                        vendor: expense.vendor,
                        expenseDate: expense.expenseDate,
                        property: (house === null || house === void 0 ? void 0 : house.name) || 'Unknown Property',
                        flat: (flat === null || flat === void 0 ? void 0 : flat.number) || 'N/A',
                        manager: (manager === null || manager === void 0 ? void 0 : manager.name) || 'Unknown Manager'
                    };
                })
            },
            filters: {
                fromDate: fromDate || 'All time',
                toDate: toDate || 'All time',
                propertyId: propertyId || 'All properties'
            },
            warnings: expenses.length !== validExpenses.length
                ? `Filtered out ${expenses.length - validExpenses.length} expenses with missing property data`
                : undefined
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getExpensesBreakdown = getExpensesBreakdown;
