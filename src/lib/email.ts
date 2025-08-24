import nodemailer, { Transporter } from 'nodemailer'

// Type definitions
export interface EmailConfig {
  host: string
  port: number
  secure: boolean
  auth: {
    user: string
    pass: string
  }
}

export interface BaseEmailOptions {
  from: string
  to: string
  subject: string
  html: string
}

export interface Promotion {
  id: string
  title: string
  description: string
  discount: string
  code: string
  expiresAt: Date
  minOrderAmount?: number
  maxDiscount?: number
}

export interface EmailServiceConfig {
  transporter: Transporter
  companyName: string
  companyAddress: string
  frontendUrl: string
  supportEmail: string
  socialLinks: {
    facebook?: string
    twitter?: string
    instagram?: string
    linkedin?: string
  }
}

// Create transporter with type safety
const createEmailTransporter = (): Transporter => {
  const config: EmailConfig = {
    host: process.env.EMAIL_HOST!,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER!,
      pass: process.env.EMAIL_PASS!,
    },
  }

  return nodemailer.createTransport(config)
}

export const transporter = createEmailTransporter()

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error('Email transporter error:', error)
  } else {
    console.log('Email server is ready to take our messages')
  }
})

// Base email template
export const getBaseTemplate = (content: string, title: string, companyName = 'YourStore'): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
        }
        .email-container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            background: linear-gradient(135deg, #ea7b2a 0%,rgb(162, 118, 75) 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        .content {
            padding: 30px 20px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: linear-gradient(135deg, #ea7b2a 0%, #764ba2 100%);
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: bold;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: translateY(-2px);
        }
        .order-details {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
        }
        .social-links {
            margin-top: 20px;
        }
        .social-links a {
            margin: 0 10px;
            color: #ea7b2a;
            text-decoration: none;
        }
        @media only screen and (max-width: 600px) {
            .email-container {
                margin: 0 10px;
            }
            .header h1 {
                font-size: 24px;
            }
            .content {
                padding: 20px 15px;
            }
        }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>${companyName}</h1>
            <p>Your trusted online shopping destination</p>
        </div>
        ${content}
        <div class="footer">
            <p>&copy; 2024 ${companyName}. All rights reserved.</p>
            <p>123 Commerce Street, City, State 12345</p>
            <div class="social-links">
                <a href="#" style="color: #667eea;">Facebook</a>
                <a href="#" style="color: #667eea;">Twitter</a>
                <a href="#" style="color: #667eea;">Instagram</a>
            </div>
            <p style="margin-top: 15px; font-size: 12px; color: #666;">
                If you no longer wish to receive these emails, you can 
                <a href="#" style="color: #667eea;">unsubscribe here</a>
            </p>
        </div>
    </div>
</body>
</html>
`