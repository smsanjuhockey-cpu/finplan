/**
 * tRPC client setup for the browser.
 * Use `api` to call tRPC procedures from React components.
 */
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@/server/api/root'

export const api = createTRPCReact<AppRouter>()
