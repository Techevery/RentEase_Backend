"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const tenant_controller_1 = require("../controllers/tenant.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.route('/')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), tenant_controller_1.getTenants)
    .post((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), validation_middleware_1.validateCreateTenant, tenant_controller_1.createTenant);
router.route('/:id')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), tenant_controller_1.getTenant)
    .put((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), tenant_controller_1.updateTenant)
    .delete((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), tenant_controller_1.deleteTenant); // Handles both delete modes via query param
// New deactivation endpoint
router.put('/:id/deactivate', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), tenant_controller_1.deactivateTenant);
// Tenant to flat assignment
router.put('/:id/assign-flat/:flatId', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), tenant_controller_1.assignTenantToFlat);
exports.default = router;
