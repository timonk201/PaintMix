import { useCallback, useEffect, useState } from "react";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  CategoryScale,
  Title,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  Filler,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
);

const DEFAULT_INPUTS = {
  volume: 100,
  speed: 300,
  duration: 10,
  intensity: 1,
  target: 90,
};

const DEFAULT_SMART_INPUTS = {
  temperature: 35,
  resinFraction: 0.55,
  targetViscosity: 6200,
};

const FIELDS = [
  {
    name: "volume",
    label: "Объём смеси",
    unit: "л",
    min: 10,
    max: 1000,
    step: 10,
  },
  {
    name: "speed",
    label: "Скорость мешалки",
    unit: "об/мин",
    min: 100,
    max: 500,
    step: 10,
  },
  {
    name: "duration",
    label: "Время смешивания",
    unit: "мин",
    min: 1,
    max: 20,
    step: 0.5,
  },
  {
    name: "intensity",
    label: "Интенсивность",
    unit: "коэффициент",
    min: 0.1,
    max: 3,
    step: 0.1,
  },
  {
    name: "target",
    label: "Целевая однородность",
    unit: "%",
    min: 50,
    max: 99.9,
    step: 0.1,
  },
];

const NAV_ITEMS = [
  ["overview", "Обзор"],
  ["process", "Схема"],
  ["theory", "Теория"],
  ["model", "Модель"],
  ["forecast", "Прогноз"],
  ["control", "Управление"],
  ["discussion", "Выводы"],
  ["simulation", "Моделирование"],
  ["optimization", "Оптимизация"],
  ["results", "Результаты"],
  ["questions", "Вопросы"],
];

const PROCESS_STAGES = [
  ["01", "Подача компонентов", "Смола, растворитель, пигменты"],
  ["02", "Дозирование сырья", "Весовые и расходомерные датчики"],
  ["03", "Загрузка в смеситель", "Контроль уровня и состава"],
  ["04", "Смешивание и диспергирование", "Управление приводом мешалки"],
  ["05", "Контроль температуры и вязкости", "Датчики температуры и вязкости"],
  ["06", "Оценка качества смеси", "Прогноз и проверка рецептуры"],
  ["07", "Готовый лакокрасочный материал", "Выпуск партии или корректировка"],
];

const CONTROL_QUESTIONS = [
  {
    id: "srs-2",
    title: "СРС № 2 · Моделирование смешивания лакокрасочных материалов",
    description: "Вопросы о материальном балансе, динамической модели и расчёте однородности состава.",
    questions: [
      [
        "Как происходит приготовление лакокрасочных материалов?",
        "Смолу и растворитель дозируют по заданной рецептуре, подают в смесительный аппарат и перемешивают до получения однородной смеси с требуемой концентрацией. Готовый материал проверяют по контрольным показателям.",
      ],
      [
        "Как создаётся аналитическая модель приготовления ЛКМ?",
        "Сначала выбирают контролируемую величину — концентрацию растворителя в смесителе, затем учитывают входящие потоки, выходящий поток и изменение запаса вещества в ёмкости. Из баланса компонентов получают уравнение для концентрации.",
      ],
      [
        "Как выглядит аналитическая модель процесса в статике?",
        "При постоянном составе и установившихся потоках концентрация смеси равна средневзвешенной концентрации входных компонентов: C = (G₁C₁ + G₂C₂) / (G₁ + G₂). Здесь G₁ и G₂ — расходы смолы и растворителя, C₁ и C₂ — их концентрации растворителя.",
      ],
      [
        "Какой закон используют для динамической модели?",
        "Используют закон сохранения вещества: приход вещества равен его убыли с выходящим потоком плюс приращение вещества, накопленного в смесителе.",
      ],
      [
        "Какой закон используют для статической модели?",
        "Используют закон сохранения массы вещества в установившемся режиме: суммарный приход компонентов равен их суммарному расходу, а накопление в аппарате отсутствует.",
      ],
      [
        "Как получают дифференциальную модель смешивания из уравнений (1.14)–(1.16)?",
        "Составляют баланс за малый интервал времени: G₁C₁dt + G₂C₂dt = GCdt + VdC. После переноса членов и деления на Gdt получают T·dC/dt + C = Pᵢ, где G = G₁ + G₂, T = V/G, Pᵢ = (G₁C₁ + G₂C₂)/G.",
      ],
      [
        "Что показывает решение уравнения (1.17)?",
        "Оно показывает, как изменяется концентрация C(t) после начала смешивания и как она постепенно приближается к установившейся концентрации Pᵢ с характерным временем T = V/G.",
      ],
      [
        "Что означают условия уравнения (1.18)?",
        "Условия Cmin ≤ C ≤ Cmax и 0 ≤ t ≤ T задают допустимый диапазон концентрации и промежуток исследования процесса. Они помогают проверить, что рассчитанный режим и состав смеси соответствуют ограничениям задания.",
      ],
      [
        "Какие параметры процесса являются входными, выходными и контролируемыми?",
        "Входы — расходы G₁ и G₂ и концентрации C₁ и C₂. Выход — готовая смесь с расходом G и концентрацией C. Контролируют концентрацию C во времени, однородность состава и достижение требуемого значения за заданное время.",
      ],
      [
        "Что называют математической моделью смешивания ЛКМ?",
        "Это система уравнений, связывающая расходы и состав входных компонентов, объём аппарата и время с изменением концентрации готовой смеси. В данной работе динамическую модель задаёт T·dC/dt + C = Pᵢ.",
      ],
    ],
  },
  {
    id: "srs-3",
    title: "СРС № 3 · Интеллектуальное управление и прогнозирование",
    description: "Вопросы о параметрах процесса, обучении модели вязкости, датчиках и ограничениях внедрения.",
    questions: [
      [
        "Какие основные этапы включает процесс приготовления ЛКМ?",
        "Подачу и дозирование сырья, загрузку в смеситель, смешивание и диспергирование, регулирование температуры и вязкости, контроль качества и выпуск готовой партии.",
      ],
      [
        "Какие параметры влияют на качество готового продукта?",
        "Температура, частота вращения мешалки, продолжительность обработки, доли компонентов, вязкость и интенсивность диспергирования.",
      ],
      [
        "Для чего применяют математическое моделирование?",
        "Чтобы описывать зависимости процесса, проверять гипотезы, оценивать результат до запуска режима и обосновывать ограничения оборудования.",
      ],
      [
        "Какие методы машинного обучения прогнозируют вязкость?",
        "Линейная регрессия, деревья решений, случайный лес и нейронные сети. В этой работе для наглядности реализована линейная регрессия методом наименьших квадратов.",
      ],
      [
        "Чем отличается традиционное управление от интеллектуального?",
        "Традиционное выполняет заранее заданные уставки. Интеллектуальное использует текущие данные и прогноз, чтобы предложить корректировку режима с учётом качества и затрат.",
      ],
      [
        "Какие данные нужны для обучения модели?",
        "Синхронные измерения вязкости, температуры, оборотов, времени, долей компонентов и условий партии; измерения должны быть откалиброваны и покрывать планируемый диапазон.",
      ],
      [
        "Как оценивают точность прогноза?",
        "На отложенной тестовой выборке: MAE и RMSE измеряют ошибку в единицах вязкости, MAPE — относительную ошибку, R² — объяснённую долю вариации.",
      ],
      [
        "Какую роль выполняют датчики?",
        "Термометр измеряет температуру, тахометр — скорость вращения, расходомер или весы — дозирование, вискозиметр — реологические свойства. Их показания нужны для обратной связи.",
      ],
      [
        "Как снизить энергопотребление, сохраняя качество?",
        "Искать минимальные обороты и время, при которых выполняются требования по вязкости и однородности; избегать лишнего перемешивания и нагрева, проверять результат измерениями.",
      ],
      [
        "Какие ограничения учитывать при внедрении интеллектуального управления?",
        "Качество и диапазон данных, калибровку датчиков, задержку измерений, безопасность уставок, изменение рецептур, объяснимость рекомендаций и обязательную проверку реальной производственной партией.",
      ],
    ],
  },
];

