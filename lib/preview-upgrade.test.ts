import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import http from "node:http";
import { describe, it } from "node:test";
import { proxyUpgrade } from "../scripts/local-preview.mjs";

describe("preview websocket proxy", () => {
  it("forwards an upgrade to the internal port and rewrites host like HTTP", async () => {
    const source = readFileSync("scripts/local-preview.mjs", "utf8");
    assert.match(source, /v4\.on\("upgrade", onUpgrade\)/);
    assert.match(source, /v6\.on\("upgrade", onUpgrade\)/);
    const upstream = http.createServer();
    const seen: { host?: string; url?: string; origin?: string | string[]; payload?: string } = {};
    upstream.on("upgrade", (req, socket) => {
      seen.host = req.headers.host;
      seen.url = req.url;
      seen.origin = req.headers.origin;
      socket.write("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n");
      socket.on("data", (chunk) => {
        seen.payload = chunk.toString("utf8");
        socket.end("hmr-ok");
      });
    });
    const proxy = http.createServer();
    await listen(upstream);
    const internalPort = (upstream.address() as { port: number }).port;
    proxy.on("upgrade", (req, socket, head) => {
      proxyUpgrade(req, socket, head, { internalPort });
    });
    await listen(proxy);
    const proxyPort = (proxy.address() as { port: number }).port;
    try {
      const result = await new Promise<{ status: number; body: string }>((resolve, reject) => {
        const client = http.request({
          host: "127.0.0.1",
          port: proxyPort,
          path: "/_next/hmr",
          agent: false,
          headers: {
            connection: "Upgrade",
            upgrade: "websocket",
            host: "alpha.preview.localhost:43200",
            origin: "http://alpha.preview.localhost:43200",
            "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
            "sec-websocket-version": "13",
          },
        });
        const timer = setTimeout(() => {
          client.destroy();
          reject(new Error("upgrade timed out"));
        }, 1000);
        client.on("upgrade", (res, socket) => {
          const chunks: Buffer[] = [];
          socket.on("data", (chunk) => chunks.push(chunk));
          socket.on("end", () => {
            clearTimeout(timer);
            resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
          });
          socket.write("ping");
        });
        client.on("error", (error) => {
          clearTimeout(timer);
          reject(error);
        });
        client.end();
      });
      assert.equal(result.status, 101);
      assert.equal(result.body, "hmr-ok");
      assert.equal(seen.payload, "ping");
      assert.equal(seen.host, `127.0.0.1:${internalPort}`);
      assert.equal(seen.url, "/_next/hmr");
      assert.equal(seen.origin, "http://alpha.preview.localhost:43200");
    } finally {
      proxy.closeAllConnections();
      upstream.closeAllConnections();
      proxy.close();
      upstream.close();
      proxy.unref();
      upstream.unref();
    }
  });
});

function listen(server: http.Server) {
  return new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
}
