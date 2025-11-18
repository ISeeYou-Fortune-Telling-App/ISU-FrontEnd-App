/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");
const examplePath = path.join(projectRoot, ".env.example");

function ensureEnvFile() {
  if (fs.existsSync(envPath)) {
    return;
  }

  if (!fs.existsSync(examplePath)) {
    console.warn("[ensure-env] Missing .env.example; cannot create .env automatically.");
    return;
  }

  fs.copyFileSync(examplePath, envPath);
  console.log("[ensure-env] Created .env from .env.example.");
}

ensureEnvFile();
