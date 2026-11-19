import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { describe, it } from "node:test";
import { createElement } from "react";

const { JSDOM } = createRequire(import.meta.url)("jsdom") as {
  JSDOM: new (html: string, options?: { url?: string }) => {
    window: {
      document: Document;
      HTMLElement: typeof HTMLElement;
      HTMLFormElement: typeof HTMLFormElement;
      HTMLInputElement: typeof HTMLInputElement;
      Node: typeof Node;
    };
  };
};

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://127.0.0.1/" });
const { window } = dom;
for (const [key, value] of Object.entries({
  window,
  document: window.document,
  HTMLElement: window.HTMLElement,
  HTMLFormElement: window.HTMLFormElement,
  HTMLInputElement: window.HTMLInputElement,
  Node: window.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
}

describe("form reset when a page is hidden", () => {
  it("clears typed text and draft state when Activity hides the page without unmounting it", async () => {
    const React = await import("react");
    const { createRoot } = await import("react-dom/client");
    const { Form, useResetWhenHidden } = await import("../components/form");
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    let resets = 0;

    function Draft() {
      useResetWhenHidden(() => {
        resets += 1;
      });
      return createElement(Form, null, createElement("input", { name: "email", defaultValue: "" }));
    }

    function Page({ hidden }: { hidden: boolean }) {
      const Activity = React.Activity as unknown as (props: {
        mode: "hidden" | "visible";
        children?: ReturnType<typeof createElement>;
      }) => ReturnType<typeof createElement>;
      return createElement(Activity, { mode: hidden ? "hidden" : "visible" }, createElement(Draft));
    }

    await React.act(async () => {
      root.render(createElement(Page, { hidden: false }));
    });
    const input = host.querySelector("input");
    const form = host.querySelector("form");
    assert.ok(input);
    assert.ok(form);
    input.value = "ada@example.com";

    await React.act(async () => {
      root.render(createElement(Page, { hidden: true }));
    });

    assert.equal(resets, 1);
    assert.equal(input.value, "");
    assert.equal(form.isConnected, true);

    await React.act(async () => {
      root.render(createElement(Page, { hidden: false }));
    });
    assert.equal(resets, 1);
    assert.equal(input.value, "");
    await React.act(async () => {
      root.unmount();
    });
    host.remove();
  });
});
