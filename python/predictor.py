import json
import math
import random
import sys
from statistics import mean, pstdev
from typing import Any


FEATURES = ("temperature", "speed", "duration", "resin_fraction")
RANGES = {
    "temperature": (20.0, 80.0, "Температура"),
    "speed": (100.0, 500.0, "Скорость мешалки"),
    "duration": (1.0, 20.0, "Время смешивания"),
    "resin_fraction": (0.25, 0.75, "Доля смолы"),
}
TRAINING_SEED = 2026
SAMPLE_COUNT = 400


def validate_number(data: dict[str, Any], name: str) -> float:
    value = data.get(name)
    if isinstance(value, bool):
        raise ValueError(f"{name}: ожидается числовое значение.")

    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{name}: ожидается числовое значение.") from None

    if not math.isfinite(number):
        raise ValueError(f"{name}: значение должно быть конечным числом.")

    if name in RANGES:
        minimum, maximum, label = RANGES[name]
        if not minimum <= number <= maximum:
            raise ValueError(
                f"{label}: допустимый диапазон от {minimum:g} до {maximum:g}."
            )

    return number


def validate_inputs(data: Any) -> dict[str, float]:
    if not isinstance(data, dict):
        raise ValueError("Ожидается объект с параметрами процесса.")

    inputs = {name: validate_number(data, name) for name in FEATURES}
    inputs["target_viscosity"] = validate_number(data, "target_viscosity")
    if not 2500 <= inputs["target_viscosity"] <= 10000:
        raise ValueError("Целевая вязкость: допустимый диапазон от 2500 до 10000 мПа·с.")

    inputs["volume"] = validate_number(data, "volume")
    if not 10 <= inputs["volume"] <= 1000:
        raise ValueError("Объём смеси: допустимый диапазон от 10 до 1000 л.")

    inputs["intensity"] = validate_number(data, "intensity")
    if not 0.1 <= inputs["intensity"] <= 3:
        raise ValueError("Интенсивность: допустимый диапазон от 0,1 до 3.")

    inputs["target_homogeneity"] = validate_number(data, "target_homogeneity")
    if not 50 <= inputs["target_homogeneity"] <= 99.9:
        raise ValueError("Целевая однородность: допустимый диапазон от 50 до 99,9%.")

    return inputs


def generate_dataset(count: int = SAMPLE_COUNT) -> list[dict[str, float]]:
    generator = random.Random(TRAINING_SEED)
    samples = []

    for _ in range(count):
        temperature = generator.uniform(20, 80)
        speed = generator.uniform(100, 500)
        duration = generator.uniform(1, 20)
        resin_fraction = generator.uniform(0.25, 0.75)
        noise = generator.uniform(-80, 80)
        viscosity = (
            8500
            - 65 * (temperature - 20)
            - 6.5 * (speed - 100)
            - 45 * (duration - 1)
            + 6500 * (resin_fraction - 0.25)
            + 0.25 * (temperature - 50) * (resin_fraction - 0.5)
            + noise
        )

        samples.append(
            {
                "temperature": temperature,
                "speed": speed,
                "duration": duration,
                "resin_fraction": resin_fraction,
                "viscosity": viscosity,
            }
        )

    return samples


def solve_linear_system(
    matrix: list[list[float]], vector: list[float]
) -> list[float]:
    size = len(vector)
    augmented = [row[:] + [vector[index]] for index, row in enumerate(matrix)]

    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(augmented[row][column]))
        if abs(augmented[pivot][column]) < 1e-12:
            raise ValueError("Не удалось построить устойчивую модель регрессии.")

        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        divisor = augmented[column][column]
        augmented[column] = [value / divisor for value in augmented[column]]

        for row in range(size):
            if row == column:
                continue
            multiplier = augmented[row][column]
            augmented[row] = [
                current - multiplier * pivot_value
                for current, pivot_value in zip(augmented[row], augmented[column])
            ]

    return [augmented[index][-1] for index in range(size)]


