import authRoutes from './routes/auth';
import configureOpenAPI from "../configure-open-api";
import createApp from "./libs/create-app";
import invitationsRouter from './routes/invitation';
import ticketsRouter from './routes/tickets';
import eventsRouter from './routes/events';

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

export type AppType = typeof routes[number];

export default app;