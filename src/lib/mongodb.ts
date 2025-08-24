// This file is deprecated - we're using Prisma ORM instead of MongoDB native client
// Keeping this file for backward compatibility, but all new code should use Prisma

import { prisma } from './prisma'

// Re-export prisma as the default export for any legacy imports
export default prisma

// Export prisma client for direct usage
export { prisma }
