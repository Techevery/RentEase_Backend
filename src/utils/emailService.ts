import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  message: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Create a transporter
  const transporter = nodemailer.createTransport({
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

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  name: string
): Promise<void> => {

  const resetUrl = `${process.env.FRONTEND_URL}/reset-password/reset-password/${resetToken} || https://rentease.homeyhost.ng/reset-password/reset-password/${resetToken}`;

  const message = `
    <p>Hello ${name},</p>
    <p>You are receiving this email because you (or someone else) has requested the reset of a password.</p>
    <p>Please click on the following link to complete the process:</p>
    <a href="${resetUrl}" target="_blank">Reset Password</a>
    <p>This link will be valid for only 10 minutes.</p>
    <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
  `;

  await sendEmail({
    email,
    subject: 'Password Reset Request',
    message,
  });
};

export const sendManagerInviteEmail = async (
  email: string,
  password: string,
  name: string
): Promise<void> => {
  const loginUrl = `${process.env.FRONTEND_URL}/login` || 'https://rentease.homeyhost.ng/login';

  const message = `
    <p>Hello ${name},</p>
    <p>You have been registered as a manager in the Property Rent Management System.</p>
    <p>Your login credentials are:</p>
    <p>Email: ${email}</p>
    <p>Password: ${password}</p>
    <p>Please login at: <a href="${loginUrl}" target="_blank">Login Page</a></p>
    <p>It is recommended that you change your password after the first login.</p>
  `;

  await sendEmail({
    email,
    subject: 'Property Manager Account Creation',
    message,
  });
};

export const sendPaymentReminderEmail = async (
  email: string,
  name: string,
  dueDate: Date,
  amount: number,
  propertyName: string,
  flatNumber: string
): Promise<void> => {
  const formattedDate = dueDate.toLocaleDateString();

  const message = `
    <p>Hello ${name},</p>
    <p>This is a friendly reminder that your rent payment of ${amount.toFixed(2)} for ${propertyName}, Flat ${flatNumber} is due on ${formattedDate}.</p>
    <p>Please ensure timely payment to avoid any inconvenience.</p>
    <p>If you have already made the payment, please disregard this reminder.</p>
  `;

  await sendEmail({
    email,
    subject: 'Rent Payment Reminder',
    message,
  });
};