const express = require("express"); // Import express
const https = require("https");
const app = require("#configs/app");
const { appLogger: logger } = require("#configs/logger");
const generateEvents = require("#events/generateEvents");

generateEvents();

// Create a simple HTTP server to bind to a port
const server = express();
server.get("/", (req, res) => res.send("Service is running")); // Health check endpoint

// Get the port from environment or default to 3000
const PORT = process.env.PORT || 3000;

// Add a health check route
server.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

// Start listening on the port
server.listen(PORT, () => {
  logger.log(`HTTP server is listening on port ${PORT}`);
});

async function shutdown() {
  const timeout = setTimeout(() => {
    logger.error("Stop server timed out, force exit");
    process.exit(1);
  }, 3000);
  logger.log("Stopping server ...");
  await app.stop();
  clearTimeout(timeout);
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
process.on("SIGBREAK", shutdown);
process.on("unhandledRejection", (error) => {
  logger.error("Unhandled rejection: ", error);
  process.exit(1);
});

(async () => {
  // Start your app
  await app.start();

  logger.log("⚡️ Bolt app is running!");
  logger.log("log level: ", logger.level);
})();

const SELF_URL = process.env.SELF_URL; // set this in Render env vars to your own service URL

if (SELF_URL) {
  setInterval(() => {
    https.get(SELF_URL + "/healthz", (res) => {
      logger.log("Self pinged /healthz: " + res.statusCode);
    }).on("error", (err) => {
      logger.error("Failed self ping: ", err.message);
    });
  }, 1000 * 60 * 9); // every 9 minutes
}