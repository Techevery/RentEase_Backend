"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePasswordResetToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not defined');
    }
    return jsonwebtoken_1.default.sign({
        id: user._id,
        role: user.role,
    }, secret, {
        expiresIn: '1d',
    });
};
exports.generateToken = generateToken;
const generatePasswordResetToken = () => {
    const token = crypto_1.default.randomBytes(20).toString('hex');
    const hashedToken = crypto_1.default
        .createHash('sha256')
        .update(token)
        .digest('hex');
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    return { token, hashedToken, expires };
};
exports.generatePasswordResetToken = generatePasswordResetToken;
