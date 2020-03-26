import {
  discardBody,
  guessContentType,
  TEXT_TYPE,
  toPayload,
} from "@fastr/body";
import { statusMessage } from "@fastr/status";
import { Container } from "@sosimple/inversify";
import { EventEmitter } from "events";
import { type IncomingMessage, type ServerResponse } from "http";
import { type Http2ServerRequest, type Http2ServerResponse } from "http2";
import { compose } from "./compose.js";
import { Context } from "./context.js";
import { inspectError } from "./errors.js";
import {
  type AnyMiddleware,
  type DefaultState,
  type Handler,
  type HandlerClass,
  isHandlerClass,
  isHandlerObject,
  type Middleware,
  type Next,
} from "./middleware.js";
import { type ProxyOptions, Request } from "./request.js";
import { Response } from "./response.js";

export interface ApplicationOptions extends ProxyOptions {
  readonly defaultState: DefaultState;
}

export class Application<StateT = unknown> extends EventEmitter {
  private readonly middleware: Middleware[] = [];

  readonly container: Container;
  readonly options: ApplicationOptions;

  constructor(
    container: Container | null = null,
    {
      behindProxy = false,
      defaultState = Object.create(null),
    }: Partial<ApplicationOptions> = {},
  ) {
    super();
    this.container =
      container ??
      new Container({
        autoBindInjectable: true,
      });
    this.options = {
      behindProxy,
      defaultState,
    };
  }

  useAll(middleware: readonly AnyMiddleware[]): this {
    for (const item of middleware) {
      this.use(item as any);
    }
    return this;
  }

  use<NewStateT = unknown>(
    middleware: HandlerClass<StateT & NewStateT>,
  ): Application<StateT & NewStateT>;
  use<NewStateT = unknown>(
    middleware: Handler<StateT & NewStateT>,
  ): Application<StateT & NewStateT>;
  use<NewStateT = unknown>(
    middleware: Middleware<StateT & NewStateT>,
  ): Application<StateT & NewStateT>;
  use(middleware: AnyMiddleware): this {
    this.middleware.push(this.toMiddleware(middleware as any));
    return this;
  }

  callback(): (
    req: IncomingMessage | Http2ServerRequest,
    res: ServerResponse | Http2ServerResponse,
  ) => void {
    const middleware = compose(this.middleware);

    return (_req, _res) => {
      const req = _req as IncomingMessage;
      const res = _res as ServerResponse;

      const handleError = (err: Error): void => {
        this.handleError(req, res, err);
      };

      req.on("error", handleError);
      res.on("error", handleError);

      const exec = async (): Promise<void> => {
        let ctx: Context;

        try {
          ctx = this.createContext(req, res);
        } catch (err) {
          handleError(err as Error);
          return;
        }

        try {
          await middleware(ctx, async () => {
            if (!ctx.response.hasStatus && !ctx.response.hasBody) {
              ctx.response.status = 404;
              ctx.response.body = "Not found";
            }
          });
        } catch (err) {
          handleError(err as Error);
          return;
        }

        try {
          await respond(ctx, req, res);
        } catch (err) {
          handleError(err as Error);
          return;
        }
      };

      exec().catch((err) => {
        console.error(err); // Error in the error handler.
      });
    };
  }

  createContext(req: IncomingMessage, res: ServerResponse): Context {
    return new Context(
      this.container.createChild(),
      new Request(req, this.options),
      new Response(res),
      this.createState(),
    );
  }

  createState(): DefaultState {
    return Object.assign(Object.create(null), {
      ...this.options.defaultState,
      params: Object.create(null),
    });
  }

  toMiddleware(middleware: HandlerClass): Middleware;
  toMiddleware(middleware: Handler): Middleware;
  toMiddleware(middleware: Middleware): Middleware;
  toMiddleware(middleware: AnyMiddleware): Middleware {
    if (isHandlerClass(middleware)) {
      return this.useHandlerClass(middleware);
    }

    if (isHandlerObject(middleware)) {
      return this.useHandlerObject(middleware);
    }

    if (typeof middleware === "function") {
      return middleware as Middleware;
    }

    throw new TypeError();
  }

  protected handleError(
    req: IncomingMessage,
    res: ServerResponse,
    err: Error,
  ): void {
    if ("code" in err && err.code === "ECONNRESET") {
      req.destroy();
      res.destroy();
      return;
    }

    const { name, message, status, expose } = inspectError(err);
    if (res.writable && !res.headersSent) {
      for (const name of res.getHeaderNames()) {
        res.removeHeader(name);
      }
      res.statusCode = status;
      const body = expose
        ? `${name}: ${message}`
        : `${status} - ${statusMessage(status)}`;
      res.setHeader("Connection", "close");
      res.setHeader("Content-Type", TEXT_TYPE);
      res.setHeader("Content-Length", Buffer.byteLength(body));
      res.end(body);
    }

    req.destroy();
    res.destroy();

    if (!expose) {
      // Server-side non-recoverable error.
      if (this.listenerCount("error") > 0) {
        this.emit("error", err);
      } else {
        console.error(err);
      }
    }
  }

  private useHandlerClass(target: HandlerClass): Middleware {
    return (ctx: Context, next: Next): void | Promise<void> => {
      return ctx.container.get(target).handle(ctx, next);
    };
  }

  private useHandlerObject(target: Handler): Middleware {
    return (ctx: Context, next: Next): void | Promise<void> => {
      return target.handle(ctx, next);
    };
  }

  get [Symbol.toStringTag](): string {
    return "Application";
  }
}

function respond(
  ctx: Context,
  req: IncomingMessage,
  res: ServerResponse,
): void {
  if (!res.writable || ctx.response.hijacked) {
    discardBody(ctx.response.body);
    return;
  }

  const [body, contentType] = guessContentType(
    ctx.response.body,
    (res.getHeader("Content-Type") as string | null) ?? null,
  );

  const payload = toPayload(body);

  if (contentType != null) {
    res.setHeader("Content-Type", contentType);
  } else {
    res.removeHeader("Content-Type");
  }

  for (const [name, value] of payload.headers) {
    if (value != null) {
      res.setHeader(name, String(value));
    } else {
      res.removeHeader(name);
    }
  }

  if (req.method === "HEAD" || res.statusCode === 304) {
    discardBody(ctx.response.body);
    res.end();
  } else {
    payload.send(res);
  }
}
