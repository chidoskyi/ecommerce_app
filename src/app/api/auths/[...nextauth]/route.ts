import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'
import type { NextAuthOptions } from 'next-auth'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })

        if (!user || !user.password) {
          return null
        }

        const isValidPassword = await comparePassword(credentials.password, user.password)
        if (!isValidPassword) {
          return null
        }

        if (user.status !== 'ACTIVE') {
          return null
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        })

        return {
          id: user.id,
          email: user.email,
          name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : user.email,
          image: user.avatar,
          role: user.role,
          emailVerified: user.emailVerified,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.emailVerified = user.emailVerified
        token.userId = user.id
      }
      
      // Handle Google OAuth sign-in
      if (account?.provider === 'google' && user) {
        // Update user's email verification status for Google users
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            emailVerified: true,
            lastLoginAt: new Date()
          }
        })
        token.emailVerified = true
      }
      
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string
        session.user.role = token.role as string
        session.user.emailVerified = token.emailVerified as boolean
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google') {
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser) {
            // User exists, allow sign in
            return true
          } else {
            // Create new user for Google OAuth
            const newUser = await prisma.user.create({
              data: {
                email: user.email!,
                firstName: profile?.given_name || user.name?.split(' ')[0] || '',
                lastName: profile?.family_name || user.name?.split(' ').slice(1).join(' ') || '',
                avatar: user.image,
                emailVerified: true,
                status: 'ACTIVE',
                role: 'USER'
              }
            })
            user.id = newUser.id
            return true
          }
        } catch (error) {
          console.error('Error during Google sign in:', error)
          return false
        }
      }
      return true
    }
  },
  pages: {
    signIn: '/login',
    signUp: '/register',
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }