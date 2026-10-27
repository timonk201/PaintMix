import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  calculateMixing,
  createChartData,
  DEFAULT_INPUTS,
  getExperiments,
  optimizeMixing,
} from "./model.js";

const app = express();
const port = Number(process.env.PORT) || 3000;
const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(currentDirectory, "..");

app.use(express.json({ limit: "10kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok" });
});

app.post("/api/simulate", (request, response) => {
  try {
    const result = calculateMixing(request.body);
    response.json({
      result,
      charts: createChartData(result),
    });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.post("/api/optimize", (request, response) => {
  try {
    response.json({ result: optimizeMixing(request.body) });
  } catch (error) {
    response.status(400).json({ error: error.message });
  }
});

app.get("/api/experiments", (_request, response) => {
  response.json({ experiments: getExperiments() });
});

app.use(express.static(path.join(projectDirectory, "dist")));
app.get("/{*path}", (_request, response, next) => {
  response.sendFile(path.join(projectDirectory, "dist", "index.html"), (error) => {
    if (error) next();
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`PaintMix is running at http://127.0.0.1:${port}`);
});
