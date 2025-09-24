"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const landlord_controller_1 = require("../controllers/landlord.controller");
const landlord_dashboard_controller_1 = require("../controllers/landlord.dashboard.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = express_1.default.Router();
router.use(auth_middleware_1.protect);
router.use((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD));
router.get('/dashboard', landlord_dashboard_controller_1.getDashboardStats);
router.route('/managers')
    .get(landlord_controller_1.getManagers)
    .post(validation_middleware_1.validateCreateManager, landlord_controller_1.createManager);
router.route('/managers/:id')
    .get(landlord_controller_1.getManager)
    .put(landlord_controller_1.updateManager)
    .delete(landlord_controller_1.deleteManager);
exports.default = router;