def fit_linear_regression(
    samples: list[dict[str, float]],
) -> tuple[float, dict[str, float]]:
    centers = {
        name: mean(sample[name] for sample in samples) for name in FEATURES
    }
    scales = {
        name: pstdev(sample[name] for sample in samples) or 1.0
        for name in FEATURES
    }
    feature_count = len(FEATURES) + 1
    matrix = [[0.0] * feature_count for _ in range(feature_count)]
    vector = [0.0] * feature_count

    for sample in samples:
        row = [1.0] + [
            (sample[name] - centers[name]) / scales[name] for name in FEATURES
        ]
        target = sample["viscosity"]

        for row_index, left in enumerate(row):
            vector[row_index] += left * target
            for column_index, right in enumerate(row):
                matrix[row_index][column_index] += left * right

    standardized = solve_linear_system(matrix, vector)
    coefficients = {
        name: standardized[index + 1] / scales[name]
        for index, name in enumerate(FEATURES)
    }
    intercept = standardized[0] - sum(
        coefficients[name] * centers[name] for name in FEATURES
    )

    return intercept, coefficients


def predict_viscosity(
    sample: dict[str, float],
    intercept: float,
    coefficients: dict[str, float],
) -> float:
    return intercept + sum(
        coefficients[name] * sample[name] for name in FEATURES
    )


def calculate_metrics(
    samples: list[dict[str, float]],
    predictions: list[float],
) -> dict[str, float]:
    actual = [sample["viscosity"] for sample in samples]
    errors = [prediction - target for prediction, target in zip(predictions, actual)]
    absolute_errors = [abs(error) for error in errors]
    mean_actual = mean(actual)
    residual_sum = sum(error**2 for error in errors)
    total_sum = sum((target - mean_actual) ** 2 for target in actual)

    return {
        "mae": mean(absolute_errors),
        "rmse": math.sqrt(residual_sum / len(errors)),
        "r2": 1 - residual_sum / total_sum if total_sum else 0.0,
        "mape": mean(
            error / abs(target) * 100
            for error, target in zip(absolute_errors, actual)
            if target != 0
        ),
    }


def train_model() -> dict[str, Any]:
    dataset = generate_dataset()
    shuffled = dataset[:]
    random.Random(TRAINING_SEED + 1).shuffle(shuffled)
    split_index = int(len(shuffled) * 0.8)
    training = shuffled[:split_index]
    testing = shuffled[split_index:]
    intercept, coefficients = fit_linear_regression(training)
    predictions = [
        predict_viscosity(sample, intercept, coefficients) for sample in testing
    ]
    metrics = calculate_metrics(testing, predictions)
    residuals = [
        sample["viscosity"] - prediction
        for sample, prediction in zip(testing, predictions)
    ]

    samples = [
        {
            "actual": round(sample["viscosity"], 1),
            "predicted": round(prediction, 1),
        }
        for sample, prediction in list(zip(testing, predictions))[:12]
    ]
    summary = {}
    for feature in FEATURES + ("viscosity",):
        values = [sample[feature] for sample in dataset]
        summary[feature] = {
            "min": min(values),
            "max": max(values),
            "mean": mean(values),
        }

    return {
        "dataset": {
            "count": len(dataset),
            "training_count": len(training),
            "testing_count": len(testing),
            "seed": TRAINING_SEED,
            "synthetic": True,
            "summary": summary,
        },
        "metrics": metrics,
        "coefficients": {"intercept": intercept, **coefficients},
        "test_samples": samples,
        "residual_std": pstdev(residuals),
    }


def mixing_metrics(
    volume: float, speed: float, duration: float, intensity: float
) -> dict[str, float]:
    time_constant = (
        4 * math.sqrt(volume / 100) * (300 / speed) / intensity
    )
    homogeneity = 100 * (1 - math.exp(-duration / time_constant))
    energy = volume * (speed / 500) ** 3 * duration
    return {"homogeneity": homogeneity, "energy": energy}


