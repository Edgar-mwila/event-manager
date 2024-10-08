import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { authRoutes } from './routes/auth';
import eventsRoutes from './routes/events';
import { ticketRoutes } from './routes/tickets';
import { invitationRoutes } from './routes/invitation';
const app = new Hono()

app.use(logger())
const apiRoutes = app.basePath('/api').route("/auth", authRoutes).route("/events", eventsRoutes).route("/events", invitationRoutes).route("/events", ticketRoutes)

export default app
export type ApiRoutes = typeof apiRoutes