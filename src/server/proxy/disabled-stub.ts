import net from "node:net";
import type { AppLogger } from "@/server/logging/logger";

const DISABLED_MESSAGE =
  "Proxy Server deaktiviert, bitte Einstellungen anpassen";

const HTTP_RESPONSE =
  "HTTP/1.1 503 Service Unavailable\r\n" +
  "Content-Type: text/plain; charset=utf-8\r\n" +
  `Content-Length: ${Buffer.byteLength(DISABLED_MESSAGE, "utf8")}\r\n` +
  "Connection: close\r\n\r\n" +
  DISABLED_MESSAGE;

interface DisabledStubOptions {
  port: number;
  logger: AppLogger;
}

// Mini-TCP-Listener that takes the place of the full HttpProxyServer when the
// install runs in `operationMode === "legacy"`. Each accepted connection
// receives a single 503 with a plain-text hint and is closed. Keeps the port
// reachable so Prowlarr/Sonarr show a clear error instead of "connection
// refused", which tends to look like a network problem to the user.
export class DisabledProxyStubServer {
  private server: net.Server | null = null;

  constructor(private readonly opts: DisabledStubOptions) {}

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = net.createServer((socket) => {
        socket.setKeepAlive(false);
        socket.once("error", () => socket.destroy());
        socket.write(HTTP_RESPONSE, () => socket.end());
      });
      this.server.on("error", reject);
      this.server.listen(this.opts.port, () => {
        this.opts.logger.info(
          { port: this.opts.port },
          "http-proxy stub listening (operationMode=legacy)",
        );
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    if (!this.server) return;
    await new Promise<void>((resolve) => this.server!.close(() => resolve()));
    this.server = null;
  }
}
