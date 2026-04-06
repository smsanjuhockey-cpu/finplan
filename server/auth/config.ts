/**
 * NextAuth v5 configuration for FinPlan.
 * Supports email/password (credentials) + Google OAuth.
 */
import NextAuth from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import bcrypt from 'bcryptjs'
import { db } from '@/server/db/client'

export const { auth, handlers, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
          select: { id: true, email: true, name: true, avatarUrl: true, hashedPassword: true, role: true, suspendedAt: true },
        })

        if (!user?.hashedPassword) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.hashedPassword
        )

        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.avatarUrl,
          role: user.role,
          suspendedAt: user.suspendedAt,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.id = user.id
        // Read role + suspendedAt fresh from DB on every sign-in
        const dbUser = await db.user.findUnique({
          where: { id: user.id as string },
          select: { role: true, suspendedAt: true },
        })
        token.role = dbUser?.role ?? 'user'
        token.suspendedAt = dbUser?.suspendedAt ?? null
      }
      // Handle Google OAuth — create user if first login
      if (account?.provider === 'google' && token.email) {
        const existingUser = await db.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, suspendedAt: true },
        })
        if (!existingUser) {
          const newUser = await db.user.create({
            data: {
              email: token.email,
              name: token.name ?? null,
              avatarUrl: token.picture ?? null,
              emailVerified: new Date(),
            },
            select: { id: true, role: true },
          })
          token.id = newUser.id
          token.role = newUser.role
          token.suspendedAt = null
        } else {
          token.id = existingUser.id
          token.role = existingUser.role
          token.suspendedAt = existingUser.suspendedAt
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token.id && session.user) {
        session.user.id = token.id as string
        session.user.role = (token.role as string) ?? 'user'
        session.user.suspendedAt = (token.suspendedAt as Date | null) ?? null
      }
      return session
    },
  },
})
