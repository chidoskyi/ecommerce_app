import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { requireAuth, AuthenticatedRequest } from "@/lib/auth";
import { Address } from '@/types';

export const GET = requireAuth(async (request: NextRequest) => {
  try {
       // Get user from the authenticated request
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(`🛍️ GET wishlist for user: ${user.id} (has token: ${!!token})`);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const addresses = await prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(addresses)
  } catch (error) {
    console.error('Get addresses error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const POST = requireAuth(async (request: NextRequest) => {
  try {
     // Get user from the authenticated request
    const user = (request as AuthenticatedRequest).user;

    console.log(`🛍️ GET wishlist for user: ${user.id} (has token: ${!!token})`);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      type = 'SHIPPING',
      firstName,
      lastName,
      address,
      state,
      city,
      country,
      zip,
      phone,
      isDefault = false
    } = await request.json()

    // Validate required fields
    if (!firstName || !lastName || !address || !city || !state || !country || !zip) {
      return NextResponse.json(
        { error: 'First name, last name, address, city, state, country, and zip are required' },
        { status: 400 }
      )
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: user.id, type, isDefault: true },
        data: { isDefault: false }
      })
    }

    const newAddress = await prisma.address.create({
      data: {
        userId: user.id,
        type,
        firstName,
        lastName,
        address,
        state,
        city,
        country,
        zip,
        phone: phone || null,
        isDefault: Boolean(isDefault)
      }
    })

    return NextResponse.json(newAddress, { status: 201 })
  } catch (error) {
    console.error('Create address error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const PUT = requireAuth(async (request: NextRequest) => {
  try {
           // Get user from the authenticated request
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(`🛍️ GET wishlist for user: ${user.id} (has token: ${!!token})`);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const {
      addressId,
      type,
      firstName,
      lastName,
      address,
      state,
      city,
      country,
      zip,
      phone,
      isDefault
    } = await request.json()

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
    }

    // If setting as default, unset other defaults of same type
    if (isDefault) {
      await prisma.address.updateMany({
        where: { 
          userId: user.id, 
          type: type || 'SHIPPING', 
          isDefault: true 
        },
        data: { isDefault: false }
      })
    }

    // Prepare update data (only include provided fields)
    const updateData = {}
    if (type) updateData.type = type
    if (firstName) updateData.firstName = firstName
    if (lastName) updateData.lastName = lastName
    if (address) updateData.address = address
    if (state) updateData.state = state
    if (city) updateData.city = city
    if (country) updateData.country = country
    if (zip) updateData.zip = zip
    if (phone !== undefined) updateData.phone = phone || null
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault)

    const updatedAddress = await prisma.address.update({
      where: { id: addressId, userId: user.id },
      data: updateData
    })

    return NextResponse.json(updatedAddress)
  } catch (error) {
    console.error('Update address error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})

export const DELETE = requireAuth(async (request: NextRequest) => {
  try {
    const user = (request as any).user;
    const token = (request as any).token;

    console.log(`🛍️ GET wishlist for user: ${user.id} (has token: ${!!token})`);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const addressId = searchParams.get('addressId')

    if (!addressId) {
      return NextResponse.json({ error: 'Address ID is required' }, { status: 400 })
    }

    await prisma.address.delete({
      where: { id: addressId, userId: user.id }
    })

    return NextResponse.json({ message: 'Address deleted successfully' })
  } catch (error) {
    console.error('Delete address error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})