def optimize_control(inputs: dict[str, float], model: dict[str, Any]) -> dict[str, Any]:
    target = inputs["target_viscosity"]
    tolerance = max(150.0, target * 0.04)
    intercept = model["coefficients"]["intercept"]
    coefficients = {
        name: model["coefficients"][name] for name in FEATURES
    }
    candidates = []

    for temperature in range(20, 81, 5):
        for speed in range(100, 501, 25):
            for duration in range(1, 21):
                settings = {
                    "temperature": float(temperature),
                    "speed": float(speed),
                    "duration": float(duration),
                    "resin_fraction": inputs["resin_fraction"],
                }
                viscosity = predict_viscosity(
                    settings, intercept, coefficients
                )
                mixing = mixing_metrics(
                    inputs["volume"],
                    speed,
                    duration,
                    inputs["intensity"],
                )
                error = abs(viscosity - target)
                candidates.append(
                    {
                        **settings,
                        "viscosity": viscosity,
                        "viscosity_error": error,
                        "homogeneity": mixing["homogeneity"],
                        "energy": mixing["energy"],
                        "quality_met": mixing["homogeneity"]
                        >= inputs["target_homogeneity"],
                    }
                )

    feasible = [
        candidate
        for candidate in candidates
        if candidate["quality_met"]
        and candidate["viscosity_error"] <= tolerance
    ]

    if feasible:
        recommended = min(
            feasible,
            key=lambda candidate: (
                candidate["energy"],
                candidate["viscosity_error"],
                candidate["speed"],
            ),
        )
    else:
        recommended = min(
            candidates,
            key=lambda candidate: (
                candidate["viscosity_error"] / tolerance
                + max(
                    0.0,
                    inputs["target_homogeneity"] - candidate["homogeneity"],
                )
                / 100,
                candidate["energy"],
            ),
        )

    return {
        "recommended": recommended,
        "target_reached": bool(feasible),
        "tolerance": tolerance,
        "candidate_count": len(candidates),
    }


def build_response(raw_inputs: Any, include_control: bool = False) -> dict[str, Any]:
    inputs = validate_inputs(raw_inputs)
    model = train_model()
    forecast = predict_viscosity(
        inputs, model["coefficients"]["intercept"], model["coefficients"]
    )
    interval = 1.96 * model["residual_std"]
    model["forecast"] = {
        "viscosity": forecast,
        "lower": max(0.0, forecast - interval),
        "upper": forecast + interval,
        "target": inputs["target_viscosity"],
        "target_error": forecast - inputs["target_viscosity"],
        "inputs": inputs,
    }

    if include_control:
        control = optimize_control(inputs, model)
        traditional_mixing = mixing_metrics(
            inputs["volume"],
            inputs["speed"],
            inputs["duration"],
            inputs["intensity"],
        )
        traditional = {
            "temperature": inputs["temperature"],
            "speed": inputs["speed"],
            "duration": inputs["duration"],
            "viscosity": forecast,
            **traditional_mixing,
        }
        recommended = control["recommended"]
        intelligent = {
            "temperature": recommended["temperature"],
            "speed": recommended["speed"],
            "duration": recommended["duration"],
            "viscosity": recommended["viscosity"],
            "homogeneity": recommended["homogeneity"],
            "energy": recommended["energy"],
        }
        energy_saving = (
            (traditional["energy"] - intelligent["energy"])
            / traditional["energy"]
            * 100
            if traditional["energy"]
            else 0.0
        )
        viscosity_error = abs(
            intelligent["viscosity"] - inputs["target_viscosity"]
        )
        actions = []
        if intelligent["temperature"] != traditional["temperature"]:
            direction = (
                "повысить"
                if intelligent["temperature"] > traditional["temperature"]
                else "снизить"
            )
            actions.append(
                f"{direction.capitalize()} температуру до "
                f"{intelligent['temperature']:.0f} °C."
            )
        if intelligent["speed"] != traditional["speed"]:
            actions.append(
                f"Изменить скорость мешалки до {intelligent['speed']:.0f} об/мин."
            )
        if intelligent["duration"] != traditional["duration"]:
            actions.append(
                f"Установить продолжительность {intelligent['duration']:.0f} мин."
            )
        if not actions:
            actions.append("Текущие параметры уже соответствуют выбранной цели.")

        model["control"] = {
            **control,
            "traditional": traditional,
            "intelligent": intelligent,
            "energy_saving_percent": energy_saving,
            "viscosity_error": viscosity_error,
            "actions": actions,
        }

    return model


def main() -> None:
    try:
        raw_inputs = json.load(sys.stdin)
        include_control = len(sys.argv) > 1 and sys.argv[1] == "control"
        result = build_response(raw_inputs, include_control)
        json.dump(result, sys.stdout, ensure_ascii=False, allow_nan=False)
    except (ValueError, KeyError) as error:
        json.dump({"error": str(error)}, sys.stdout, ensure_ascii=False)
        sys.exit(2)


if __name__ == "__main__":
    main()
