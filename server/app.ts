import authRoutes from './routes/auth';
// import eventsRoutes from './routes/events';
// import { ticketRoutes } from './routes/tickets';
// import { invitationRoutes } from './routes/invitation';

// const apiRoutes = app.basePath('/api').route("/auth", authRoutes).route("/events", eventsRoutes).route("/invitations", invitationRoutes).route("/tickets", ticketRoutes)

// export default app
// export type ApiRoutes = typeof apiRoutes

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
  app.route("/", route);
});

export type AppType = typeof routes[number];

export default app;