// Run this script to fix the database
// Create a file: scripts/fix-unitprices.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixUnitPrices() {
  try {
    // Use raw MongoDB query to fix the data
    const result = await prisma.$runCommandRaw({
      update: 'products',
      updates: [
        {
          q: { 
            $or: [
              { unitPrices: { $type: 'object', $ne: [] } }, // Find objects that aren't arrays
              { unitPrices: { $exists: false } } // Find missing unitPrices
            ]
          },
          u: { 
            $set: { unitPrices: [] } // Set to empty array
          },
          multi: true
        }
      ]
    })
    
    console.log('Fixed unitPrices field:', result)
  } catch (error) {
    console.error('Error fixing unitPrices:', error)
  } finally {
    await prisma.$disconnect()
  }
}

fixUnitPrices()