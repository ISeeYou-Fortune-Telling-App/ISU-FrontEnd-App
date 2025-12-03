/* eslint-disable no-console */
const fs = require("fs");
const os = require("os");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");
const envPath = path.join(projectRoot, ".env");

const ensureEnvExists = () => {
  if (!fs.existsSync(envPath)) {
    console.warn("[update-local-ip] .env not found; skipping IP update.");
    return false;
  }
  return true;
};

const isRemoteUrl = (url) => {
  // Skip updating if the URL is a remote/production URL (not local IP or localhost)
  if (!url) return false;
  const trimmed = url.trim();
  // Check for ngrok, production domains, or any non-local URL
  if (trimmed.includes("ngrok") || trimmed.includes(".dev") || trimmed.includes(".com") || trimmed.includes(".io")) {
    return true;
  }
  // Check if it's NOT a local address pattern
  const localPatterns = [/localhost/i, /127\.0\.0\.\d+/, /10\.0\.2\.2/, /192\.168\.\d+\.\d+/, /10\.\d+\.\d+\.\d+/];
  return !localPatterns.some((pattern) => pattern.test(trimmed));
};

const getLocalIPv4 = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
};

const updateEnvFile = () => {
  if (!ensureEnvExists()) {
    return;
  }

  const current = fs.readFileSync(envPath, "utf8");
  const lines = current.split(/\r?\n/);

  // Check if any existing URL is a remote/production URL - if so, skip auto-update
  const existingApiUrl = lines.find((line) => line.startsWith("EXPO_PUBLIC_API_BASE_URL="));
  if (existingApiUrl) {
    const value = existingApiUrl.split("=")[1];
    if (isRemoteUrl(value)) {
      console.log("[update-local-ip] Remote URL detected, skipping local IP update.");
      return;
    }
  }

  const ip = getLocalIPv4();

  const url = (port) => `http://${ip}:${port}`;
  const updates = {
    EXPO_PUBLIC_API_BASE_URL: url(8080),
    EXPO_PUBLIC_CHAT_BASE_URL: url(8081),
    EXPO_PUBLIC_SOCKET_PORT: "8082",
    EXPO_PUBLIC_SOCKET_URL: url(8082),
    EXPO_PUBLIC_CHAT_PORT: "8081",
  };

  const keys = Object.keys(updates);
  const seen = new Set();
  const nextLines = lines.map((line) => {
    const index = line.indexOf("=");
    if (index === -1) {
      return line;
    }
    const key = line.slice(0, index).trim();
    if (keys.includes(key)) {
      seen.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Only add AI base if missing; do NOT override existing user setting
  if (!lines.some((line) => line.startsWith("EXPO_PUBLIC_AI_BASE_URL="))) {
    nextLines.push(`EXPO_PUBLIC_AI_BASE_URL=${url(8081)}`);
  }

  keys.forEach((key) => {
    if (!seen.has(key)) {
      nextLines.push(`${key}=${updates[key]}`);
    }
  });

  fs.writeFileSync(envPath, nextLines.join("\n"));
  console.log(`[update-local-ip] Updated local endpoints to ${ip}`);
};

updateEnvFile();
