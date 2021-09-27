import type Koa from "koa";
import type { Adapter } from "./adapter.js";
import { Cookie } from "./adapter/cookie.js";
import { External } from "./adapter/external.js";
import { Options, ParsedOptions, parseOptions } from "./options.js";
import { Session } from "./session.js";

export function session(app: Koa, options: Options): Koa.Middleware {
  return sessionImpl(app, parseOptions(options));
}

function sessionImpl(app: Koa, options: ParsedOptions): Koa.Middleware {
  const session = async (
    ctx: Koa.ExtendableContext,
    next: Koa.Next,
  ): Promise<void> => {
    const adapter = makeAdapter(ctx);
    await adapter.load();
    if (options.autoStart) {
      adapter.start();
    }
    ctx.session = new Session(adapter);
    await next();
    await adapter.commit();
  };
  Object.defineProperty(session, "name", {
    value: "session",
  });
  return session;

  function makeAdapter({ cookies }: Koa.ExtendableContext): Adapter {
    if (options.store === "cookie") {
      return new Cookie(cookies, options);
    } else {
      return new External(cookies, options);
    }
  }
}