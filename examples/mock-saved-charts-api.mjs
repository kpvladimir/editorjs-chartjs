import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const examplesDir = dirname(fileURLToPath(import.meta.url));
const seedPath = join(examplesDir, "saved-charts.json");
const dataPath = join(examplesDir, "saved-charts.local.json");
const port = Number(process.env.PORT || 3001);

async function readData() {
  try {
    return JSON.parse(await readFile(dataPath, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
    return JSON.parse(await readFile(seedPath, "utf8"));
  }
}

async function readRequestBody(request) {
  let body = "";
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 2_000_000) {
      throw new Error("Request body is too large");
    }
  }
  return JSON.parse(body);
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

createServer(async (request, response) => {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.url !== "/charts") {
    sendJson(response, 404, { error: "Not found" });
    return;
  }

  try {
    if (request.method === "GET") {
      sendJson(response, 200, await readData());
      return;
    }

    if (request.method === "POST") {
      const payload = await readRequestBody(request);
      if (!payload.name?.trim() || !payload.data || typeof payload.data !== "object") {
        sendJson(response, 400, { error: "Expected { name, data }" });
        return;
      }

      const store = await readData();
      const chart = {
        id: randomUUID(),
        name: payload.name.trim(),
        data: payload.data,
      };
      store.charts.push(chart);
      await writeFile(dataPath, `${JSON.stringify(store, null, 2)}\n`);
      sendJson(response, 201, { chart });
      return;
    }

    sendJson(response, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(response, 400, { error: error.message || "Bad request" });
  }
}).listen(port, () => {
  console.log(`Mock saved charts API: http://localhost:${port}/charts`);
});
