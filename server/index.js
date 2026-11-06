import express from "express";
import { spawn } from "node:child_process";
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
const predictorPath = path.join(projectDirectory, "python", "predictor.py");

app.use(express.json({ limit: "10kb" }));

function runPythonModel(action, inputs) {
  return new Promise((resolve, reject) => {
    const pythonCommand =
      process.env.PYTHON || (process.platform === "win32" ? "py" : "python3");
    const pythonArguments = process.env.PYTHON
      ? [predictorPath, action]
      : process.platform === "win32"
        ? ["-3", predictorPath, action]
        : [predictorPath, action];
    const child = spawn(pythonCommand, pythonArguments, {
      cwd: projectDirectory,
      env: { ...process.env, PYTHONIOENCODING: "utf-8" },
      windowsHide: true,
      stdio: ["pipe", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      child.kill();
      rejectRequest(
        Object.assign(
          new Error("Python-модель не ответила за отведённое время."),
          { statusCode: 504 },
        ),
      );
    }, 15000);

    function rejectRequest(error) {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    }

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
      if (Buffer.byteLength(stdout) > 1024 * 1024) {
        child.kill();
        rejectRequest(
          Object.assign(new Error("Ответ Python-модели слишком большой."), {
            statusCode: 502,
          }),
        );
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      const message =
        error.code === "ENOENT"
          ? "Python 3 не найден. Установите Python 3.10+ или задайте переменную PYTHON."
          : `Не удалось запустить Python-модель: ${error.message}`;
      rejectRequest(Object.assign(new Error(message), { statusCode: 503 }));
    });
    child.on("close", (code) => {
      if (settled) return;
      clearTimeout(timeout);

      let result;
      try {
        result = JSON.parse(stdout);
      } catch {
        rejectRequest(
          Object.assign(
            new Error(
              stderr.trim() ||
                "Python-модель вернула некорректный ответ. Проверьте установку Python.",
            ),
            { statusCode: 502 },
          ),
        );
        return;
      }

      if (code !== 0 || result.error) {
        rejectRequest(
          Object.assign(new Error(result.error || stderr.trim()), {
            statusCode: code === 2 ? 400 : 500,
          }),
        );
        return;
      }

      settled = true;
      resolve(result);
    });
    child.stdin.on("error", (error) => {
      rejectRequest(
        Object.assign(new Error(`Не удалось отправить данные Python-модели: ${error.message}`), {
          statusCode: 502,
        }),
      );
    });
    child.stdin.end(JSON.stringify(inputs));
  });
}

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

app.post("/api/predict", async (request, response) => {
  try {
    response.json(await runPythonModel("predict", request.body));
  } catch (error) {
    response.status(error.statusCode || 500).json({ error: error.message });
  }
});

app.post("/api/intelligent-control", async (request, response) => {
  try {
    response.json(await runPythonModel("control", request.body));
  } catch (error) {
    response.status(error.statusCode || 500).json({ error: error.message });
  }
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
