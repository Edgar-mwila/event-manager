import authRoutes from './routes/auth';
import configureOpenAPI from "../configure-open-api";
import createApp from "./libs/create-app";
import invitationsRouter from './routes/invitation';
import ticketsRouter from './routes/tickets';
import eventsRouter from './routes/events';
import { serveStatic } from 'hono/bun';

const app = createApp();

configureOpenAPI(app);

const routes = [
  authRoutes,
  invitationsRouter,
  ticketsRouter,
  eventsRouter
] as const;

routes.forEach((route) => {
  app.route("/api/", route);
});

app.get('*', serveStatic({ root: './ed-events/dist' }))
app.get('*', serveStatic({ path: './ed-events/dist/index.html' }))

export type AppType = typeof routes[number];

export default app;