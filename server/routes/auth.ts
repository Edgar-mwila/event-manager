import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";
import { createRouter } from "../libs/create-app";
import { getUser, kindeClient, sessionManager } from '../kinde';

const authRouter = createRouter();

const userSchema = z.object({
    user: z.any()
  });

// Login route
authRouter.openapi(
  createRoute({
    tags: ["Auth"],
    method: "get",
    path: "/login",
    responses: {
      [HttpStatusCodes.OK]: {
        description: "Redirect to login page",
      },
    },
  }),
  async (c) => {
    const loginUrl = await kindeClient.login(sessionManager(c));
    return c.redirect(loginUrl.toString());
  }
);

// Register route
authRouter.openapi(
  createRoute({
    tags: ["Auth"],
    method: "get",
    path: "/register",
    responses: {
      [HttpStatusCodes.OK]: {
        description: "Redirect to registration page",
      },
    },
  }),
  async (c) => {
    const registerUrl = await kindeClient.register(sessionManager(c));
    return c.redirect(registerUrl.toString());
  }
);

// Callback route
authRouter.openapi(
  createRoute({
    tags: ["Auth"],
    method: "get",
    path: "/callback",
    responses: {
      [HttpStatusCodes.OK]: {
        description: "Handle redirect and redirect to app",
      },
    },
  }),
  async (c) => {
    const url = new URL(c.req.url);
    await kindeClient.handleRedirectToApp(sessionManager(c), url);
    return c.redirect("/");
  }
);

// Logout route
authRouter.openapi(
  createRoute({
    tags: ["Auth"],
    method: "get",
    path: "/logout",
    responses: {
      [HttpStatusCodes.OK]: {
        description: "Redirect to logout page",
      },
    },
  }),
  async (c) => {
    const logoutUrl = await kindeClient.logout(sessionManager(c));
    return c.redirect(logoutUrl.toString());
  }
);

// Me route
authRouter.openapi(
  createRoute({
    tags: ["Auth"],
    method: "get",
    path: "/me",
    middleware: getUser,
    responses: {
      [HttpStatusCodes.OK]: {
        content: {
          "application/json": {
            schema: userSchema,
          },
        },
        description: "User Information",
      },
    },
  }),
  async (c) => {
    const user = c.var.user;
    return c.json({ user }, HttpStatusCodes.OK);
  }
);

export default authRouter;