const SMART_FIELDS = [
  {
    name: "temperature",
    label: "Температура смеси",
    unit: "°C",
    min: 20,
    max: 80,
    step: 1,
  },
  {
    name: "resinFraction",
    label: "Доля смолы в рецептуре",
    unit: "%",
    min: 25,
    max: 75,
    step: 1,
    display: (value) => `${formatNumber(value * 100, 0)}%`,
  },
  {
    name: "targetViscosity",
    label: "Целевая вязкость",
    unit: "мПа·с",
    min: 2500,
    max: 10000,
    step: 100,
  },
];

const chartOptions = (title, xTitle, xUnit) => ({
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: { display: true, position: "bottom", labels: { usePointStyle: true } },
    title: { display: true, text: title, align: "start" },
    tooltip: {
      callbacks: {
        title: (items) => `${xTitle}: ${items[0]?.label} ${xUnit}`,
        label: (item) => `${item.dataset.label}: ${item.formattedValue}%`,
      },
    },
  },
  scales: {
    x: { title: { display: true, text: `${xTitle}, ${xUnit}` } },
    y: {
      min: 0,
      max: 100,
      title: { display: true, text: "Однородность, %" },
    },
  },
});

const viscosityChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: { display: true, position: "bottom", labels: { usePointStyle: true } },
    title: { display: true, text: "Фактическая и прогнозная вязкость", align: "start" },
    tooltip: {
      callbacks: {
        title: (items) => `Тестовый образец ${items[0]?.label}`,
        label: (item) => `${item.dataset.label}: ${item.formattedValue} мПа·с`,
      },
    },
  },
  scales: {
    x: { title: { display: true, text: "Образец тестовой выборки" } },
    y: { title: { display: true, text: "Вязкость, мПа·с" } },
  },
};

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Не удалось выполнить запрос.");
  }

  return data;
}

function formatNumber(value, digits = 1) {
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: digits,
  }).format(value);
}

