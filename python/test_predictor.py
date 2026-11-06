import unittest

from predictor import (
    build_response,
    fit_linear_regression,
    generate_dataset,
    optimize_control,
    predict_viscosity,
    train_model,
    validate_inputs,
)


DEFAULT_INPUTS = {
    "temperature": 35,
    "speed": 300,
    "duration": 10,
    "resin_fraction": 0.55,
    "target_viscosity": 6200,
    "volume": 100,
    "intensity": 1,
    "target_homogeneity": 90,
}


class PredictionModelTests(unittest.TestCase):
    def test_synthetic_dataset_is_reproducible(self):
        self.assertEqual(generate_dataset(), generate_dataset())
        self.assertEqual(len(generate_dataset()), 400)

    def test_linear_regression_fits_known_relationship(self):
        samples = [
            {
                "temperature": float(temperature),
                "speed": float(speed),
                "duration": float(duration),
                "resin_fraction": float(fraction),
                "viscosity": 1000
                + 2 * temperature
                - 3 * speed
                + 4 * duration
                + 5 * fraction,
            }
            for temperature, speed, duration, fraction in [
                (20, 100, 1, 0.25),
                (40, 200, 5, 0.4),
                (60, 350, 12, 0.6),
                (80, 500, 20, 0.75),
                (30, 450, 8, 0.3),
                (70, 150, 16, 0.7),
            ]
        ]
        intercept, coefficients = fit_linear_regression(samples)
        prediction = predict_viscosity(samples[0], intercept, coefficients)

        self.assertAlmostEqual(prediction, samples[0]["viscosity"], places=6)

    def test_holdout_metrics_are_calculated(self):
        result = train_model()

        self.assertEqual(result["dataset"]["training_count"], 320)
        self.assertEqual(result["dataset"]["testing_count"], 80)
        self.assertGreater(result["metrics"]["r2"], 0.95)
        self.assertLess(result["metrics"]["mae"], 100)
        self.assertEqual(len(result["test_samples"]), 12)

    def test_input_validation_rejects_out_of_range_speed(self):
        inputs = {**DEFAULT_INPUTS, "speed": 501}

        with self.assertRaisesRegex(ValueError, "Скорость мешалки"):
            validate_inputs(inputs)

    def test_prediction_includes_estimate_and_uncertainty_interval(self):
        result = build_response(DEFAULT_INPUTS)

        self.assertGreater(result["forecast"]["viscosity"], 0)
        self.assertLess(result["forecast"]["lower"], result["forecast"]["upper"])
        self.assertTrue(result["dataset"]["synthetic"])

    def test_controller_recommends_a_feasible_low_energy_recipe(self):
        model = train_model()
        result = optimize_control(DEFAULT_INPUTS, model)

        self.assertTrue(result["target_reached"])
        self.assertGreaterEqual(
            result["recommended"]["homogeneity"],
            DEFAULT_INPUTS["target_homogeneity"],
        )
        self.assertLessEqual(result["recommended"]["viscosity_error"], result["tolerance"])
        self.assertEqual(result["candidate_count"], 4420)

    def test_controller_reports_when_the_viscosity_target_is_unreachable(self):
        inputs = {
            **DEFAULT_INPUTS,
            "resin_fraction": 0.25,
            "target_viscosity": 10000,
        }
        result = optimize_control(inputs, train_model())

        self.assertFalse(result["target_reached"])
        self.assertGreater(result["recommended"]["viscosity_error"], result["tolerance"])

    def test_control_response_compares_both_control_methods(self):
        result = build_response(DEFAULT_INPUTS, include_control=True)

        self.assertIn("traditional", result["control"])
        self.assertIn("intelligent", result["control"])
        self.assertTrue(result["control"]["actions"])


if __name__ == "__main__":
    unittest.main()
