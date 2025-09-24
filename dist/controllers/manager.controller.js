"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTenantDetails = exports.getManagedTenants = exports.getDashboardStats = exports.getManagedProperties = void 0;
const tenant_model_1 = __importDefault(require("../models/tenant.model"));
const property_model_1 = require("../models/property.model");
const payment_model_1 = __importDefault(require("../models/payment.model"));
const expense_model_1 = __importDefault(require("../models/expense.model"));
const errorResponse_1 = require("../utils/errorResponse");
const manager_model_1 = __importDefault(require("../models/manager.model"));
// Helper function to calculate next payment date
function calculateNextPaymentDate(leaseStartDate, rentAmount) {
    if (!leaseStartDate)
        return new Date();
    const nextPayment = new Date(leaseStartDate);
    const today = new Date();
    while (nextPayment < today) {
        nextPayment.setMonth(nextPayment.getMonth() + 1);
    }
    return nextPayment;
}
function getPaymentStatus(lastPaymentDate, nextPaymentDate, lastPaymentStatus) {
    const today = new Date();
    if (!lastPaymentDate) {
        return 'pending';
    }
    if (lastPaymentStatus === 'pending') {
        return 'pending';
    }
    if (nextPaymentDate && nextPaymentDate < today) {
        return 'late';
    }
    return 'current';
}
//  Get all properties managed by the manager
// GET /api/managers/properties
//  Get all properties managed by the manager
// GET /api/managers/properties
const getManagedProperties = async (req, res, next) => {
    try {
        // Get all houses managed by this user
        const houses = await property_model_1.House.find({ managerId: req.user.id })
            .select('_id name address managerId')
            .lean();
        // Get all flats managed by this user OR in houses managed by this user
        const flats = await property_model_1.Flat.find({
            $or: [
                { managerId: req.user.id },
                { houseId: { $in: houses.map(house => house._id) } }
            ]
        })
            .populate([
            { path: 'houseId', select: 'name address' },
            {
                path: 'tenantId',
                select: 'name email phone rentAmount leaseStartDate leaseEndDate status',
                populate: { path: 'user', select: 'name email phone' }
            }
        ])
            .lean();
        // Update flats to ensure they have the correct managerId
        await property_model_1.Flat.updateMany({
            houseId: { $in: houses.map(house => house._id) },
            managerId: { $ne: req.user.id }
        }, { $set: { managerId: req.user.id } });
        // Get unique house IDs from all managed flats (including those not directly managed by user)
        const allManagedHouseIds = [
            ...new Set([
                ...houses.map(house => house._id.toString()),
                ...flats.map(flat => { var _a, _b; return (_b = (_a = flat.houseId) === null || _a === void 0 ? void 0 : _a._id) === null || _b === void 0 ? void 0 : _b.toString(); }).filter(Boolean)
            ])
        ];
        // Get complete house information for all managed properties
        const allManagedHouses = await property_model_1.House.find({
            _id: { $in: allManagedHouseIds }
        })
            .select('_id name address managerId')
            .lean();
        // Organize properties with their flats
        const propertiesWithTenants = allManagedHouses.map(house => {
            const houseFlats = flats.filter(flat => flat.houseId && flat.houseId._id.toString() === house._id.toString());
            return {
                _id: house._id,
                name: house.name || 'Unnamed Property',
                address: house.address || 'No address provided',
                managerId: house.managerId,
                flats: houseFlats.map(flat => {
                    var _a, _b, _c;
                    return ({
                        _id: flat._id,
                        number: flat.number || 'N/A',
                        status: flat.status || 'unknown',
                        size: flat.size || 'N/A',
                        bedrooms: flat.bedrooms || 'N/A',
                        bathrooms: flat.bathrooms || 'N/A',
                        tenant: flat.tenantId ? {
                            _id: flat.tenantId._id,
                            name: ((_a = flat.tenantId.user) === null || _a === void 0 ? void 0 : _a.name) || flat.tenantId.name || 'Unknown Tenant',
                            email: ((_b = flat.tenantId.user) === null || _b === void 0 ? void 0 : _b.email) || flat.tenantId.email || 'No email',
                            phone: ((_c = flat.tenantId.user) === null || _c === void 0 ? void 0 : _c.phone) || flat.tenantId.phone || 'No phone',
                            rentAmount: flat.tenantId.rentAmount || 0,
                            leaseStart: flat.tenantId.leaseStartDate || null,
                            leaseEnd: flat.tenantId.leaseEndDate || null,
                            status: flat.tenantId.status || 'unknown'
                        } : null
                    });
                }),
                stats: {
                    totalFlats: houseFlats.length,
                    occupied: houseFlats.filter(f => f.tenantId).length,
                    vacant: houseFlats.filter(f => !f.tenantId).length
                }
            };
        });
        // Ensure we include all houses even if they have no flats
        const allProperties = allManagedHouses.map(house => {
            const existingProperty = propertiesWithTenants.find(p => p._id.toString() === house._id.toString());
            if (existingProperty) {
                return existingProperty;
            }
            // Return property with empty flats array if no flats found
            return {
                _id: house._id,
                name: house.name || 'Unnamed Property',
                address: house.address || 'No address provided',
                managerId: house.managerId,
                flats: [],
                stats: {
                    totalFlats: 0,
                    occupied: 0,
                    vacant: 0
                }
            };
        });
        res.status(200).json({
            success: true,
            data: {
                properties: allProperties,
                summary: {
                    totalProperties: allManagedHouses.length,
                    totalFlats: flats.length,
                    totalOccupied: flats.filter(f => f.tenantId).length,
                    totalVacant: flats.filter(f => !f.tenantId).length
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManagedProperties = getManagedProperties;
const getDashboardStats = async (req, res, next) => {
    try {
        const managerId = req.user.id;
        // Get all house IDs managed by this manager in a single query
        const houseIds = (await property_model_1.House.find({ managerId }).select('_id').lean())
            .map(house => house._id);
        // Get all flat IDs in parallel with count
        const [flats, flatsCount] = await Promise.all([
            property_model_1.Flat.find({
                $or: [
                    { managerId },
                    { houseId: { $in: houseIds } }
                ]
            }).select('_id tenantId').lean(),
            property_model_1.Flat.countDocuments({
                $or: [
                    { managerId },
                    { houseId: { $in: houseIds } }
                ]
            })
        ]);
        const flatIds = flats.map(flat => flat._id);
        const tenantIds = flats.map(flat => flat.tenantId).filter(Boolean);
        // Execute all counts in parallel for better performance
        const [tenantsCount, pendingPayments, approvedPayments, rejectedPayments, pendingExpenses, approvedExpenses, rejectedExpenses, recentPayments, recentExpenses] = await Promise.all([
            // Tenant count (more accurate using distinct tenant IDs)
            tenant_model_1.default.countDocuments({ _id: { $in: tenantIds } }),
            // Payment stats
            payment_model_1.default.countDocuments({ managerId, status: 'pending' }),
            payment_model_1.default.countDocuments({ managerId, status: 'approved' }),
            payment_model_1.default.countDocuments({ managerId, status: 'rejected' }),
            // Expense stats
            expense_model_1.default.countDocuments({ managerId, status: 'pending' }),
            expense_model_1.default.countDocuments({ managerId, status: 'approved' }),
            expense_model_1.default.countDocuments({ managerId, status: 'rejected' }),
            // Recent payments with optimized projection
            payment_model_1.default.find({ managerId })
                .sort('-createdAt')
                .limit(5)
                .select('amount status paymentDate dueDate description tenantId flatId houseId')
                .populate([
                { path: 'tenantId', select: 'name' },
                { path: 'flatId', select: 'number' },
                { path: 'houseId', select: 'name' }
            ])
                .lean(),
            // Recent expenses with optimized projection
            expense_model_1.default.find({ managerId })
                .sort('-createdAt')
                .limit(5)
                .select('amount status expenseDate description flatId houseId')
                .populate([
                { path: 'flatId', select: 'number' },
                { path: 'houseId', select: 'name' }
            ])
                .lean()
        ]);
        res.status(200).json({
            success: true,
            data: {
                propertyCounts: {
                    houses: houseIds.length,
                    flats: flatsCount,
                    tenants: tenantsCount
                },
                paymentStats: {
                    pending: pendingPayments,
                    approved: approvedPayments,
                    rejected: rejectedPayments,
                    total: pendingPayments + approvedPayments + rejectedPayments
                },
                expenseStats: {
                    pending: pendingExpenses,
                    approved: approvedExpenses,
                    rejected: rejectedExpenses,
                    total: pendingExpenses + approvedExpenses + rejectedExpenses
                },
                recentActivity: {
                    payments: recentPayments.map(p => ({
                        id: p._id,
                        amount: p.amount,
                        status: p.status,
                        paymentDate: p.paymentDate,
                        dueDate: p.dueDate,
                        description: p.description,
                        tenantId: p.tenantId,
                        flatId: p.flatId,
                        houseId: p.houseId
                    })),
                    expenses: recentExpenses.map(e => ({
                        id: e._id,
                        amount: e.amount,
                        status: e.status,
                        expenseDate: e.expenseDate,
                        description: e.description,
                        flatId: e.flatId,
                        houseId: e.houseId
                    }))
                }
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getDashboardStats = getDashboardStats;
const getManagedTenants = async (req, res, next) => {
    try {
        // First get all properties managed by this manager
        const managedHouses = await property_model_1.House.find({ managerId: req.user.id })
            .select('_id name address')
            .lean();
        // Get all flats in these properties with populated tenant info
        const managedFlats = await property_model_1.Flat.find({
            $or: [
                { managerId: req.user.id },
                { houseId: { $in: managedHouses.map(h => h._id) } }
            ]
        })
            .populate({
            path: 'tenantId',
            select: 'name email phonenumber  emergencyContact rentAmount leaseStartDate leaseEndDate status',
            populate: {
                path: 'user',
                select: 'name email phonenumber '
            }
        })
            .populate({
            path: 'houseId',
            select: 'name address'
        })
            .lean();
        // Filter out flats with tenants and get their IDs
        const flatsWithTenants = managedFlats.filter(flat => flat.tenantId);
        const tenantIds = flatsWithTenants.map(flat => flat.tenantId._id);
        // Get payment info for all tenants in one query
        const lastPayments = await payment_model_1.default.aggregate([
            { $match: { tenantId: { $in: tenantIds } } },
            { $sort: { paymentDate: -1 } },
            {
                $group: {
                    _id: "$tenantId",
                    lastPaymentDate: { $first: "$paymentDate" },
                    lastPaymentAmount: { $first: "$amount" },
                    lastPaymentStatus: { $first: "$status" }
                }
            }
        ]);
        // Map payment info for quick lookup
        const paymentMap = new Map(lastPayments.map(payment => [payment._id.toString(), payment]));
        // Prepare the response data
        const tenantsData = flatsWithTenants.map(flat => {
            var _a, _b, _c, _d, _e, _f;
            const tenant = flat.tenantId;
            const paymentInfo = paymentMap.get(tenant._id.toString()) || {};
            const nextPaymentDate = tenant.leaseStartDate
                ? calculateNextPaymentDate(tenant.leaseStartDate, tenant.rentAmount)
                : null;
            return {
                id: tenant._id,
                name: ((_a = tenant.user) === null || _a === void 0 ? void 0 : _a.name) || tenant.name,
                email: ((_b = tenant.user) === null || _b === void 0 ? void 0 : _b.email) || tenant.email,
                phone: ((_c = tenant.user) === null || _c === void 0 ? void 0 : _c.phonenumber) || tenant.phone,
                property: {
                    id: ((_d = flat.houseId) === null || _d === void 0 ? void 0 : _d._id) || '',
                    name: ((_e = flat.houseId) === null || _e === void 0 ? void 0 : _e.name) || 'Unknown Property',
                    address: (_f = flat.houseId) === null || _f === void 0 ? void 0 : _f.address
                },
                unit: {
                    id: flat._id,
                    number: flat.number,
                },
                leaseInfo: {
                    start: tenant.leaseStartDate,
                    end: tenant.leaseEndDate,
                    rentAmount: tenant.rentAmount,
                    status: tenant.status
                },
                paymentInfo: {
                    lastPayment: paymentInfo.lastPaymentDate || null,
                    lastAmount: paymentInfo.lastPaymentAmount || null,
                    lastStatus: paymentInfo.lastPaymentStatus || 'none',
                    nextPayment: nextPaymentDate,
                    paymentStatus: getPaymentStatus(paymentInfo.lastPaymentDate, nextPaymentDate, paymentInfo.lastPaymentStatus)
                },
                emergencyContact: tenant.emergencyContact,
            };
        });
        res.status(200).json({
            success: true,
            count: tenantsData.length,
            data: tenantsData,
            summary: {
                totalProperties: managedHouses.length,
                totalUnits: managedFlats.length,
                occupiedUnits: tenantsData.length,
                vacantUnits: managedFlats.length - tenantsData.length
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getManagedTenants = getManagedTenants;
// Get single tenant details with payment history
//  GET /api/managers/tenants/:id
const getTenantDetails = async (req, res, next) => {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        const manager = await manager_model_1.default.findOne({ userId: req.user.id });
        if (!manager) {
            return next(new errorResponse_1.ErrorResponse('Manager not found', 404));
        }
        // Find the tenant and populate user info
        const tenant = await tenant_model_1.default.findById(req.params.id)
            .populate('user', 'name email phone');
        if (!tenant) {
            return next(new errorResponse_1.ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
        }
        // Find the flat that this tenant occupies
        const flat = await property_model_1.Flat.findOne({ tenantId: tenant._id })
            .populate({
            path: 'houseId',
            select: 'name address managerId'
        });
        // Verify that the manager has access to this tenant's property
        if (flat && flat.houseId && ((_a = flat.houseId.managerId) === null || _a === void 0 ? void 0 : _a.toString()) !== req.user.id) {
            return next(new errorResponse_1.ErrorResponse('Not authorized to access this tenant', 403));
        }
        const payments = await payment_model_1.default.find({ tenantId: tenant._id })
            .sort('-paymentDate')
            .populate([
            { path: 'flatId', select: 'number' },
            { path: 'houseId', select: 'name' }
        ]);
        const nextPaymentDate = tenant.leaseStartDate
            ? calculateNextPaymentDate(tenant.leaseStartDate, tenant.rentAmount)
            : null;
        const tenantData = {
            id: tenant._id,
            name: ((_b = tenant.user) === null || _b === void 0 ? void 0 : _b.name) || tenant.name,
            email: ((_c = tenant.user) === null || _c === void 0 ? void 0 : _c.email) || tenant.email,
            phone: ((_d = tenant.user) === null || _d === void 0 ? void 0 : _d.phonenumber) || tenant.phone,
            property: ((_e = flat === null || flat === void 0 ? void 0 : flat.houseId) === null || _e === void 0 ? void 0 : _e.name) || 'Unknown Property',
            propertyAddress: ((_f = flat === null || flat === void 0 ? void 0 : flat.houseId) === null || _f === void 0 ? void 0 : _f.address) || 'Unknown Address',
            propertyId: ((_g = flat === null || flat === void 0 ? void 0 : flat.houseId) === null || _g === void 0 ? void 0 : _g._id) || null,
            unit: (flat === null || flat === void 0 ? void 0 : flat.number) || 'Unknown Unit',
            unitId: (flat === null || flat === void 0 ? void 0 : flat._id) || null,
            leaseStart: tenant.leaseStartDate,
            leaseEnd: tenant.leaseEndDate,
            rentAmount: tenant.rentAmount,
            status: tenant.status,
            nextPayment: nextPaymentDate,
            paymentHistory: payments,
            emergencyContact: tenant.emergencyContact,
            createdAt: tenant.createdAt
        };
        res.status(200).json({
            success: true,
            data: tenantData
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getTenantDetails = getTenantDetails;
