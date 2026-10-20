// server/index.mjs
// Lightweight Node HTTP server proxy for Yahoo Finance
import http from "node:http";
import { handleApiRequest } from "./apiHandler.mjs";

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (req, res) => {
  const handled = await handleApiRequest(req, res);
  if (!handled) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Endpoint not found", path: req.url }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `🚀 Yahoo Finance Proxy Server running at http://${HOST}:${PORT}`,
  );
  console.log(`   - Health check:  http://${HOST}:${PORT}/api/health`);
  console.log(`   - Instruments:   http://${HOST}:${PORT}/api/instruments`);
  console.log(`   - Futures Curve: http://${HOST}:${PORT}/api/curve`);
  console.log(
    `   - Bars:          http://${HOST}:${PORT}/api/bars?instrument=brent-dec26&timeframe=5m`,
  );
  console.log(
    `   - Options:       http://${HOST}:${PORT}/api/options?symbol=BNO`,
  );
});
