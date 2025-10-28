// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma'
import { ContactFormData } from '@/types';
import EmailService from '@/lib/emailService';

const emailService = new EmailService()

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation function
function validateContactForm(data: Record<string, string | number | boolean | object | undefined>): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!data.fullName || typeof data.fullName !== 'string' || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters long');
  }

  if (!data.email || typeof data.email !== 'string' || !emailRegex.test(data.email)) {
    errors.push('Please provide a valid email address');
  }

  if (!data.subject || typeof data.subject !== 'string' || data.subject.trim().length < 3) {
    errors.push('Subject must be at least 3 characters long');
  }

  if (!data.message || typeof data.message !== 'string' || data.message.trim().length < 10) {
    errors.push('Message must be at least 10 characters long');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export async function POST(req: NextRequest) {
  console.log('📧 Contact form POST request received')
  
  try {
    // Test database connection first
    console.log('🔍 Testing database connection...')
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    const body = await req.json()
    console.log('📝 Request body received:', JSON.stringify(body, null, 2))
    
    const { fullName, email, subject, message } = body

    // Validate the form data
    console.log('✔️ Validating form data...')
    const validation = validateContactForm(body)
    if (!validation.isValid) {
      console.log('❌ Validation failed:', validation.errors)
      return NextResponse.json(
        {
          success: false,
          message: 'Validation failed',
          data: { errors: validation.errors }
        },
        { status: 400 }
      )
    }
    console.log('✅ Validation passed')

    // Clean the data
    const cleanData: ContactFormData = {
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      subject: subject.trim(),
      message: message.trim()
    }
    
    console.log('🧹 Cleaned data:', JSON.stringify(cleanData, null, 2))

    // Save to database using Prisma
    console.log('💾 Attempting to create contact record...')
    const savedContact = await prisma.contact.create({
      data: {
        fullName: cleanData.fullName,
        email: cleanData.email,
        subject: cleanData.subject,
        message: cleanData.message, 
      }
    })

    console.log('✅ Contact form saved to database:', JSON.stringify(savedContact, null, 2))
    
    // Send emails
    console.log('📧 Sending contact form emails...')
    try {
      const emailResults = await emailService.sendContactFormNotification(cleanData);
      console.log('✅ Contact form emails sent successfully');
      if (emailResults && 'id' in emailResults) {
        console.log('Admin email ID:', emailResults.id);
      } else {
        console.log('Admin email ID not available in results:', emailResults);
      }
    } catch (emailError) {
      console.error('⚠️ Email sending failed, but contact was saved:', emailError);
      // Don't fail the entire request if emails fail
      // The contact is still saved in the database
    }
    
    return NextResponse.json(
      {
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        data: { 
          id: savedContact.id,
          submittedAt: savedContact.submittedAt.toISOString()
        }
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('❌ Contact form error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available')
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while processing your request. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  } finally {
    // Ensure we disconnect from the database
    await prisma.$disconnect()
    console.log('🔌 Database disconnected')
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json(
    { success: false, message: 'Method not allowed' },
    { status: 405 }
  )
}