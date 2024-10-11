import serveEmojiFavicon from '../middlewares/favicon';
import { pinoLogger } from '../middlewares/logger'
import { notFound, onError } from "stoker/middlewares";
import { OpenAPIHono } from '@hono/zod-openapi';
import { defaultHook } from 'stoker/openapi';


export function createRouter() {
    return new OpenAPIHono({
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
