import type { RouterContext } from "@webfx-middleware/router";
import { controller, http, IPipe, queryParam } from "@webfx/controller";
import test from "ava";
import { Container, injectable } from "inversify";
import { makeHelper } from "./helper.js";

test("should pass through pipes", async (t) => {
  // Arrange.

  @injectable()
  class ParseInt implements IPipe {
    transform(ctx: RouterContext, value: string): any {
      return Number.parseInt(value, 10);
    }
  }

  @injectable()
  @controller()
  class Controller1 {
    @http.get("/")
    query(@queryParam("value", ParseInt) value: number | null) {
      return { type: typeof value, value };
    }
  }

  const container = new Container();
  container.bind(ParseInt).toSelf();
  const { request } = makeHelper({
    container,
    controllers: [Controller1],
  });

  // Act. Assert.

  t.deepEqual(
    await (
      await request //
        .get("/")
        .send()
    ).body.json(),
    {
      type: "object",
      value: null,
    },
  );
  t.deepEqual(
    await (
      await request //
        .get("/?value=123")
        .send()
    ).body.json(),
    {
      type: "number",
      value: 123,
    },
  );
});