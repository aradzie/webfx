import { Readable } from "node:stream";
import { request } from "@fastr/client";
import { start } from "@fastr/client-testlib";
import test, { registerCompletionHandler } from "ava";

registerCompletionHandler(() => {
  process.exit();
});

test("handle connection refused", async (t) => {
  await t.throwsAsync(
    request({
      url: "http://127.0.0.1:1/",
      method: "GET",
    }),
    {
      name: "Error",
      code: "ECONNREFUSED",
      message: "connect ECONNREFUSED 127.0.0.1:1",
    },
  );
});

test("handle request aborted", async (t) => {
  // Arrange.

  const server = start((req, res) => {
    res.write("payload\n");
    res.write("payload\n");
    res.write("payload\n");
    req.destroy();
  });
  const req = request.use(server);

  // Assert.

  await t.throwsAsync(
    req({
      url: "/test",
      method: "POST",
      body: "payload\n".repeat(1000),
    }),
    {
      name: "Error",
      code: "ECONNRESET",
      message: "socket hang up",
    },
  );
});

test("handle response aborted", async (t) => {
  // Arrange.

  const server = start((req, res) => {
    res.write("payload\n");
    res.write("payload\n");
    res.write("payload\n");
    res.destroy();
  });
  const req = request.use(server);

  // Assert.

  await t.throwsAsync(
    req({
      url: "/test",
      method: "POST",
      body: "payload\n".repeat(1000),
    }),
    {
      name: "Error",
      code: "ECONNRESET",
      message: "socket hang up",
    },
  );
});

test("handle invalid content encoding", async (t) => {
  // Arrange.

  const server = start((req, res) => {
    res.setHeader("Content-Encoding", "invalid");
    res.write("payload\n");
    res.write("payload\n");
    res.write("payload\n");
    res.end();
  });
  const req = request.use(server);

  // Assert.

  await t.throwsAsync(
    req({
      url: "/test",
      method: "GET",
    }),
    {
      name: "HttpError [400]",
      message: "Invalid content encoding [invalid]",
    },
  );
});

test("handle malformed content encoding", async (t) => {
  // Arrange.

  const server = start((req, res) => {
    res.setHeader("Content-Encoding", "gzip");
    res.write("malformed gzip payload\n");
    res.write("malformed gzip payload\n");
    res.write("malformed gzip payload\n");
    res.end();
  });
  const req = request.use(server);

  // Act.

  const response = await req({
    url: "/test",
    method: "GET",
  });

  // Assert.

  await t.throwsAsync(response.body.text(), {
    name: "HttpError [400]",
    message: "Invalid gzip data",
  });
});

test("handle send body error", async (t) => {
  // Arrange.

  const server = start((req, res) => {
    res.end();
  });
  const req = request.use(server);
  const error = new Error("omg");

  // Assert.

  await t.throwsAsync(
    req({
      url: "/test",
      method: "GET",
      body: new Readable({
        read(): void {
          this.emit("error", error);
        },
      }),
    }),
    {
      is: error,
    },
  );
  await t.throwsAsync(
    req({
      url: "/test",
      method: "GET",
      body: new Readable({
        read(): void {
          this.destroy(error);
        },
      }),
    }),
    {
      is: error,
    },
  );
});
