import test from "node:test";
import assert from "node:assert/strict";

import {
  calculateMixing,
  createChartData,
  getExperiments,
  optimizeMixing,
  validateInputs,
} from "./model.js";

test("homogeneity grows with time and stirring speed", () => {
  const base = { volume: 100, speed: 300, duration: 10, intensity: 1, target: 90 };

  assert.ok(
    calculateMixing({ ...base, duration: 12 }).homogeneity >
      calculateMixing(base).homogeneity,
  );
  assert.ok(
    calculateMixing({ ...base, speed: 400 }).homogeneity >
      calculateMixing(base).homogeneity,
  );
});

test("inputs outside the assignment limits are rejected", () => {
  assert.throws(
    () =>
      validateInputs({
        volume: 100,
        speed: 501,
        duration: 10,
        intensity: 1,
        target: 90,
      }),
    /от 100 до 500/,
  );
});

test("optimizer meets the target with lower energy than the default regime", () => {
  const inputs = { volume: 100, speed: 300, duration: 10, intensity: 1, target: 95 };
  const optimized = optimizeMixing(inputs);
  const current = calculateMixing(inputs);

  assert.ok(optimized.meetsTarget);
  assert.ok(optimized.energy < current.energy);
});

test("optimizer reports an unreachable target instead of returning a false result", () => {
  assert.throws(
    () =>
      optimizeMixing({
        volume: 1000,
        speed: 300,
        duration: 10,
        intensity: 0.1,
        target: 99.9,
      }),
    /Не удалось достичь/,
  );
});

test("charts and experiments are calculated from the mixing model", () => {
  const inputs = { volume: 100, speed: 300, duration: 10, intensity: 1, target: 90 };
  const charts = createChartData(inputs);
  const experiments = getExperiments();

  assert.equal(charts.time.labels.length, 20);
  assert.equal(charts.speed.labels.length, 17);
  assert.equal(experiments.length, 5);
  assert.ok(experiments[0].homogeneity < experiments[4].homogeneity);
});
