import { Hono } from 'hono'
import { pinoLogger } from './middlewares/logger'
import { authRoutes } from './routes/auth';
import eventsRoutes from './routes/events';
import { ticketRoutes } from './routes/tickets';
import { invitationRoutes } from './routes/invitation';


export function createRouter() {
    return new OpenAPIHono<AppBindings>({
      strict: false,
      defaultHook,
    });
  }
  
  export default function createApp() {
    const app = createRouter();
    app.use(serveEmojiFavicon("📝"));
    app.use(pinoLogger());
  
    app.notFound(notFound);
    app.onError(onError);
    return app;
  }

// const app = new Hono()

// app.use(pinoLogger())
// const apiRoutes = app.basePath('/api').route("/auth", authRoutes).route("/events", eventsRoutes).route("/invitations", invitationRoutes).route("/tickets", ticketRoutes)

// export default app
// export type ApiRoutes = typeof apiRoutes