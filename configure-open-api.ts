import { apiReference } from "@scalar/hono-api-reference";
import packageJSON from "./package.json" with { type: "json" };
import type { OpenAPIHono } from "@hono/zod-openapi";

type AppOpenAPI = OpenAPIHono

export default function configureOpenAPI(app: AppOpenAPI) {
  app.doc("/doc", {
    openapi: "3.0.0",
    info: {
      version: packageJSON.version,
      title: 'Event Manager API',
      description: 'API for managing events, tickets, and invitations',  
    },
  });

  app.get(
    "/reference",
    apiReference({
      theme: "kepler",
      defaultHttpClient: {
        targetKey: "javascript",
        clientKey: "fetch",
      },
      spec: {
        url: "/doc",
      },
    }),
  );
}