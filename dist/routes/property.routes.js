"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const property_controller_1 = require("../controllers/property.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const user_model_1 = require("../models/user.model");
const validation_middleware_1 = require("../middleware/validation.middleware");
const cloudinary_1 = require("../config/cloudinary");
const cloudinary_2 = require("../config/cloudinary");
const cloudinary_3 = require("../config/cloudinary");
const router = express_1.default.Router();
// Apply protection to all routes
router.use(auth_middleware_1.protect);
// Houses routes
router.route('/houses')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), property_controller_1.getHouses)
    .post((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), cloudinary_1.propertyUpload.array("images", 10), validation_middleware_1.validateCreateHouse, property_controller_1.createHouse, cloudinary_3.deleteFromCloudinary);
router.route('/houses/:id')
    .get((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), property_controller_1.getHouse)
    .put((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), property_controller_1.updateHouse, cloudinary_3.deleteFromCloudinary)
    .delete((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), property_controller_1.deleteHouse);
router.get('/houses/:houseId/tenants', (0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), property_controller_1.getTenantsInHouse);
// Flats routes
router.route('/houses/:houseId/flats')
    .get(property_controller_1.getFlats)
    .post((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), cloudinary_2.unitUpload.array("images", 10), validation_middleware_1.validateCreateFlat, property_controller_1.createFlat, cloudinary_3.deleteFromCloudinary);
router.route('/flats/:id')
    .get(property_controller_1.getFlat)
    .put((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD, user_model_1.UserRole.MANAGER), property_controller_1.updateFlat, cloudinary_3.deleteFromCloudinary)
    .delete((0, auth_middleware_1.authorize)(user_model_1.UserRole.LANDLORD), property_controller_1.deleteFlat);
exports.default = router;
