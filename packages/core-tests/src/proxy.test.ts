import { request } from "@fastr/client";
import { start } from "@fastr/client-testlib";
import { Application } from "@fastr/core";
import test, { registerCompletionHandler } from "ava";

registerCompletionHandler(() => {
  process.exit();
});

test("detect remote host and proto", async (t) => {
  // Arrange.

  const app = new Application(null, { behindProxy: true });
  app.use((ctx) => {
    ctx.response.body = `${ctx.request.origin}`;
    ctx.response.type = "text/plain";
  });

  const server = start(app.callback());

  {
    // Act.

    const res = await request.use(server).GET("/").send();

    // Assert.

    t.is(res.status, 200);
    t.regex(await res.body.text(), /http:\/\/\[::]:\d+/);
  }

  {
    // Act.

    const res = await request
      .use(server)
      .GET("/")
      .header("X-Forwarded-Host", "host1:123")
      .header("X-Forwarded-Proto", "http")
      .send();

    // Assert.

    t.is(res.status, 200);
    t.is(await res.body.text(), "http://host1:123");
  }
});
