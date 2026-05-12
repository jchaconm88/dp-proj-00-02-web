import { Chart } from "primereact/chart";
import { useMemo } from "react";
import type { SnapshotChart } from "./dashboard.types";

interface DashboardChartProps {
  chart: SnapshotChart;
}

/** Color palette for chart datasets */
const CHART_COLORS = [
  "rgba(99, 102, 241, 0.7)",   // indigo
  "rgba(16, 185, 129, 0.7)",   // emerald
  "rgba(245, 158, 11, 0.7)",   // amber
  "rgba(239, 68, 68, 0.7)",    // red
  "rgba(139, 92, 246, 0.7)",   // violet
  "rgba(6, 182, 212, 0.7)",    // cyan
  "rgba(236, 72, 153, 0.7)",   // pink
  "rgba(34, 197, 94, 0.7)",    // green
];

const CHART_BORDER_COLORS = [
  "rgba(99, 102, 241, 1)",
  "rgba(16, 185, 129, 1)",
  "rgba(245, 158, 11, 1)",
  "rgba(239, 68, 68, 1)",
  "rgba(139, 92, 246, 1)",
  "rgba(6, 182, 212, 1)",
  "rgba(236, 72, 153, 1)",
  "rgba(34, 197, 94, 1)",
];

/**
 * Renders a Chart.js chart (bar, line, pie, doughnut) from a SnapshotChart.
 * Uses PrimeReact's Chart component which wraps Chart.js.
 */
export default function DashboardChart({ chart }: DashboardChartProps) {
  const chartData = useMemo(() => {
    const isPieOrDoughnut = chart.chartType === "pie" || chart.chartType === "doughnut";

    const datasets = chart.datasets.map((ds, i) => {
      const colorIndex = i % CHART_COLORS.length;

      if (isPieOrDoughnut) {
        return {
          label: ds.label,
          data: ds.data,
          backgroundColor: ds.data.map((_, j) => CHART_COLORS[j % CHART_COLORS.length]),
          borderColor: ds.data.map((_, j) => CHART_BORDER_COLORS[j % CHART_BORDER_COLORS.length]),
          borderWidth: 1,
        };
      }

      return {
        label: ds.label,
        data: ds.data,
        backgroundColor: CHART_COLORS[colorIndex],
        borderColor: CHART_BORDER_COLORS[colorIndex],
        borderWidth: chart.chartType === "line" ? 2 : 1,
        fill: chart.chartType === "line" ? false : undefined,
        tension: chart.chartType === "line" ? 0.3 : undefined,
      };
    });

    return {
      labels: chart.labels,
      datasets,
    };
  }, [chart]);

  const chartOptions = useMemo(() => {
    const isPieOrDoughnut = chart.chartType === "pie" || chart.chartType === "doughnut";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: isPieOrDoughnut ? ("bottom" as const) : ("top" as const),
          labels: {
            color: "var(--dp-on-surface-soft, #94a3b8)",
            usePointStyle: true,
            pointStyle: "circle",
            padding: 16,
            font: { size: 11 },
          },
        },
      },
      scales: isPieOrDoughnut
        ? undefined
        : {
            x: {
              ticks: { color: "var(--dp-on-surface-soft, #94a3b8)", font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.05)" },
            },
            y: {
              ticks: { color: "var(--dp-on-surface-soft, #94a3b8)", font: { size: 10 } },
              grid: { color: "rgba(255,255,255,0.05)" },
              beginAtZero: true,
            },
          },
    };
  }, [chart.chartType]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[var(--dp-surface-low)]/85 p-5">
      <h3 className="mb-4 text-sm font-semibold text-[var(--dp-on-surface)]">{chart.title}</h3>
      <div style={{ height: "280px" }}>
        <Chart type={chart.chartType} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
