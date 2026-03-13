// ============================================
// Tapix API - Email Service
// ============================================

import nodemailer from 'nodemailer';
import { config } from '../config';

interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
}

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
  });
};

// Send email
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: config.smtp.from,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
};

// Send welcome email
export const sendWelcomeEmail = async (email: string, firstName: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { font-size: 28px; font-weight: bold; color: #1a1a1a; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px 0; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Tapix</div>
        </div>
        <div class="content">
          <h2>Welcome to Tapix, ${firstName}!</h2>
          <p>Thank you for creating an account with us. We're excited to have you as part of our community.</p>
          <p>Start exploring our collection of premium electronics and smart accessories for your tech lifestyle.</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}" class="button">Start Shopping</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Tapix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Tapix',
    html,
  });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  resetToken: string
): Promise<boolean> => {
  const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { font-size: 28px; font-weight: bold; color: #1a1a1a; }
        .content { padding: 20px 0; }
        .button { display: inline-block; padding: 12px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px 0; text-align: center; font-size: 12px; color: #666; }
        .warning { color: #e74c3c; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Tapix</div>
        </div>
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p class="warning">This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email or contact support if you have concerns.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Tapix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Reset Your Password - Tapix',
    html,
  });
};

// Send order confirmation email
export const sendOrderConfirmationEmail = async (
  email: string,
  orderNumber: string,
  orderDetails: {
    items: Array<{ title: string; quantity: number; price: number }>;
    subtotal: number;
    shipping: number;
    discount: number;
    total: number;
  }
): Promise<boolean> => {
  const itemsHtml = orderDetails.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { font-size: 28px; font-weight: bold; color: #1a1a1a; }
        .content { padding: 20px 0; }
        .order-number { background: #f5f5f5; padding: 15px; border-radius: 4px; text-align: center; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { text-align: left; padding: 10px; border-bottom: 2px solid #1a1a1a; }
        .totals { margin-top: 20px; }
        .totals td { padding: 5px 10px; }
        .grand-total { font-size: 18px; font-weight: bold; }
        .button { display: inline-block; padding: 12px 24px; background: #1a1a1a; color: white; text-decoration: none; border-radius: 4px; }
        .footer { padding: 20px 0; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Tapix</div>
        </div>
        <div class="content">
          <h2>Order Confirmed!</h2>
          <p>Thank you for your order. We've received it and will process it shortly.</p>
          <div class="order-number">
            Order Number: <strong>${orderNumber}</strong>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th style="text-align: center;">Qty</th>
                <th style="text-align: right;">Price</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <table class="totals" style="width: 50%; margin-left: auto;">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">$${orderDetails.subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Shipping:</td>
              <td style="text-align: right;">$${orderDetails.shipping.toFixed(2)}</td>
            </tr>
            ${
              orderDetails.discount > 0
                ? `<tr>
                <td>Discount:</td>
                <td style="text-align: right; color: #27ae60;">-$${orderDetails.discount.toFixed(2)}</td>
              </tr>`
                : ''
            }
            <tr class="grand-total">
              <td>Total:</td>
              <td style="text-align: right;">$${orderDetails.total.toFixed(2)}</td>
            </tr>
          </table>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${config.frontendUrl}/orders" class="button">View Order</a>
          </p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Tapix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: `Order Confirmed - ${orderNumber}`,
    html,
  });
};

// Send newsletter subscription confirmation
export const sendNewsletterConfirmation = async (email: string): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px 0; }
        .logo { font-size: 28px; font-weight: bold; color: #1a1a1a; }
        .content { padding: 20px 0; }
        .footer { padding: 20px 0; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">Tapix</div>
        </div>
        <div class="content">
          <h2>You're Subscribed!</h2>
          <p>Thank you for subscribing to our newsletter. You'll be the first to know about:</p>
          <ul>
            <li>Exclusive deals and offers</li>
            <li>New product launches</li>
            <li>Tips and guides for your tech lifestyle</li>
          </ul>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} Tapix. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: 'Welcome to Tapix Newsletter',
    html,
  });
};

// Forward contact message to company email
export const forwardContactMessage = async (
  name: string,
  email: string,
  phone: string | undefined,
  subject: string,
  message: string
): Promise<boolean> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #666; }
        .message { background: #f5f5f5; padding: 15px; border-radius: 4px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>New Contact Form Submission</h2>
        <div class="field">
          <div class="label">Name:</div>
          <div>${name}</div>
        </div>
        <div class="field">
          <div class="label">Email:</div>
          <div>${email}</div>
        </div>
        ${
          phone
            ? `<div class="field">
          <div class="label">Phone:</div>
          <div>${phone}</div>
        </div>`
            : ''
        }
        <div class="field">
          <div class="label">Subject:</div>
          <div>${subject}</div>
        </div>
        <div class="message">
          <div class="label">Message:</div>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: config.companyEmail,
    subject: `Contact Form: ${subject}`,
    html,
  });
};

// Notify company of new newsletter subscription
export const notifyNewSubscriber = async (email: string): Promise<boolean> => {
  return sendEmail({
    to: config.companyEmail,
    subject: 'New Newsletter Subscription',
    html: `<p>A new user has subscribed to the newsletter: <strong>${email}</strong></p>`,
  });
};
