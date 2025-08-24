import { SentMessageInfo, Transporter } from "nodemailer";
import {
  BaseEmailOptions,
  EmailServiceConfig,
  getBaseTemplate,
  Promotion,
  transporter,
} from "./email";
import { Order, OrderItem } from "@/types/orders";
import { Product } from "@/types/products";
import { CartItem } from "@/types/carts";
import { Address, ContactFormData, Refund } from "./types";
import { User } from "@/types/users";

// Email service class
class EmailService {
  private transporter: Transporter;
  private companyName: string;
  private frontendUrl: string;
  private supportEmail: string;

  constructor(config?: Partial<EmailServiceConfig>) {
    this.transporter = config?.transporter || transporter;
    this.companyName = config?.companyName || "Shop Grocery";
    this.supportEmail = config?.supportEmail || "support@yourcompany.com";
    this.frontendUrl =
      config?.frontendUrl ||
      process.env.FRONTEND_URL ||
      "http://localhost:3000";
    // Verify transporter configuration
    this.verifyConnection();
  }

  // Verify email connection
  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      console.log("✅ Email server is ready to take our messages");
    } catch (error) {
      console.error("❌ Email transporter error:", error);
      console.error(
        "Please check your email configuration in environment variables"
      );
    }
  }

  // Send base email
  private async sendEmail(
    to: string,
    subject: string,
    content: string,
    title: string
  ): Promise<SentMessageInfo> {
    try {
      const html = getBaseTemplate(content, title, this.companyName);
      const mailOptions: BaseEmailOptions = {
        from: `"${this.companyName}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", result.messageId);
      return result;
    } catch (error) {
      console.error("Error sending email:", error);
      throw error;
    }
  }

  // 1. Welcome Email
  async sendWelcomeEmail(user: { 
    email: string; 
    firstName?: string | null; 
    lastName?: string | null;
    // Only include properties actually used in the email template
  }): Promise<SentMessageInfo> {
    // Your implementation
    const content = `
        <div class="content">
          <h2>Welcome to ${this.companyName}, ${user.firstName} ${user.lastName}! 🎉</h2>
          <p>Thank you for joining our community! We're thrilled to have you on board.</p>
          <p>Here's what you can do with your new account:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>Browse thousands of products</li>
            <li>Track your orders in real-time</li>
            <li>Save items to your wishlist</li>
            <li>Get exclusive member discounts</li>
          </ul>
          <div style="text-align: center;">
            <a href="${this.frontendUrl}/products" class="button">Start Shopping</a>
          </div>
          <p>If you have any questions, our customer support team is always here to help!</p>
        </div>
      `;

    return this.sendEmail(
      user.email,
      `Welcome to ${this.companyName}!`,
      content,
      "Welcome"
    );
  }

    // 2. Contact Form Submission - Send to Admin/Support
    async sendContactFormNotification(
      contact: ContactFormData
    ): Promise<SentMessageInfo> {
      const content = `
        <div class="content">
          <h2>New Contact Form Submission 📧</h2>
          <p>You have received a new message through your website's contact form.</p>
          
          <div class="order-details">
            <h3>Contact Details</h3>
            <p><strong>Name:</strong> ${contact.fullName}</p>
            <p><strong>Email:</strong> ${contact.email}</p>
            <p><strong>Subject:</strong> ${contact.subject}</p>
            <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
          </div>
  
          <div class="order-details">
            <h3>Message</h3>
            <p style="white-space: pre-wrap; line-height: 1.6;">${
              contact.message
            }</p>
          </div>
  
          <p style="font-size: 12px; color: #666; margin-top: 20px;">
            This email was automatically generated from your website's contact form.
          </p>
        </div>
      `;
  
      // Send to your support email
      const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_USER;
      return this.sendEmail(
        supportEmail!,
        `New Contact: ${contact.subject}`,
        content,
        "Contact Form Notification"
      );
    }

  // 3. Password Reset
  async sendPasswordResetEmail(
    user: User,
    resetToken: string
  ): Promise<SentMessageInfo> {
    const resetUrl = `${this.frontendUrl}/reset-password?token=${resetToken}`;

    const content = `
        <div class="content">
          <h2>Password Reset Request</h2>
          <p>Hi ${user.firstName} ${user.lastName},</p>
          <p>We received a request to reset your password. Click the button below to create a new password.</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </div>
          <p>This reset link will expire in 1 hour for security reasons.</p>
          <p><strong>If you didn't request this reset, please ignore this email.</strong> Your password will remain unchanged.</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e9ecef;">
          <p style="font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            <a href="${resetUrl}" style="color: #667eea;">${resetUrl}</a>
          </p>
        </div>
      `;

    return this.sendEmail(
      user.email,
      "Password Reset Request",
      content,
      "Password Reset"
    );
  }

  // 4. Order Confirmation
  async sendOrderConfirmation(
    user: User,
    order: Order
  ): Promise<SentMessageInfo> {
    const content = `
        <div class="content">
          <h2>Order Confirmed! 🎉</h2>
          <p>Hi ${user.firstName} ${user.lastName},</p>
          <p>Thank you for your order! We've received your order and are preparing it for shipment.</p>
          
          <div class="order-details">
            <h3>Order Details</h3>
            <p><strong>Order Number:</strong> #${order.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(
              order.createdAt
            ).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> $${order.totalPrice.toFixed(
              2
            )}</p>
            
            <h4 style="margin-top: 20px;">Items Ordered:</h4>
            ${order.items
              .map(
                (item) => `
              <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <p><strong>${item.title}</strong></p>
                <p>Quantity: ${item.quantity} × $${item.price.toFixed(2)} = $${(
                  item.quantity * item.price
                ).toFixed(2)}</p>
              </div>
            `
              )
              .join("")}
            
            <h4 style="margin-top: 20px;">Shipping Address:</h4>
            <p>${order.shippingAddress.address}<br>
               ${order.shippingAddress.city}, ${order.shippingAddress.state} ${
      order.shippingAddress.zip
    }</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${this.frontendUrl}/orders/${
      order.id
    }" class="button">Track Your Order</a>
          </div>
          
          <p>We'll send you another email when your order ships with tracking information.</p>
        </div>
      `;

    return this.sendEmail(
      user.email,
      `Order Confirmation - #${order.orderNumber}`,
      content,
      "Order Confirmation"
    );
  }

  // 8. Refund Processed
  async sendRefundProcessed(
    user: User,
    refund: Refund
  ): Promise<SentMessageInfo> {
    const content = `
        <div class="content">
          <h2>Refund Processed Successfully ✅</h2>
          <p>Hi ${user.firstName} ${user.lastName},</p>
          <p>Your refund has been processed and should appear in your account within 3-5 business days.</p>
          
          <div class="order-details">
            <p><strong>Original Order:</strong> #${refund.orderNumber}</p>
            <p><strong>Refund Amount:</strong> $${refund.amount.toFixed(2)}</p>
            <p><strong>Refund Method:</strong> ${refund.method}</p>
            <p><strong>Processing Date:</strong> ${new Date(
              refund.processedAt
            ).toLocaleDateString()}</p>
            ${
              refund.reason
                ? `<p><strong>Reason:</strong> ${refund.reason}</p>`
                : ""
            }
          </div>
          
          <p>If you have any questions about this refund, please don't hesitate to contact our customer support team.</p>
          
          <div style="text-align: center;">
            <a href="${
              this.frontendUrl
            }/support" class="button">Contact Support</a>
          </div>
        </div>
      `;

    return this.sendEmail(
      user.email,
      `Refund Processed - $${refund.amount.toFixed(2)}`,
      content,
      "Refund Processed"
    );
  }

  // 9. Newsletter Subscription
  async sendNewsletterWelcome(user: User): Promise<SentMessageInfo> {
    const content = `
        <div class="content">
          <h2>Welcome to Our Newsletter! 📧</h2>
          <p>Hi ${user.firstName} ${user.lastName},</p>
          <p>Thank you for subscribing to our newsletter! You're now part of our exclusive community.</p>
          
          <p>Here's what you can expect:</p>
          <ul style="margin: 20px 0; padding-left: 20px;">
            <li>🎯 Exclusive deals and early access to sales</li>
            <li>📱 New product announcements</li>
            <li>💡 Style tips and product recommendations</li>
            <li>🎁 Special birthday and anniversary offers</li>
          </ul>
          
          <div style="text-align: center;">
            <a href="${this.frontendUrl}/products" class="button">Start Shopping</a>
          </div>
          
          <p>We promise to only send you valuable content and never spam your inbox!</p>
        </div>
      `;

    return this.sendEmail(
      user.email,
      "Welcome to Our Newsletter!",
      content,
      "Newsletter Welcome"
    );
  }

  // 10. Promotional Email Template
  async sendPromotionalEmail(
    user: User,
    promotion: Promotion
  ): Promise<SentMessageInfo> {
    const content = `
        <div class="content">
          <h2>Special Offer Just for You! 🎉</h2>
          <p>Hi ${user.firstName} ${user.lastName},</p>
          <p>${promotion.description}</p>
          
          <div class="order-details" style="text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white;">
            <h3 style="color: white; margin-bottom: 10px;">${
              promotion.title
            }</h3>
            <p style="font-size: 24px; font-weight: bold; margin: 10px 0;">${
              promotion.discount
            }</p>
            <p style="font-size: 18px;">Code: <strong>${
              promotion.code
            }</strong></p>
            <p style="font-size: 14px;">Valid until: ${new Date(
              promotion.expiresAt
            ).toLocaleDateString()}</p>
            ${
              promotion.minOrderAmount
                ? `<p style="font-size: 12px;">*Minimum order: $${promotion.minOrderAmount}</p>`
                : ""
            }
          </div>
          
          <div style="text-align: center;">
            <a href="${this.frontendUrl}/products" class="button">Shop Now</a>
          </div>
          
          <p style="text-align: center; font-size: 12px; color: #666;">
            *Terms and conditions apply. Cannot be combined with other offers.
          </p>
        </div>
      `;

    return this.sendEmail(
      user.email,
      `${promotion.title} - Limited Time!`,
      content,
      "Special Offer"
    );
  }

  // Additional utility methods
  async sendCustomEmail(
    user: User,
    subject: string,
    content: string,
    title?: string
  ): Promise<SentMessageInfo> {
    return this.sendEmail(user.email, subject, content, title || subject);
  }

  // Test email connection
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error("Email connection test failed:", error);
      return false;
    }
  }
}

// Export the email service and types
export default EmailService;
export type {
  User,
  Order,
  OrderItem,
  Product,
  CartItem,
  Address,
  EmailServiceConfig,
};