function App() {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [smartInputs, setSmartInputs] = useState(DEFAULT_SMART_INPUTS);
  const [simulation, setSimulation] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [optimization, setOptimization] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [smartControl, setSmartControl] = useState(null);
  const [error, setError] = useState("");
  const [predictionError, setPredictionError] = useState("");
  const [controlError, setControlError] = useState("");
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [forecastLoading, setForecastLoading] = useState(true);
  const [controlLoading, setControlLoading] = useState(false);

  const predictionInputs = {
    temperature: smartInputs.temperature,
    speed: inputs.speed,
    duration: inputs.duration,
    resin_fraction: smartInputs.resinFraction,
    target_viscosity: smartInputs.targetViscosity,
    volume: inputs.volume,
    intensity: inputs.intensity,
    target_homogeneity: inputs.target,
  };

  const calculate = useCallback(async (values, signal) => {
    try {
      const data = await requestJson("/api/simulate", {
        method: "POST",
        body: JSON.stringify(values),
        signal,
      });
      setSimulation(data);
      setError("");
    } catch (requestError) {
      if (requestError.name !== "AbortError") {
        setError(requestError.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => calculate(inputs, controller.signal),
      120,
    );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [inputs, calculate]);

  useEffect(() => {
    requestJson("/api/experiments")
      .then(({ experiments: initialExperiments }) =>
        setExperiments(initialExperiments),
      )
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setForecastLoading(true);

      try {
        const result = await requestJson("/api/predict", {
          method: "POST",
          body: JSON.stringify(predictionInputs),
          signal: controller.signal,
        });
        setForecast(result);
        setPredictionError("");
      } catch (requestError) {
        if (requestError.name !== "AbortError") {
          setPredictionError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setForecastLoading(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    inputs.speed,
    inputs.duration,
    inputs.volume,
    inputs.intensity,
    inputs.target,
    smartInputs,
  ]);

  const updateInput = (name, value) => {
    setInputs((previous) => ({
      ...previous,
      [name]: Number(value),
    }));
    setOptimization(null);
    setSmartControl(null);
    setControlError("");
    setForecastLoading(true);
  };

  const reset = () => {
    setInputs(DEFAULT_INPUTS);
    setSmartInputs(DEFAULT_SMART_INPUTS);
    setOptimization(null);
    setSmartControl(null);
    setForecastLoading(true);
    setError("");
  };

  const optimize = async () => {
    setOptimizing(true);
    setError("");

    try {
      const data = await requestJson("/api/optimize", {
        method: "POST",
        body: JSON.stringify(inputs),
      });
      setOptimization(data.result);
    } catch (requestError) {
      setError(requestError.message);
      setOptimization(null);
    } finally {
      setOptimizing(false);
    }
  };

  const runSmartControl = async () => {
    setControlLoading(true);
    setControlError("");

    try {
      const result = await requestJson("/api/intelligent-control", {
        method: "POST",
        body: JSON.stringify(predictionInputs),
      });
      setSmartControl(result);
    } catch (requestError) {
      setControlError(requestError.message);
      setSmartControl(null);
    } finally {
      setControlLoading(false);
    }
  };

  const addExperiment = () => {
    if (!simulation) return;

    setExperiments((previous) => [
      ...previous,
      {
        ...simulation.result,
        name: `Мой режим ${previous.filter((item) => item.custom).length + 1}`,
        custom: true,
      },
    ]);
  };

  const applyOptimization = () => {
    if (!optimization) return;

    setInputs((previous) => ({
      ...previous,
      speed: optimization.speed,
      duration: Math.round(optimization.duration * 10) / 10,
    }));
    setOptimization(null);
    setSmartControl(null);
    setForecastLoading(true);
  };

  const applySmartControl = () => {
    if (!smartControl) return;

    const recommended = smartControl.control.intelligent;
    setInputs((previous) => ({
      ...previous,
      speed: recommended.speed,
      duration: recommended.duration,
    }));
    setSmartInputs((previous) => ({
      ...previous,
      temperature: recommended.temperature,
    }));
    setSmartControl(null);
    setForecastLoading(true);
  };

  const timeChart = simulation
    ? {
        labels: simulation.charts.time.labels,
        datasets: [
          {
            label: "Однородность смеси",
            data: simulation.charts.time.values,
            borderColor: "#306c59",
            backgroundColor: "rgba(48, 108, 89, 0.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      }
    : null;

  const speedChart = simulation
    ? {
        labels: simulation.charts.speed.labels,
        datasets: [
          {
            label: "Однородность смеси",
            data: simulation.charts.speed.values,
            borderColor: "#bc704b",
            backgroundColor: "rgba(188, 112, 75, 0.12)",
            fill: true,
            tension: 0.35,
            pointRadius: 2,
          },
        ],
      }
    : null;

  const comparisonChart =
    experiments.length > 0
      ? {
          labels: experiments.map((item) => item.name),
          datasets: [
            {
              label: "Однородность смеси",
              data: experiments.map((item) => item.homogeneity),
              backgroundColor: experiments.map((item) =>
                item.homogeneity >= inputs.target ? "#306c59" : "#c77e59",
              ),
              borderRadius: 6,
            },
          ],
        }
      : null;

  const predictionChart = forecast
    ? {
        labels: forecast.test_samples.map((_, index) => index + 1),
        datasets: [
          {
            label: "Фактическая вязкость",
            data: forecast.test_samples.map((sample) => sample.actual),
            borderColor: "#306c59",
            backgroundColor: "rgba(48, 108, 89, 0.12)",
            tension: 0.25,
            pointRadius: 3,
          },
          {
            label: "Прогноз модели",
            data: forecast.test_samples.map((sample) => sample.predicted),
            borderColor: "#bc704b",
            backgroundColor: "rgba(188, 112, 75, 0.12)",
            borderDash: [5, 4],
            tension: 0.25,
            pointRadius: 3,
          },
        ],
      }
    : null;

  const controlComparisonRows = smartControl
    ? [
        ["Температура, °C", smartControl.control.traditional.temperature, smartControl.control.intelligent.temperature],
        ["Скорость мешалки, об/мин", smartControl.control.traditional.speed, smartControl.control.intelligent.speed],
        ["Время смешивания, мин", smartControl.control.traditional.duration, smartControl.control.intelligent.duration],
        ["Прогноз вязкости, мПа·с", smartControl.control.traditional.viscosity, smartControl.control.intelligent.viscosity],
        ["Отклонение от цели вязкости, мПа·с", Math.abs(smartControl.control.traditional.viscosity - smartInputs.targetViscosity), smartControl.control.viscosity_error],
        ["Однородность, %", smartControl.control.traditional.homogeneity, smartControl.control.intelligent.homogeneity],
        ["Энергозатраты, у. е.", smartControl.control.traditional.energy, smartControl.control.intelligent.energy],
        [
          "Ограничения качества",
          Math.abs(smartControl.control.traditional.viscosity - smartInputs.targetViscosity) <= smartControl.control.tolerance
            && smartControl.control.traditional.homogeneity >= inputs.target
            ? "Выполнены"
            : "Есть отклонение",
          smartControl.control.target_reached ? "Выполнены" : "Нет допустимого режима",
        ],
      ]
    : [];

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#overview" aria-label="PaintMix — на главную">
          <span className="brand-mark" aria-hidden="true">P</span>
          <span>paint<span className="brand-light">mix</span></span>
        </a>
        <nav className="main-nav" aria-label="Основная навигация">
          {NAV_ITEMS.map(([id, label]) => (
            <a key={id} href={`#${id}`}>{label}</a>
          ))}
        </nav>
        <a className="topbar-action" href="#forecast">Открыть прогноз <span>↗</span></a>
      </header>

      <main>
        <section className="hero section-wrap" id="overview">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> СРС № 2 · СРС № 3</p>
            <h1>От смешивания —<br /><span>к умному управлению.</span></h1>
            <p className="hero-description">
              Общая исследовательская работа о приготовлении ЛКМ: математическая
              модель, интерактивный эксперимент, прогноз вязкости и система
              управления технологическим режимом.
            </p>
            <a className="button button-dark" href="#forecast">
              Перейти к прогнозу <span aria-hidden="true">↓</span>
            </a>
            <div className="hero-facts">
              <div><strong>400</strong><span>синтетических наблюдений</span></div>
              <div><strong>80 / 20</strong><span>обучение и тест модели</span></div>
              <div><strong>2</strong><span>сравниваемые стратегии</span></div>
            </div>
          </div>
          <div className="hero-visual" aria-label="Схема работы смесительной установки">
            <div className="visual-caption">СХЕМА ПРОЦЕССА <span>01 / 03</span></div>
            <svg className="mixer-diagram" viewBox="0 0 560 450" role="img" aria-labelledby="mixer-title">
              <title id="mixer-title">Два компонента поступают в смеситель и выходят однородной смесью</title>
              <defs>
                <linearGradient id="vessel" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#f4ead7" />
                  <stop offset="100%" stopColor="#e3d3b9" />
                </linearGradient>
              </defs>
              <path d="M66 155h104" className="pipe pipe-one" />
              <path d="M66 253h104" className="pipe pipe-two" />
              <path d="M390 205h100" className="pipe pipe-output" />
              <path d="M163 145v28l15 12" className="arrow-line" />
              <path d="M163 243v28l15-12" className="arrow-line" />
              <path d="M490 193l15 12-15 12" className="arrow-line" />
              <rect x="177" y="106" width="214" height="222" rx="45" fill="url(#vessel)" stroke="#bcae98" strokeWidth="2" />
              <path d="M180 199h208v85a36 36 0 0 1-36 36H216a36 36 0 0 1-36-36z" fill="#cad9c7" />
              <path d="M281 135v119m-49-33 49 14 49-14m-49 14-35 33m35-33 35 33" fill="none" stroke="#43574b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="281" cy="135" r="13" fill="#43574b" />
              <rect x="244" y="74" width="74" height="38" rx="12" fill="#43574b" />
              <path d="M261 90h40" stroke="#a8baa7" strokeWidth="4" strokeLinecap="round" />
              <circle cx="159" cy="155" r="7" fill="#bc704b" />
              <circle cx="138" cy="155" r="5" fill="#d9a080" />
              <circle cx="159" cy="253" r="7" fill="#7d95ae" />
              <circle cx="138" cy="253" r="5" fill="#a5b4c3" />
              <text x="34" y="128" className="diagram-label">СМОЛА</text>
              <text x="34" y="282" className="diagram-label">РАСТВОРИТЕЛЬ</text>
              <text x="438" y="184" className="diagram-label">ГОТОВАЯ</text>
              <text x="438" y="201" className="diagram-label">СМЕСЬ</text>
              <text x="34" y="146" className="diagram-small">G₁ · C₁</text>
              <text x="34" y="300" className="diagram-small">G₂ · C₂</text>
              <text x="438" y="222" className="diagram-small">C(t)</text>
              <path d="M218 350h126" stroke="#bcae98" strokeWidth="2" strokeDasharray="4 7" />
              <text x="214" y="372" className="diagram-small">V · G · ω · t</text>
            </svg>
            <div className="visual-note"><span className="note-icon">↗</span> Все параметры можно менять в интерактивной модели</div>
          </div>
        </section>

        <section className="process-section section-wrap" id="process">
          <div className="section-heading">
            <div>
              <p className="eyebrow">01 — СТРУКТУРНАЯ СХЕМА ПРОЦЕССА</p>
              <h2>От сырья — к проверенному продукту.</h2>
            </div>
            <p>
              Технологическая цепочка показывает точки контроля, датчики и
              управляющие воздействия. Прогнозная модель помогает выбрать
              режим, а решение подтверждается измерениями.
            </p>
          </div>
          <div className="process-flow" aria-label="Этапы производства лакокрасочного материала">
            {PROCESS_STAGES.map(([number, title, detail], index) => (
              <article className="process-stage" key={number}>
                <span className="process-stage-number">{number}</span>
                <h3>{title}</h3>
                <p>{detail}</p>
                {index < PROCESS_STAGES.length - 1 && (
                  <span className="process-arrow" aria-hidden="true">→</span>
                )}
              </article>
            ))}
          </div>
          <div className="signal-strip">
            <article><span>ВХОДЫ</span><strong>Температура · скорость · время · рецептура</strong></article>
            <article><span>ДАТЧИКИ</span><strong>Термометр · тахометр · расходомер · вискозиметр</strong></article>
            <article><span>УПРАВЛЕНИЕ</span><strong>Нагрев · привод мешалки · подача компонентов</strong></article>
            <article><span>ВЫХОДЫ</span><strong>Вязкость · однородность · энергозатраты</strong></article>
          </div>
        </section>

        <section className="intro-strip section-wrap" id="theory">
          <div><p className="eyebrow">01 — ТЕХНОЛОГИЧЕСКИЙ ПРОЦЕСС</p><h2>Смешивание — это управляемое движение к равновесию.</h2></div>
          <p>При производстве лаков, красок и связующих растворитель и смола объединяются в смесительном агрегате. Задача процесса — за разумное время получить однородный продукт, не расходуя лишнюю энергию.</p>
        </section>

        <section className="theory-section section-wrap">
          <article className="theory-card">
            <span className="card-index">01</span>
            <h3>Что происходит в баке</h3>
            <p>Компоненты поступают в рабочую ёмкость, а вращающаяся мешалка создаёт поток и постепенно выравнивает состав смеси. На выходе получают лакокрасочный материал с требуемыми свойствами.</p>
            <div className="ingredient-row"><span><i className="swatch swatch-resin" /> Смола</span><span className="plus-sign">+</span><span><i className="swatch swatch-solvent" /> Растворитель</span><span className="plus-sign">→</span><span><i className="swatch swatch-mix" /> ЛКМ</span></div>
          </article>
          <article className="theory-card theory-card-green">
            <span className="card-index">02</span>
            <h3>На что влияют параметры</h3>
            <p>Более высокая скорость мешалки и интенсивность ускоряют выравнивание состава. Увеличение объёма партии требует больше времени, чтобы достичь той же однородности.</p>
            <div className="factor-list"><span>Скорость <b>↑</b> <i>однородность растёт</i></span><span>Время <b>↑</b> <i>смесь ровнее</i></span><span>Объём <b>↑</b> <i>смешивание медленнее</i></span></div>
          </article>
        </section>

        <section className="model-section section-wrap" id="model">
          <div className="section-heading">
            <div><p className="eyebrow">02 — МАТЕМАТИЧЕСКАЯ МОДЕЛЬ</p><h2>От дифференциального уравнения<br />к измеримому результату.</h2></div>
            <p>В методических указаниях процесс описан законом сохранения вещества. Из него следует модель первого порядка, в которой концентрация стремится к равновесному значению.</p>
          </div>
          <div className="equation-card">
            <div className="equation-main">
              <span className="equation-label">БАЗОВОЕ УРАВНЕНИЕ СМЕШИВАНИЯ</span>
              <p className="equation">T · <span className="fraction"><i>dC</i><i>dt</i></span> + C = P<sub>i</sub></p>
              <p className="equation-caption">C(t) = P<sub>i</sub> + (C<sub>0</sub> − P<sub>i</sub>) · e<sup>−t/T</sup></p>
            </div>
            <div className="equation-divider" />
            <div className="equation-terms">
              <div><b>T</b><span>постоянная времени: T = V / G</span></div>
              <div><b>P<sub>i</sub></b><span>равновесная концентрация входящих компонентов</span></div>
              <div><b>C<sub>0</sub></b><span>начальная концентрация смеси</span></div>
              <div><b>V, G</b><span>объём смеси и суммарный расход</span></div>
            </div>
          </div>
          <div className="model-notes">
            <div><span className="note-number">A</span><p><strong>Однородность смеси</strong><br />H(t) = 100 · (1 − e<sup>−t/τ</sup>), где τ = 4 · √(V / 100) · (300 / ω) / k. Это нормированная форма модели первого порядка.</p></div>
            <div><span className="note-number">B</span><p><strong>Условные энергозатраты</strong><br />E = V · (ω / 500)³ · t. Приближённо учитываем рост мощности мешалки со скоростью вращения. Результат выражен в условных единицах.</p></div>
          </div>
          <p className="model-caveat">Модель учебная и нормированная: формулы в предоставленном PDF местами не распознаются. Коэффициенты задают наглядное влияние параметров и не заменяют измерения реального оборудования.</p>
          <div className="advanced-model">
            <div className="advanced-model-heading">
              <p className="eyebrow">СРС 3 — ТЕМПЕРАТУРА И ВЯЗКОСТЬ</p>
              <h3>Тепловой баланс и прогноз состава.</h3>
              <p>
                Температура в модели процесса меняется из-за нагрева привода и
                теплообмена со средой. Выбрана объяснимая линейная регрессия:
                она подходит для небольшого набора признаков и позволяет показать
                вклад каждого параметра; модель предполагает приблизительную
                линейность в заданном диапазоне.
              </p>
            </div>
            <div className="advanced-equations">
              <article>
                <span>ТЕПЛОВАЯ МОДЕЛЬ</span>
                <strong>C<sub>p</sub> · m · dT/dt = P<sub>h</sub> − Q<sub>l</sub></strong>
                <p>Q<sub>l</sub> = h · A · (T − T<sub>окр</sub>); C<sub>p</sub> — теплоёмкость, m — масса, h — коэффициент теплоотдачи, A — площадь теплообмена. Датчик измеряет T, а P<sub>h</sub> — подводимая мощность.</p>
              </article>
              <article>
                <span>ЛИНЕЙНАЯ РЕГРЕССИЯ</span>
                <strong>μ̂ = β₀ + β₁T + β₂n + β₃t + β₄r</strong>
                <p>r — массовая доля смолы; доля второго компонента принята равной 1 − r. Коэффициенты вычисляются методом наименьших квадратов на обучающей выборке.</p>
              </article>
            </div>
            <div className="synthetic-rule">
              <span>ПРАВИЛО ГЕНЕРАЦИИ УЧЕБНОЙ ВЯЗКОСТИ</span>
              <strong>μ = 8500 − 65(T − 20) − 6,5(n − 100) − 45(t − 1) + 6500(r − 0,25) + 0,25(T − 50)(r − 0,5) + ε</strong>
              <p>Здесь ε — воспроизводимый шум в диапазоне от −80 до +80 мПа·с. Фиксированный seed обеспечивает одинаковый набор при каждом пересчёте.</p>
            </div>
            <div className="coefficient-card">
              <div>
                <span className="coefficient-heading">КОЭФФИЦИЕНТЫ ПО ОБУЧАЮЩЕЙ ВЫБОРКЕ</span>
                <p>Если физические зависимости остаются прежними, увеличение температуры, скорости обработки и доли смолы обычно меняет вязкость в пределах состава и режима. Знак и величина коэффициентов здесь определяются модельными данными.</p>
              </div>
              {forecast ? (
                <div className="coefficient-grid">
                  {[
                    ["intercept", "β₀"],
                    ["temperature", "β₁ · T"],
                    ["speed", "β₂ · n"],
                    ["duration", "β₃ · t"],
                    ["resin_fraction", "β₄ · r"],
                  ].map(([name, label]) => (
                    <div key={name}>
                      <span>{label}</span>
                      <strong>{formatNumber(forecast.coefficients[name], 3)}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="coefficient-loading">Модель обучается…</span>
              )}
            </div>
          </div>
        </section>

        <section className="simulation-section" id="simulation">
          <div className="section-wrap simulation-inner">
            <div className="section-heading">
              <div><p className="eyebrow">03 — ИНТЕРАКТИВНАЯ ЛАБОРАТОРИЯ</p><h2>Настройте свой режим.</h2></div>
              <p>Результаты пересчитываются автоматически при изменении параметров. Задайте характеристики партии и наблюдайте за динамикой процесса.</p>
            </div>
            <div className="workspace">
              <form className="controls-card" onSubmit={(event) => { event.preventDefault(); calculate(inputs); }}>
                <div className="controls-heading"><div><span className="live-dot" /> ПАРАМЕТРЫ ПРОЦЕССА</div><span>01 / 05</span></div>
                {FIELDS.map((field) => (
                  <label className="field-control" key={field.name}>
                    <span className="field-label">{field.label}<small>{field.unit}</small></span>
                    <span className="range-readout">{formatNumber(inputs[field.name], field.step < 1 ? 1 : 0)} <small>{field.unit}</small></span>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      value={inputs[field.name]}
                      onChange={(event) => updateInput(field.name, event.target.value)}
                      aria-label={field.label}
                    />
                    <span className="range-limits"><span>{field.min}</span><span>{field.max}</span></span>
                  </label>
                ))}
                <div className="control-actions">
                  <button className="button button-dark" type="submit">Рассчитать <span>↗</span></button>
                  <button className="button button-quiet" type="button" onClick={reset}>Сбросить параметры</button>
                </div>
                <p className="validation-hint">Ограничения скорости и времени соответствуют заданию: 100–500 об/мин, 1–20 минут.</p>
              </form>

              <div className="results-column">
                <div className="metric-grid">
                  <article className="metric-card metric-primary">
                    <span>СТЕПЕНЬ ОДНОРОДНОСТИ</span>
                    <strong>{loading || !simulation ? "—" : `${formatNumber(simulation.result.homogeneity, 2)}%`}</strong>
                    <small>{simulation?.result.meetsTarget ? "Целевое значение достигнуто" : "Ниже целевой однородности"}</small>
                  </article>
                  <article className="metric-card">
                    <span>ЭНЕРГОЗАТРАТЫ</span>
                    <strong>{loading || !simulation ? "—" : formatNumber(simulation.result.energy, 1)}</strong>
                    <small>условных единиц</small>
                  </article>
                  <article className="metric-card">
                    <span>ПОСТОЯННАЯ ВРЕМЕНИ τ</span>
                    <strong>{loading || !simulation ? "—" : `${formatNumber(simulation.result.timeConstant, 2)} мин`}</strong>
                    <small>характеристика скорости процесса</small>
                  </article>
                </div>
                <div className="chart-grid">
                  <article className="chart-card"><div className="chart-title"><div><span>01</span><h3>Влияние времени</h3></div><small>при {inputs.speed} об/мин</small></div><div className="chart-area">{timeChart && <Line data={timeChart} options={chartOptions("Однородность от времени", "Время", "мин")} />}</div></article>
                  <article className="chart-card"><div className="chart-title"><div><span>02</span><h3>Влияние скорости</h3></div><small>за {formatNumber(inputs.duration)} мин</small></div><div className="chart-area">{speedChart && <Line data={speedChart} options={chartOptions("Однородность от скорости", "Скорость", "об/мин")} />}</div></article>
                </div>
                <p className="chart-footnote">Кривые строятся по текущему объёму, интенсивности и реальному расчёту модели.</p>
                {error && <div className="error-message" role="alert">{error}</div>}
              </div>
            </div>
          </div>
        </section>

        <section className="optimization-section section-wrap" id="optimization">
          <div className="optimization-copy">
            <p className="eyebrow">04 — ПОИСК ЛУЧШЕГО РЕЖИМА</p>
            <h2>Достаточная однородность.<br /><span>Без лишней энергии.</span></h2>
            <p>Алгоритм перебирает все допустимые сочетания скорости и времени, оставляет те, что достигают вашей цели, и выбирает режим с наименьшими условными энергозатратами.</p>
            <button className="button button-light" onClick={optimize} disabled={optimizing}>
              {optimizing ? "Ищем оптимум…" : "Оптимизировать режим"} <span>↗</span>
            </button>
          </div>
          <div className="optimization-result">
            {optimization ? (
              <>
                <div className="optimization-result-head"><span className="success-dot" /> ОПТИМАЛЬНЫЙ РЕЖИМ</div>
                <div className="optimal-grid">
                  <div><span>Скорость</span><strong>{formatNumber(optimization.speed, 0)} <small>об/мин</small></strong></div>
                  <div><span>Время</span><strong>{formatNumber(optimization.duration, 1)} <small>мин</small></strong></div>
                  <div><span>Однородность</span><strong>{formatNumber(optimization.homogeneity, 2)}<small>%</small></strong></div>
                  <div><span>Энергозатраты</span><strong>{formatNumber(optimization.energy, 1)} <small>у. е.</small></strong></div>
                </div>
                <button className="apply-button" onClick={applyOptimization}>Применить этот режим <span>→</span></button>
              </>
            ) : (
              <div className="optimization-placeholder">
                <span className="placeholder-icon">↘</span>
                <h3>Ваш результат появится здесь</h3>
                <p>Оптимизируем режим для цели {formatNumber(inputs.target)}% при объёме {formatNumber(inputs.volume, 0)} л.</p>
                <div className="placeholder-divider" />
                <span>КРИТЕРИЙ ПОИСКА</span>
                <strong>min E, при H ≥ H<sub>цель</sub></strong>
              </div>
            )}
          </div>
        </section>

        <section className="experiments-section section-wrap" id="results">
          <div className="section-heading">
            <div><p className="eyebrow">05 — ВЫЧИСЛИТЕЛЬНЫЙ ЭКСПЕРИМЕНТ</p><h2>Сравните режимы<br />в одной таблице.</h2></div>
            <p>Пять исходных экспериментов рассчитаны одной моделью. Добавьте текущий режим, чтобы сравнить его с остальными.</p>
          </div>
          <div className="experiment-toolbar"><span>{experiments.length} режимов · объём и интенсивность исходных опытов фиксированы</span><button className="button button-outline" onClick={addExperiment} disabled={!simulation}>+ Добавить текущий режим</button></div>
          <div className="experiment-layout">
            <div className="table-card">
              <div className="table-scroll"><table>
                <thead><tr><th>РЕЖИМ</th><th>СКОРОСТЬ, ОБ/МИН</th><th>ВРЕМЯ, МИН</th><th>ОДНОРОДНОСТЬ, %</th><th>ЭНЕРГИЯ, У. Е.</th><th>ЦЕЛЬ</th></tr></thead>
                <tbody>{experiments.map((item, index) => (
                  <tr key={`${item.name}-${index}`}>
                    <td><span className="experiment-name"><i className={item.meetsTarget ? "table-dot good" : "table-dot"} />{item.name}</span></td>
                    <td>{formatNumber(item.speed, 0)}</td>
                    <td>{formatNumber(item.duration)}</td>
                    <td><strong>{formatNumber(item.homogeneity, 2)}</strong></td>
                    <td>{formatNumber(item.energy, 1)}</td>
                    <td><span className={`goal-badge ${item.homogeneity >= inputs.target ? "goal-met" : "goal-missed"}`}>{item.homogeneity >= inputs.target ? "Достигнута" : "Не достигнута"}</span></td>
                  </tr>
                ))}</tbody>
              </table></div>
              <div className="table-legend"><span><i className="table-dot good" /> целевая однородность достигнута</span><span>Цель для расчётов: {formatNumber(inputs.target)}%</span></div>
            </div>
            <article className="comparison-card">
              <div className="chart-title"><div><span>03</span><h3>Режимы рядом</h3></div><small>сравнение однородности</small></div>
              <div className="comparison-chart">{comparisonChart && <Line data={comparisonChart} options={{
                ...chartOptions("Сравнение режимов", "Режим", ""),
                scales: { x: { ticks: { maxRotation: 45, minRotation: 0 } }, y: { min: 0, max: 100, title: { display: true, text: "Однородность, %" } } },
                plugins: { ...chartOptions("Сравнение режимов", "Режим", "").plugins, legend: { display: false } },
              }} />}</div>
            </article>
          </div>
          <article className="conclusion-card">
            <div className="conclusion-mark">∑</div>
            <div><p className="eyebrow">ВЫВОДЫ И АНАЛИЗ</p><h3>Что показывают расчёты</h3><p>При постоянном объёме и коэффициенте интенсивности модель показывает рост однородности при увеличении времени и скорости вращения. Оптимизатор находит самый экономичный допустимый режим, достигающий выбранной цели. Для реального оборудования результаты нужно сверять с измерениями концентрации и энергопотребления.</p></div>
          </article>
        </section>

        <section className="forecast-section section-wrap" id="forecast">
          <div className="section-heading">
            <div>
              <p className="eyebrow">06 — ПРАКТИЧЕСКАЯ ЧАСТЬ · ПРОГНОЗИРОВАНИЕ</p>
              <h2>Проверьте вязкость<br />до завершения партии.</h2>
            </div>
            <p>
              Линейная регрессия обучается на синтетических данных, разделённых
              на тренировочную и тестовую выборки. Меняйте параметры и
              наблюдайте, как меняется прогноз.
            </p>
          </div>
          <div className="forecast-layout">
            <form className="smart-controls" onSubmit={(event) => event.preventDefault()}>
              <div className="controls-heading">
                <div><span className="live-dot" /> ТЕКУЩИЕ ДАННЫЕ ПРОЦЕССА</div>
                <span>МОДЕЛЬ · 01</span>
              </div>
              {SMART_FIELDS.map((field) => (
                <label className="field-control" key={field.name}>
                  <span className="field-label">{field.label}<small>{field.unit}</small></span>
                  <span className="range-readout">
                    {field.display
                      ? field.display(smartInputs[field.name])
                      : formatNumber(smartInputs[field.name], 0)}
                    {!field.display && <small>{field.unit}</small>}
                  </span>
                  <input
                    type="range"
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    value={
                      field.name === "resinFraction"
                        ? smartInputs.resinFraction * 100
                        : smartInputs[field.name]
                    }
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      setSmartInputs((previous) => ({
                        ...previous,
                        [field.name]:
                          field.name === "resinFraction" ? value / 100 : value,
                      }));
                      setSmartControl(null);
                      setControlError("");
                      setForecastLoading(true);
                    }}
                    aria-label={field.label}
                  />
                  <span className="range-limits"><span>{field.min}</span><span>{field.max}</span></span>
                </label>
              ))}
              <div className="current-feature-list">
                <span>Скорость мешалки <strong>{formatNumber(inputs.speed, 0)} об/мин</strong></span>
                <span>Продолжительность <strong>{formatNumber(inputs.duration)} мин</strong></span>
                <span>Доля растворителя <strong>{formatNumber((1 - smartInputs.resinFraction) * 100, 0)}%</strong></span>
              </div>
              <p className="validation-hint">Допустимые диапазоны модели заданы учебным набором данных.</p>
            </form>

            <div className="forecast-results">
              <div className="forecast-metrics">
                <article className="forecast-metric forecast-metric-primary">
                  <span>ПРОГНОЗ ВЯЗКОСТИ ТЕКУЩЕЙ ПАРТИИ</span>
                  <strong>{forecastLoading || !forecast ? "—" : formatNumber(forecast.forecast.viscosity, 0)}</strong>
                  <small>мПа·с · цель {formatNumber(smartInputs.targetViscosity, 0)} мПа·с</small>
                </article>
                <article className="forecast-metric">
                  <span>КАЧЕСТВО НА ТЕСТОВОЙ ВЫБОРКЕ</span>
                  <strong>{forecast ? `${formatNumber(forecast.metrics.r2 * 100, 2)}%` : "—"}</strong>
                  <small>R² · доля объяснённой вариации</small>
                </article>
                <article className="forecast-metric">
                  <span>СРЕДНЯЯ АБСОЛЮТНАЯ ОШИБКА</span>
                  <strong>{forecast ? formatNumber(forecast.metrics.mae, 1) : "—"}</strong>
                  <small>мПа·с · тестовая выборка</small>
                </article>
              </div>
              {forecast && (
                <div className="prediction-interval">
                  Интервал учебного прогноза: <strong>{formatNumber(forecast.forecast.lower, 0)}–{formatNumber(forecast.forecast.upper, 0)} мПа·с</strong>.
                  Ошибка среднего по тесту: RMSE {formatNumber(forecast.metrics.rmse, 1)} мПа·с, MAPE {formatNumber(forecast.metrics.mape, 2)}%.
                </div>
              )}
              {predictionError && <div className="error-message" role="alert">{predictionError}</div>}
              <article className="chart-card prediction-chart-card">
                <div className="chart-title">
                  <div><span>04</span><h3>Факт и прогноз на тестовой выборке</h3></div>
                  <small>не участвовала в обучении</small>
                </div>
                <div className="prediction-chart">
                  {predictionChart && <Line data={predictionChart} options={viscosityChartOptions} />}
                </div>
              </article>
            </div>
          </div>

          <div className="dataset-analysis">
            <div className="dataset-summary">
              <p className="eyebrow">АНАЛИЗ СИНТЕТИЧЕСКИХ ДАННЫХ</p>
              <h3>{forecast?.dataset.count ?? 400} модельных наблюдений.</h3>
              <p>
                Набор воспроизводим: диапазоны факторов генерируются с
                фиксированным seed. Разбиение 80/20 создаёт независимую
                тестовую выборку; калибровка на реальных заводских измерениях
                пока не выполнялась.
              </p>
              {forecast && <div className="split-badges"><span>Обучение · {forecast.dataset.training_count}</span><span>Тест · {forecast.dataset.testing_count}</span><span>Seed · {forecast.dataset.seed}</span></div>}
            </div>
            {forecast && (
              <div className="dataset-table-wrap">
                <table className="dataset-table">
                  <thead><tr><th>ПОКАЗАТЕЛЬ</th><th>МИН.</th><th>СРЕДНЕЕ</th><th>МАКС.</th></tr></thead>
                  <tbody>
                    {[
                      ["Температура, °C", "temperature"],
                      ["Скорость, об/мин", "speed"],
                      ["Время, мин", "duration"],
                      ["Доля смолы", "resin_fraction"],
                      ["Вязкость, мПа·с", "viscosity"],
                    ].map(([label, key]) => (
                      <tr key={key}>
                        <td>{label}</td>
                        <td>{formatNumber(forecast.dataset.summary[key].min, key === "resin_fraction" ? 2 : 1)}</td>
                        <td>{formatNumber(forecast.dataset.summary[key].mean, key === "resin_fraction" ? 2 : 1)}</td>
                        <td>{formatNumber(forecast.dataset.summary[key].max, key === "resin_fraction" ? 2 : 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {forecast && (
            <div className="sample-results">
              <div>
                <p className="eyebrow">ФАКТИЧЕСКИЕ И ПРОГНОЗНЫЕ ЗНАЧЕНИЯ</p>
                <h3>Проверка на отложенных данных.</h3>
              </div>
              <div className="sample-table-wrap">
                <table className="dataset-table">
                  <thead><tr><th>ОБРАЗЕЦ</th><th>ФАКТИЧЕСКАЯ ВЯЗКОСТЬ</th><th>ПРОГНОЗ</th><th>АБС. ОШИБКА</th></tr></thead>
                  <tbody>{forecast.test_samples.map((sample, index) => (
                    <tr key={`${index}-${sample.actual}`}>
                      <td>{index + 1}</td>
                      <td>{formatNumber(sample.actual, 1)} мПа·с</td>
                      <td>{formatNumber(sample.predicted, 1)} мПа·с</td>
                      <td>{formatNumber(Math.abs(sample.actual - sample.predicted), 1)} мПа·с</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        <section className="control-section" id="control">
          <div className="section-wrap">
            <div className="section-heading">
              <div>
                <p className="eyebrow">07 — ИНТЕЛЛЕКТУАЛЬНОЕ УПРАВЛЕНИЕ</p>
                <h2>Прогноз подсказывает,<br />режим решает.</h2>
              </div>
              <p>
                Сравните фиксированный режим оператора и рекомендацию
                прогнозной системы. Алгоритм перебирает настройки, чтобы
                приблизить вязкость к цели, выполнить требование по
                однородности и сократить условные энергозатраты.
              </p>
            </div>

            <div className="control-toolbar">
              <div><span className="sensor-icon">◉</span><span><strong>Входы датчиков</strong><small>температура · обороты · время · рецептура</small></span></div>
              <span className="control-flow-arrow">→</span>
              <div><span className="sensor-icon sensor-ai">ƒ</span><span><strong>Модель прогноза</strong><small>линейная регрессия вязкости</small></span></div>
              <span className="control-flow-arrow">→</span>
              <div><span className="sensor-icon">↗</span><span><strong>Коррекция уставок</strong><small>нагрев · привод · выдержка</small></span></div>
              <button className="button button-dark control-run-button" onClick={runSmartControl} disabled={controlLoading}>
                {controlLoading ? "Рассчитываем…" : "Подобрать режим"} <span>↗</span>
              </button>
            </div>

            {controlError && <div className="error-message control-error" role="alert">{controlError}</div>}
            <div className="control-comparison">
              <article className="strategy-card">
                <div className="strategy-title"><span className="strategy-mark">01</span><div><h3>Традиционное управление</h3><p>Заранее заданные оператором параметры; без прогноза вязкости.</p></div></div>
                <div className="strategy-values">
                  <span>Температура<strong>{formatNumber(smartInputs.temperature, 0)} °C</strong></span>
                  <span>Скорость<strong>{formatNumber(inputs.speed, 0)} об/мин</strong></span>
                  <span>Время<strong>{formatNumber(inputs.duration)} мин</strong></span>
                  <span>Прогноз вязкости<strong>{forecast ? `${formatNumber(forecast.forecast.viscosity, 0)} мПа·с` : "—"}</strong></span>
                  <span>Однородность<strong>{simulation ? `${formatNumber(simulation.result.homogeneity, 2)}%` : "—"}</strong></span>
                  <span>Энергозатраты<strong>{simulation ? `${formatNumber(simulation.result.energy, 1)} у. е.` : "—"}</strong></span>
                </div>
                <div className="strategy-footnote">Корректировка выполняется после измерения готовой партии.</div>
              </article>

              <article className={`strategy-card strategy-smart ${smartControl?.control.target_reached ? "strategy-ready" : ""}`}>
                <div className="strategy-title"><span className="strategy-mark strategy-mark-smart">02</span><div><h3>Интеллектуальное управление</h3><p>Прогнозная вязкость + перебор допустимых уставок.</p></div></div>
                {smartControl ? (
                  <>
                    <div className="strategy-status">
                      <span className={smartControl.control.target_reached ? "status-chip status-chip-good" : "status-chip status-chip-warning"}>
                        {smartControl.control.target_reached ? "Цель достигнута в пределах допуска" : "Требуется проверка целевых значений"}
                      </span>
                      <small>{formatNumber(smartControl.control.candidate_count, 0)} вариантов режима проверено</small>
                    </div>
                    <div className="strategy-values">
                      <span>Температура<strong>{formatNumber(smartControl.control.intelligent.temperature, 0)} °C</strong></span>
                      <span>Скорость<strong>{formatNumber(smartControl.control.intelligent.speed, 0)} об/мин</strong></span>
                      <span>Время<strong>{formatNumber(smartControl.control.intelligent.duration, 0)} мин</strong></span>
                      <span>Прогноз вязкости<strong>{formatNumber(smartControl.control.intelligent.viscosity, 0)} мПа·с</strong></span>
                      <span>Однородность<strong>{formatNumber(smartControl.control.intelligent.homogeneity, 2)}%</strong></span>
                      <span>Энергозатраты<strong>{formatNumber(smartControl.control.intelligent.energy, 1)} у. е.</strong></span>
                    </div>
                    <div className="recommended-actions">
                      {smartControl.control.actions.map((action) => <span key={action}>→ {action}</span>)}
                      <span className="saving-note">
                        {smartControl.control.energy_saving_percent >= 0 ? "Экономия энергии" : "Рост энергозатрат"} относительно базового режима: {formatNumber(Math.abs(smartControl.control.energy_saving_percent), 1)}%.
                      </span>
                    </div>
                    <button className="apply-button" onClick={applySmartControl} disabled={!smartControl.control.target_reached}>Применить уставки в модели <span>→</span></button>
                  </>
                ) : (
                  <div className="strategy-empty">
                    <span>ЦЕЛЬ ПО ВЯЗКОСТИ</span>
                    <strong>{formatNumber(smartInputs.targetViscosity, 0)} мПа·с</strong>
                    <p>Запустите подбор, чтобы сравнить текущий и рекомендованный режимы.</p>
                    <span>МЯГКОЕ ОГРАНИЧЕНИЕ · ±4% ВЯЗКОСТИ · ЦЕЛЬ ОДНОРОДНОСТИ {formatNumber(inputs.target)}%</span>
                  </div>
                )}
              </article>
            </div>

            {smartControl && (
              <div className="comparison-table-wrap">
                <table className="comparison-table">
                  <thead><tr><th>ПОКАЗАТЕЛЬ</th><th>ТРАДИЦИОННОЕ УПРАВЛЕНИЕ</th><th>ПРОГНОЗНОЕ УПРАВЛЕНИЕ</th></tr></thead>
                  <tbody>{controlComparisonRows.map(([label, traditional, intelligent]) => (
                    <tr key={label}>
                      <td>{label}</td>
                      <td>{typeof traditional === "number" ? formatNumber(traditional, 1) : traditional}</td>
                      <td><strong>{typeof intelligent === "number" ? formatNumber(intelligent, 1) : intelligent}</strong></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            <div className="control-analysis">
              <article><span>ПОТЕНЦИАЛЬНОЕ ПРЕИМУЩЕСТВО</span><p>Раннее предупреждение о выходе вязкости за целевой диапазон и согласованная корректировка температуры, оборотов и выдержки.</p></article>
              <article><span>ОГРАНИЧЕНИЯ</span><p>Модель обучена на синтетических данных; датчики требуют калибровки, а рекомендации — проверки оператором и защитными блокировками. Доля годных промышленных партий не рассчитывается: в учебном наборе нет фактических результатов выпуска.</p></article>
            </div>
          </div>
        </section>

        <section className="discussion-section section-wrap" id="discussion">
          <div className="section-heading">
            <div>
              <p className="eyebrow">08 — ОБСУЖДЕНИЕ И ВЫВОДЫ</p>
              <h2>Модель предлагает.<br />Процесс подтверждает.</h2>
            </div>
            <p>
              Ошибка на тестовой выборке оценивает соответствие синтетическим
              данным, но сама по себе не доказывает промышленную точность.
              Для внедрения потребуются измерения реального продукта и
              производственная валидация.
            </p>
          </div>
          <div className="discussion-grid">
            <article><span>01</span><h3>Модель</h3><p>Тепловой баланс описывает накопление и отвод тепла; многомерная линейная регрессия оценивает вязкость по четырём наблюдаемым признакам.</p></article>
            <article><span>02</span><h3>Оценка</h3><p>Разделение 80/20 исключает тестовые измерения из обучения. R², MAE, RMSE и MAPE показывают качество с разных сторон.</p></article>
            <article><span>03</span><h3>Рекомендация</h3><p>Использовать модель как помощника оператора: контролировать сырьё и датчики, ограничивать уставки и перепроверять готовую партию.</p></article>
          </div>
        </section>

        <section className="questions-section section-wrap" id="questions">
          <div className="section-heading">
            <div>
              <p className="eyebrow">09 — ОТВЕТЫ НА КОНТРОЛЬНЫЕ ВОПРОСЫ</p>
              <h2>Обе работы — в одном разделе.</h2>
            </div>
            <p>Два самостоятельных набора вопросов с отдельной нумерацией и ответами.</p>
          </div>
          <div className="question-groups">
            {CONTROL_QUESTIONS.map((group) => (
              <article className={`question-group question-group-${group.id}`} key={group.id}>
                <div className="question-group-heading">
                  <span>{group.id === "srs-2" ? "РАБОТА 01" : "РАБОТА 02"}</span>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <div className="question-list">
                  {group.questions.map(([question, answer], index) => (
                    <details className="question-item" key={question}>
                      <summary>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{question}</strong>
                        <i>+</i>
                      </summary>
                      <p>{answer}</p>
                    </details>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <footer className="footer section-wrap"><a className="brand" href="#overview"><span className="brand-mark">P</span><span>paint<span className="brand-light">mix</span></span></a><span>Моделирование процесса приготовления ЛКМ</span><a href="#model">Модель и формулы ↑</a></footer>
      </main>
    </div>
  );
}

export default App;
