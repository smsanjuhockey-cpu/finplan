import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: string
      suspendedAt?: Date | null
      email?: string | null
      name?: string | null
      image?: string | null
    }
  }
  interface User {
    role?: string
    suspendedAt?: Date | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: string
    suspendedAt?: Date | null
  }
}
