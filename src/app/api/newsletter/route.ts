import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidEmail } from '@/lib/validation';



// POST - Subscribe to community newsletter
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!isValidEmail(email)) {
        return NextResponse.json(
          { error: 'Please provide a valid email address' },
          { status: 400 }
        );
      }

    // Check if email already exists
    const existingSubscription = await prisma.newsletterSubscription.findUnique({
      where: { email }
    });

    if (existingSubscription) {
      return NextResponse.json(
        { error: 'This email is already subscribed' },
        { status: 409 }
      );
    }

    // Create new subscription
    const subscription = await prisma.newsletterSubscription.create({
      data: {
        email,
        subscribedAt: new Date(),
        active: true
      }
    });

    // Here you would typically:
    // 1. Send a welcome email
    // 2. Add to your email marketing service (Mailchimp, ConvertKit, etc.)
    // 3. Log the subscription

    console.log('New community subscription:', email);

    return NextResponse.json(
      { 
        success: true, 
        message: 'Successfully subscribed to our community!',
        subscription 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Community subscription error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get all subscriptions (for admin purposes)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    const subscriptions = await prisma.newsletterSubscription.findMany({
      skip,
      take: limit,
      orderBy: { subscribedAt: 'desc' },
      where: { active: true }
    });

    const total = await prisma.newsletterSubscription.count({
      where: { active: true }
    });

    return NextResponse.json({
      subscriptions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get subscriptions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}