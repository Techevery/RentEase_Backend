"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPaymentReminderEmail = exports.sendManagerInviteEmail = exports.sendPasswordResetEmail = exports.sendEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async (options) => {
    // Create a transporter
    const transporter = nodemailer_1.default.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
        },
    });
    // Define email options
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: options.email,
        subject: options.subject,
        html: options.message,
    };
    // Send email
    await transporter.sendMail(mailOptions);
};
exports.sendEmail = sendEmail;
const sendPasswordResetEmail = async (email, resetToken, name) => {
    const resetUrl = `${process.env.FRONTEND_URL}/resetpassword${resetToken}`;
    const message = `
    <p>Hello ${name},</p>
    <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
    <p>Please click on the following link to complete the process:</p>
    <a href="${resetUrl}" target="_blank">Reset Password</a>
    <p>This link will be valid for only 10 minutes.</p>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;
    await (0, exports.sendEmail)({
        email,
        subject: 'Password Reset Request',
        message,
    });
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
const sendManagerInviteEmail = async (email, password, name) => {
    const loginUrl = `${process.env.FRONTEND_URL}/login`;
    const message = `
    <p>Hello ${name},</p>
    <p>You have been registered as a manager in the Property Rent Management System.</p>
    <p>Your login credentials are:</p>
    <p>Email: ${email}</p>
    <p>Password: ${password}</p>
    <p>Please login at: <a href="${loginUrl}" target="_blank">Login Page</a></p>
    <p>It is recommended that you change your password after the first login.</p>
  `;
    await (0, exports.sendEmail)({
        email,
        subject: 'Property Manager Account Creation',
        message,
    });
};
exports.sendManagerInviteEmail = sendManagerInviteEmail;
const sendPaymentReminderEmail = async (email, name, dueDate, amount, propertyName, flatNumber) => {
    const formattedDate = dueDate.toLocaleDateString();
    const message = `
    <p>Hello ${name},</p>
    <p>This is a friendly reminder that your rent payment of ${amount.toFixed(2)} for ${propertyName}, Flat ${flatNumber} is due on ${formattedDate}.</p>
    <p>Please ensure timely payment to avoid any inconvenience.</p>
    <p>If you have already made the payment, please disregard this reminder.</p>
  `;
    await (0, exports.sendEmail)({
        email,
        subject: 'Rent Payment Reminder',
        message,
    });
};
exports.sendPaymentReminderEmail = sendPaymentReminderEmail;
