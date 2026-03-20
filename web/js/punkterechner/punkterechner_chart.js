(function () {
  "use strict";

  if (window.__prChartInitialized) return;
  window.__prChartInitialized = true;

  const prChartState = {
    chart: null,
    domReadyHandled: false
  };
  const PR_CHART_Y_STEPS = [0, 200, 400, 500, 600, 700, 800, 900, 1000, 1100];
  const PR_CHART_COLORS = [
    "#ffed00",
    "#ffffff",
    "#59c3c3",
    "#f25f5c",
    "#ffe066",
    "#70e000",
    "#ff8fab",
    "#7b9acc"
  ];

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", prChartInitDom);
  } else {
    prChartInitDom();
  }

  document.addEventListener("pr:past-data-updated", event => {
    const rows = event && event.detail && Array.isArray(event.detail.rows)
      ? event.detail.rows
      : prChartReadRows();

    prChartRender(rows);
  });

  function prChartInitDom() {
    if (prChartState.domReadyHandled) return;
    prChartState.domReadyHandled = true;

    prChartInjectStyles();
    prEnsureChartMounted();
    prChartRender(prChartReadRows());
  }

  function prChartInjectStyles() {
    if (document.getElementById("pr-history-chart-style")) return;

    const style = document.createElement("style");
    style.id = "pr-history-chart-style";
    style.textContent = `
      .pr-history-chart-section {
        position: relative;
        max-width: 960px;
        margin: 0 auto 2rem;
        padding: 1rem 1rem 0.85rem;
        background: rgba(15, 15, 18, 0.35);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        z-index: 1;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
        color: #f9fafb;
      }

      .pr-history-chart-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }

      .pr-history-chart-title {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 700;
        color: #f9fafb;
      }

      .pr-history-chart-meta {
        font-size: 0.84rem;
        color: rgba(249, 250, 251, 0.7);
      }

      .pr-history-chart-canvas-wrap {
        position: relative;
        min-height: 350px;
      }

      .pr-history-chart-canvas {
        display: block;
        width: 100%;
        height: 350px;
      }

      .pr-history-chart-empty {
        display: none;
        align-items: center;
        justify-content: center;
        min-height: 350px;
        text-align: center;
        color: rgba(249, 250, 251, 0.82);
        font-size: 0.95rem;
      }

      .pr-history-chart-section.is-empty .pr-history-chart-empty {
        display: flex;
      }

      .pr-history-chart-section.is-empty .pr-history-chart-canvas {
        display: none;
      }

      @media (max-width: 720px) {
        .pr-history-chart-section {
          margin: 0 0.5rem 1.5rem;
          padding: 0.9rem 0.85rem 0.8rem;
        }

        .pr-history-chart-head {
          align-items: flex-start;
          flex-direction: column;
          gap: 0.2rem;
          margin-bottom: 0.7rem;
        }

        .pr-history-chart-title {
          font-size: 0.98rem;
        }

        .pr-history-chart-meta {
          font-size: 0.78rem;
        }

        .pr-history-chart-canvas-wrap,
        .pr-history-chart-canvas,
        .pr-history-chart-empty {
          min-height: 290px;
          height: 290px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function prCreateChartMarkup() {
    return `
      <section id="pr-history-chart-section" class="pr-history-chart-section is-empty">
        <div class="pr-history-chart-head">
          <h2 class="pr-history-chart-title">Disziplinverlauf</h2>
        </div>
        <div class="pr-history-chart-canvas-wrap">
          <canvas id="pr-history-chart-canvas" class="pr-history-chart-canvas" aria-label="Punkteverlauf als Diagramm"></canvas>
          <div id="pr-history-chart-empty" class="pr-history-chart-empty">Sobald Verlaufsdaten vorliegen, werden sie hier visualisiert.</div>
        </div>
      </section>
    `;
  }

  function prEnsureChartMounted() {
    let section = document.getElementById("pr-history-chart-section");
    if (section) return section;

    const pastSection = document.getElementById("pr-past-table-section");
    const tableWrapper = document.querySelector(".pr-table-wrapper");
    const sourceNote =
      document.querySelector(".pr-source-note") ||
      document.getElementById("pr-source-note-text")?.closest("section") ||
      document.getElementById("pr-source-note-text")?.parentElement;

    const parent =
      (pastSection && pastSection.parentNode) ||
      (tableWrapper && tableWrapper.parentNode) ||
      (sourceNote && sourceNote.parentNode);

    if (!parent) return null;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = prCreateChartMarkup().trim();
    section = wrapper.firstElementChild;

    if (!section) return null;

    if (tableWrapper && tableWrapper.nextSibling) {
      parent.insertBefore(section, tableWrapper.nextSibling);
    } else if (tableWrapper) {
      parent.appendChild(section);
    } else if (sourceNote) {
      parent.insertBefore(section, sourceNote);
    } else {
      parent.appendChild(section);
    }

    if (pastSection) {
      const nextAfterChart = section.nextSibling;
      if (nextAfterChart !== pastSection) {
        if (sourceNote && sourceNote.parentNode === parent) {
          parent.insertBefore(pastSection, sourceNote);
        } else {
          parent.appendChild(pastSection);
        }
      }
    }

    return section;
  }

  function prChartReadRows() {
    if (typeof window.prGetPastChartData === "function") {
      return window.prGetPastChartData();
    }

    return Array.isArray(window.prPastChartData) ? window.prPastChartData.slice() : [];
  }

  function prChartSetEmptyState(isEmpty) {
    const section = prEnsureChartMounted();
    if (!section) return;

    section.classList.toggle("is-empty", !!isEmpty);
  }

  function prChartDestroy() {
    if (prChartState.chart && typeof prChartState.chart.destroy === "function") {
      prChartState.chart.destroy();
    }
    prChartState.chart = null;
  }

  function prChartRender(rows) {
    const section = prEnsureChartMounted();
    const canvas = document.getElementById("pr-history-chart-canvas");

    if (!section || !canvas) return;
    if (typeof Chart === "undefined") {
      prChartSetEmptyState(true);
      const empty = document.getElementById("pr-history-chart-empty");
      if (empty) empty.textContent = "Das Diagramm konnte nicht geladen werden.";
      return;
    }

    const safeRows = Array.isArray(rows) ? rows.filter(row => row && isFinite(row.year)) : [];

    if (!safeRows.length) {
      prChartDestroy();
      prChartSetEmptyState(true);
      return;
    }

    const orderedRows = safeRows
      .slice()
      .sort((a, b) => Number(a.year) - Number(b.year));
    const labels = orderedRows.map(row => String(row.year));
    const disciplines = prChartCollectDisciplines(orderedRows);
    const datasets = disciplines.map((discipline, index) => {
      const color = PR_CHART_COLORS[index % PR_CHART_COLORS.length];
      const actualScores = orderedRows.map(row => {
        const point = Array.isArray(row.disciplines)
          ? row.disciplines.find(entry => entry && entry.id === discipline.id)
          : null;

        return point && Number.isFinite(point.points) ? point.points : null;
      });
      const axisScores = actualScores.map(score =>
        score == null ? 0 : prChartScoreToAxisValue(score)
      );

      return {
        label: discipline.label,
        data: axisScores,
        actualScores,
        spanGaps: false,
        showLine: true,
        borderColor: color,
        backgroundColor: prChartHexToRgba(color, 0.16),
        borderWidth: 2.2,
        pointRadius(context) {
          const score = context.dataset.actualScores?.[context.dataIndex];
          return Number.isFinite(score) ? 2.2 : 0;
        },
        pointHoverRadius(context) {
          const score = context.dataset.actualScores?.[context.dataIndex];
          return Number.isFinite(score) ? 4.1 : 0;
        },
        pointBackgroundColor: color,
        pointBorderWidth: 0,
        fill: false,
        tension: 0.24
      };
    });

    prChartSetEmptyState(false);

    const context = canvas.getContext("2d");
    if (!context) return;

    prChartDestroy();

    prChartState.chart = new Chart(context, {
      type: "line",
      data: {
        labels,
        datasets: [
          ...datasets
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        plugins: {
          legend: {
            position: "top",
            align: "start",
            labels: {
              color: "#f9fafb",
              usePointStyle: true,
              boxWidth: 10,
              boxHeight: 10,
              padding: 16,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            backgroundColor: "rgba(15, 15, 18, 0.94)",
            titleColor: "#f9fafb",
            bodyColor: "#f9fafb",
            borderColor: "rgba(255, 255, 255, 0.15)",
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label(context) {
                const actualScore = context.dataset.actualScores?.[context.dataIndex];
                if (!Number.isFinite(actualScore)) {
                  return `${context.dataset.label}: -`;
                }
                return `${context.dataset.label}: ${prChartFormatNumber(actualScore)} P`;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              color: "rgba(249, 250, 251, 0.82)",
              maxRotation: 0,
              autoSkip: true
            },
            grid: {
              color: "rgba(255, 255, 255, 0.08)"
            }
          },
          y: {
            min: 0,
            max: PR_CHART_Y_STEPS.length - 1,
            ticks: {
              color: "rgba(249, 250, 251, 0.82)",
              stepSize: 1,
              callback(value) {
                const numericValue = Number(value);
                if (!Number.isInteger(numericValue)) return "";
                return PR_CHART_Y_STEPS[numericValue] ?? "";
              }
            },
            grid: {
              color: "rgba(255, 255, 255, 0.08)"
            }
          }
        }
      }
    });
  }

  function prChartFormatNumber(value) {
    const locale = window.prLangState && window.prLangState.current === "en" ? "en-GB" : "de-DE";
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  function prChartCollectDisciplines(rows) {
    const byId = new Map();

    rows.forEach(row => {
      if (!Array.isArray(row.disciplines)) return;

      row.disciplines.forEach(entry => {
        if (!entry || !entry.id || byId.has(entry.id)) return;
        byId.set(entry.id, {
          id: entry.id,
          label: entry.label || entry.id
        });
      });
    });

    return Array.from(byId.values());
  }

  function prChartScoreToAxisValue(score) {
    const safeScore = Math.max(PR_CHART_Y_STEPS[0], Math.min(PR_CHART_Y_STEPS[PR_CHART_Y_STEPS.length - 1], Number(score) || 0));

    for (let i = 0; i < PR_CHART_Y_STEPS.length - 1; i++) {
      const start = PR_CHART_Y_STEPS[i];
      const end = PR_CHART_Y_STEPS[i + 1];

      if (safeScore <= end) {
        const span = end - start || 1;
        return i + ((safeScore - start) / span);
      }
    }

    return PR_CHART_Y_STEPS.length - 1;
  }

  function prChartAxisValueToScore(axisValue) {
    const clampedValue = Math.max(0, Math.min(PR_CHART_Y_STEPS.length - 1, Number(axisValue) || 0));
    const baseIndex = Math.floor(clampedValue);
    const remainder = clampedValue - baseIndex;
    const start = PR_CHART_Y_STEPS[baseIndex];
    const end = PR_CHART_Y_STEPS[Math.min(baseIndex + 1, PR_CHART_Y_STEPS.length - 1)];

    if (baseIndex >= PR_CHART_Y_STEPS.length - 1) {
      return PR_CHART_Y_STEPS[PR_CHART_Y_STEPS.length - 1];
    }

    return start + ((end - start) * remainder);
  }

  function prChartHexToRgba(hex, alpha) {
    const safeHex = String(hex || "").replace("#", "");
    if (safeHex.length !== 6) return `rgba(255, 255, 255, ${alpha})`;

    const r = parseInt(safeHex.slice(0, 2), 16);
    const g = parseInt(safeHex.slice(2, 4), 16);
    const b = parseInt(safeHex.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
})();
