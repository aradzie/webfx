import { Context, Request, Response } from "@fastr/core";
import { Container } from "@fastr/invert";
import test from "ava";
import { controller } from "./controller.js";
import { http } from "./handler.js";

test("validate metadata", (t) => {
  t.throws(
    () => {
      @controller("")
      class Controller {}
    },
    {
      message: "Invalid path ''",
    },
  );
  t.throws(
    () => {
      @controller("x")
      class Controller {}
    },
    {
      message: "Invalid path 'x'",
    },
  );
  t.throws(
    () => {
      @controller("/x/")
      class Controller {}
    },
    {
      message: "Invalid path '/x/'",
    },
  );
  t.notThrows(() => {
    @controller("/x")
    class Controller {}
  });
});

test("inject arguments", (t) => {
  t.notThrows(() => {
    @controller("/x")
    class Controller {
      @http.get("/1")
      handler1() {}
      @http.get("/2")
      handler2(arg: Container) {}
      @http.get("/3")
      handler3(arg: Context) {}
      @http.get("/4")
      handler4(arg: Request) {}
      @http.get("/5")
      handler5(arg: Response) {}
    }
  });
});
