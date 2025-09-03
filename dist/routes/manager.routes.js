"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const manager_controller_1 = require("../controllers/manager.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.use((0, auth_middleware_1.authorize)(user_model_1.UserRole.MANAGER));
router.get('/properties', manager_controller_1.getManagedProperties);
router.get('/tenants', manager_controller_1.getManagedTenants);
router.get('/dashboard', manager_controller_1.getDashboardStats);
exports.default = router;
