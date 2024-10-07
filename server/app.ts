import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth';
const app = new Hono()

app.use(logger())
const apiRoutes = app.basePath('/api').route("/auth", authRoutes)

export default app
export type ApiRoutes = typeof apiRoutes