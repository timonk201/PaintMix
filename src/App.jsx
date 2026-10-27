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
  ["theory", "Теория"],
  ["model", "Модель"],
  ["simulation", "Моделирование"],
  ["optimization", "Оптимизация"],
  ["results", "Результаты"],
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
  const [simulation, setSimulation] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [optimization, setOptimization] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);

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

  const updateInput = (name, value) => {
    setInputs((previous) => ({
      ...previous,
      [name]: Number(value),
    }));
    setOptimization(null);
  };

  const reset = () => {
    setInputs(DEFAULT_INPUTS);
    setOptimization(null);
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
        <a className="topbar-action" href="#simulation">Открыть модель <span>↗</span></a>
      </header>

      <main>
        <section className="hero section-wrap" id="overview">
          <div className="hero-copy">
            <p className="eyebrow"><span className="status-dot" /> ЛАБОРАТОРНАЯ РАБОТА № 2</p>
            <h1>Точный состав.<br /><span>Идеальное смешивание.</span></h1>
            <p className="hero-description">
              Моделирование процесса приготовления лакокрасочных материалов:
              исследуйте, как скорость мешалки и время влияют на однородность смеси.
            </p>
            <a className="button button-dark" href="#simulation">
              Начать моделирование <span aria-hidden="true">↓</span>
            </a>
            <div className="hero-facts">
              <div><strong>6</strong><span>разделов исследования</span></div>
              <div><strong>5+</strong><span>расчётных экспериментов</span></div>
              <div><strong>100%</strong><span>динамическая модель</span></div>
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

        <footer className="footer section-wrap"><a className="brand" href="#overview"><span className="brand-mark">P</span><span>paint<span className="brand-light">mix</span></span></a><span>Моделирование процесса приготовления ЛКМ</span><a href="#model">Модель и формулы ↑</a></footer>
      </main>
    </div>
  );
}

export default App;
