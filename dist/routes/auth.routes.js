"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_controller_2 = require("../controllers/auth.controller");
const router = express_1.default.Router();
router.post('/register', validation_middleware_1.validateRegistration, auth_controller_1.register);
router.post('/login', validation_middleware_1.validateLogin, auth_controller_1.login);
router.get('/me', auth_middleware_1.protect, auth_controller_1.getMe);
router.post('/forgotpassword', auth_controller_1.forgotPassword);
router.put('/resetpassword/:resettoken', validation_middleware_1.validatePasswordReset, auth_controller_1.resetPassword);
router.put('/updatepassword', auth_middleware_1.protect, auth_controller_1.updatePassword);
router.put('/update-me', auth_middleware_1.protect, auth_controller_2.updateMe);
exports.default = router;
