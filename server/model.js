export const DEFAULT_INPUTS = {
  volume: 100,
  speed: 300,
  duration: 10,
  intensity: 1,
  target: 90,
};

const RANGES = {
  volume: { min: 10, max: 1000, label: "Объём смеси" },
  speed: { min: 100, max: 500, label: "Скорость мешалки" },
  duration: { min: 1, max: 20, label: "Время смешивания" },
  intensity: { min: 0.1, max: 3, label: "Интенсивность смешивания" },
  target: { min: 50, max: 99.9, label: "Требуемая однородность" },
};

export function validateInputs(values) {
  const result = {};

  for (const [key, range] of Object.entries(RANGES)) {
    const value = Number(values?.[key]);

    if (!Number.isFinite(value) || value < range.min || value > range.max) {
      throw new Error(
        `${range.label}: введите число от ${range.min} до ${range.max}.`,
      );
    }

    result[key] = value;
  }

  return result;
}

export function calculateMixing(rawInputs) {
  const inputs = validateInputs(rawInputs);
  const timeConstant =
    (4 * Math.sqrt(inputs.volume / 100) * (300 / inputs.speed)) /
    inputs.intensity;
  const homogeneity =
    100 * (1 - Math.exp(-inputs.duration / timeConstant));
  const energy =
    inputs.volume * (inputs.speed / 500) ** 3 * inputs.duration;

  return {
    ...inputs,
    homogeneity,
    energy,
    timeConstant,
    meetsTarget: homogeneity >= inputs.target,
  };
}

export function createChartData(rawInputs) {
  const inputs = validateInputs(rawInputs);
  const byTime = Array.from({ length: 20 }, (_, index) => {
    const duration = index + 1;
    return calculateMixing({ ...inputs, duration }).homogeneity;
  });
  const bySpeed = Array.from({ length: 17 }, (_, index) => {
    const speed = 100 + index * 25;
    return calculateMixing({ ...inputs, speed }).homogeneity;
  });

  return {
    time: {
      labels: Array.from({ length: 20 }, (_, index) => index + 1),
      values: byTime,
    },
    speed: {
      labels: Array.from({ length: 17 }, (_, index) => 100 + index * 25),
      values: bySpeed,
    },
  };
}

export function optimizeMixing(rawInputs) {
  const inputs = validateInputs(rawInputs);
  let best = null;

  for (let speed = 100; speed <= 500; speed += 5) {
    for (let durationStep = 10; durationStep <= 200; durationStep += 1) {
      const duration = durationStep / 10;
      const result = calculateMixing({ ...inputs, speed, duration });

      if (
        result.meetsTarget &&
        (!best ||
          result.energy < best.energy ||
          (result.energy === best.energy && result.speed < best.speed))
      ) {
        best = result;
      }
    }
  }

  if (!best) {
    throw new Error(
      "Не удалось достичь заданной однородности в допустимых пределах. Уменьшите цель или увеличьте интенсивность.",
    );
  }

  return best;
}

export function getExperiments() {
  const scenarios = [
    { name: "Щадящий режим", speed: 100, duration: 5 },
    { name: "Медленное смешивание", speed: 200, duration: 8 },
    { name: "Базовый режим", speed: 300, duration: 10 },
    { name: "Интенсивное смешивание", speed: 400, duration: 12 },
    { name: "Высокая производительность", speed: 500, duration: 15 },
  ];

  return scenarios.map((scenario) =>
    calculateMixing({ ...DEFAULT_INPUTS, ...scenario }),
  );
}
