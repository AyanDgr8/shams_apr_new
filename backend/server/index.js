// index.js
import express from "express";
import dotenv from "dotenv";

dotenv.config();
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import https from "https";
import cors from "cors";
import { fetchAPRData, fetchAgentStatusData } from "./controller/cdrController.js";

/* ---------- Core Setup ---------- */
const app = express();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/* ---------- CORS ---------- */
const allowedOrigins = [
  "http://localhost:3000",
  "https://localhost:3000",
  "http://localhost:4000",
  "https://localhost:4000",
  "http://10.5.50.245:9999",
  "http://localhost:9999",
  "http://10.5.51.50:9999",
  "https://10.5.51.50:9999",
  "http://172.20.10.3:9999",
  "https://172.20.10.3:9999",
  "http://10.5.48.100:9999",
  "https://10.5.50.245:9999",
  "https://localhost:9999",
  "http://217.145.69.251:9999",
  "https://217.145.69.251:9999",
  "http://192.168.150.146:9999",
  "https://192.168.150.146:9999",
  "https://217.145.69.239:9999",
  "http://217.145.69.239:9999",
  "https://login.messgeblast.com",
  "http://login.messgeblast.com",
  "https://login.messgeblast.com:9999",
  "http://login.messgeblast.com:9999",
  "https://crm.voicemeetme.net",
  "http://crm.voicemeetme.net",
  "https://crm.voicemeetme.net:9999",
  "http://crm.voicemeetme.net:9999",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow curl/mobile
      if (allowedOrigins.includes(origin)) return callback(null, true);
      console.warn(`[CORS] Blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- Routes ---------- */
app.get("/", (_req, res) => res.json({ message: "Server is running..." }));
app.get("/api/apr", fetchAPRData);
app.get("/api/agent_status", fetchAgentStatusData);

/* ---------- Error Middlewares ---------- */
const notFoundHandler = (_req, res, _next) => {
res.status(404).json({ error: "Not Found" });
};
const errorHandler = (err, _req, res, _next) => {
console.error(err);
res.status(500).json({ error: err.message || "Internal Server Error" });
};
app.use(notFoundHandler);
app.use(errorHandler);

/* ---------- SSL Certificate Management (robust) ---------- */
function resolvePathMaybeRelative(p) {
if (!p) return null;
return path.isAbsolute(p) ? p : path.join(__dirname, p);
}

function readFileIfExists(p) {
try {
return fs.readFileSync(p);
} catch {
return null;
}
}

function loadSSLOptions() {
const CERT_DIR = process.env.SSL_DIR
? resolvePathMaybeRelative(process.env.SSL_DIR)
: path.join(__dirname, "ssl");

const keyPath =
resolvePathMaybeRelative(process.env.SSL_KEY) ||
path.join(CERT_DIR, "privkey.pem");

const certPath =
resolvePathMaybeRelative(process.env.SSL_CERT) ||
path.join(CERT_DIR, "fullchain.pem");

const caPath = resolvePathMaybeRelative(process.env.SSL_CA) || null;

const key = readFileIfExists(keyPath);
const cert = readFileIfExists(certPath);
const ca = caPath ? readFileIfExists(caPath) : null;

if (key && cert) {
console.log(`[TLS] Loaded key: ${keyPath}`);
console.log(`[TLS] Loaded cert: ${certPath}`);
if (ca) console.log(`[TLS] Loaded ca: ${caPath}`);

return {
key,
cert,
...(ca ? { ca } : {}),
passphrase: process.env.SSL_PASSPHRASE || undefined,
// Uncomment to enforce modern TLS:
// minVersion: "TLSv1.2",
// ciphers: tls.DEFAULT_CIPHERS, // or a strict list
};
}

if (!key) console.error(`[TLS] Missing key at ${keyPath}`);
if (!cert) console.error(`[TLS] Missing cert at ${certPath}`);
if (caPath && !ca) console.error(`[TLS] Missing ca at ${caPath}`);

return null;
}

/* ---------- Server Setup ---------- */
const PORT = Number(process.env.PORT || 9086);
const HOST = process.env.HOST || "0.0.0.0";
const PUBLIC_URL=process.env.PUBLIC_URL;
// Explicit toggle (true/false). Example: USE_HTTPS=true
const USE_HTTPS = String(process.env.USE_HTTPS || "").toLowerCase() === "true";

let server;
if (USE_HTTPS) {
const sslOptions = loadSSLOptions();
if (sslOptions) {
server = https.createServer(sslOptions, app);
server.listen(PORT, HOST, () => {
console.log(`[Srv] HTTPS server listening on https://${HOST}:${PORT}`);
});
} else {
console.warn("[Srv] SSL not available; starting HTTP instead");
server = http.createServer(app);
server.listen(PORT, HOST, () => {
console.log(`[Srv] HTTP server listening on http://${HOST}:${PORT}`);
});
}
} else {
server = http.createServer(app);
server.listen(PORT, HOST, () => {
console.log(`[Srv] HTTP server listening on ${PUBLIC_URL}`);
});
}

server.on("error", (err) => {
console.error("[Srv] Server error:", err);
if (err.code === "EADDRINUSE") console.error(`[Srv] Port ${PORT} is already in use.`);
else if (err.code === "EACCES")
console.error(`[Srv] Permission denied. Port ${PORT} may require sudo/admin privileges.`);
process.exit(1);
});

/* ---------- Global Error Handlers ---------- */
process.on("uncaughtException", (err) => {
console.error("[Srv] Uncaught Exception:", err);
});
process.on("unhandledRejection", (reason) => {
console.error("[Srv] Unhandled Rejection:", reason);
});