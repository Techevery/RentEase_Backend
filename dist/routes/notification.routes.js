"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const notification_controller_1 = require("../controllers/notification.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
router.route('/')
    .get(notification_controller_1.getNotifications);
router.put('/:id/read', notification_controller_1.markNotificationAsRead);
router.put('/read-all', notification_controller_1.markAllNotificationsAsRead);
router.delete('/:id', notification_controller_1.deleteNotification);
exports.default = router;
