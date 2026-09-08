import { useEffect, useMemo, useRef, useState } from "react";
import Chart from "chart.js/auto";
import type { ChartConfiguration } from "chart.js";
import type { Place } from "./types";
import { formatCount, formatRating } from "./helpers";

type Props = {
  places: Place[];
  dark: boolean;
  onOpenPlace: (id: string) => void;
};

const POPULAR_DAYS: [string, string][] = [
  ["Saturday", "Sabtu (Peak)"],
  ["Sunday", "Minggu"],
  ["Friday", "Jumat"],
  ["Monday", "Senin"],
  ["Tuesday", "Selasa"],
  ["Wednesday", "Rabu"],
  ["Thursday", "Kamis"],
];

// Insight statis mengikuti ref — dihitung ulang kasar dari data saat render
function KeyInsights({ places }: { places: Place[] }) {
  const insight = useMemo(() => {
    const counts = new Map<string, number>();
    places.forEach((p) =>
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1),
    );
    const top2 = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
    const top2Sum = top2.reduce((acc, x) => acc + x[1], 0);
    const pct = places.length ? Math.round((top2Sum / places.length) * 100) : 0;
    const withOutdoor = places.filter((p) =>
      JSON.stringify(p.about).toLowerCase().includes("terbuka"),
    ).length;
    const outdoorPct = places.length
      ? Math.round((withOutdoor / places.length) * 100)
      : 0;

    return {
      topLabel: top2.map(([c, n]) => `${c} (${n})`).join(" dan "),
      pct,
      outdoorPct,
    };
  }, [places]);

  return (
    <ul className="text-xs space-y-2.5 text-slate-600 dark:text-slate-300">
      <li className="flex items-start space-x-2">
        <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
        <span>
          <strong>Dominasi Kafe &amp; Resto:</strong> {insight.topLabel}{" "}
          membentuk ~{insight.pct}% dari total titik kuliner.
        </span>
      </li>
      <li className="flex items-start space-x-2">
        <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
        <span>
          <strong>Jam Puncak:</strong> Kunjungan tertinggi terjadi pada pukul{" "}
          <strong>19:00 - 21:00</strong> dengan hari Sabtu sebagai hari paling
          ramai.
        </span>
      </li>
      <li className="flex items-start space-x-2">
        <i className="fa-solid fa-circle-check text-emerald-500 mt-0.5"></i>
        <span>
          <strong>Fasilitas Utama:</strong> Hampir semua tempat menyediakan area
          santai nyaman, {insight.outdoorPct}% menyediakan outdoor seating, dan
          sebagian besar ramah laptop.
        </span>
      </li>
    </ul>
  );
}

export function AnalyticsTab({ places, dark, onOpenPlace }: Props) {
  const [popularDay, setPopularDay] = useState("Saturday");
  const catCanvas = useRef<HTMLCanvasElement | null>(null);
  const ratingCanvas = useRef<HTMLCanvasElement | null>(null);
  const priceCanvas = useRef<HTMLCanvasElement | null>(null);
  const popularCanvas = useRef<HTMLCanvasElement | null>(null);
  const chartsRef = useRef<Chart[]>([]);

  const colors = dark
    ? { text: "#cbd5e1", grid: "rgba(255,255,255,0.08)" }
    : { text: "#475569", grid: "rgba(0,0,0,0.06)" };

  // Init/re-init chart saat data atau tema berubah (port dari initCharts)
  useEffect(() => {
    const canvasEls = [catCanvas, ratingCanvas, priceCanvas, popularCanvas];
    if (canvasEls.some((r) => !r.current)) return;

    chartsRef.current.forEach((c) => c.destroy());
    chartsRef.current = [];

    // 1. Komposisi kategori (doughnut)
    const catCounts = new Map<string, number>();
    places.forEach((p) =>
      catCounts.set(p.category, (catCounts.get(p.category) ?? 0) + 1),
    );
    const topCats = [...catCounts.entries()].sort((a, b) => b[1] - a[1]);
    const catLabels = topCats.slice(0, 6).map((x) => x[0]);
    const catData = topCats.slice(0, 6).map((x) => x[1]);
    const otherSum = topCats.slice(6).reduce((acc, x) => acc + x[1], 0);
    if (otherSum > 0) {
      catLabels.push("Lainnya");
      catData.push(otherSum);
    }

    chartsRef.current.push(
      new Chart(catCanvas.current!, {
        type: "doughnut",
        data: {
          labels: catLabels,
          datasets: [
            {
              data: catData,
              backgroundColor: [
                "#f59e0b",
                "#3b82f6",
                "#ea580c",
                "#14b8a6",
                "#ef4444",
                "#8b5cf6",
                "#94a3b8",
              ],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "right",
              labels: { color: colors.text, font: { size: 11 } },
            },
          },
        } as ChartConfiguration<"doughnut">["options"],
      }),
    );

    // 2. Distribusi rating (bar)
    const ratingBuckets: Record<string, number> = {
      "4.8 - 5.0": 0,
      "4.5 - 4.7": 0,
      "4.0 - 4.4": 0,
      "< 4.0": 0,
    };
    places.forEach((p) => {
      const r = p.rating ?? 0;
      if (r >= 4.8) ratingBuckets["4.8 - 5.0"]++;
      else if (r >= 4.5) ratingBuckets["4.5 - 4.7"]++;
      else if (r >= 4.0) ratingBuckets["4.0 - 4.4"]++;
      else ratingBuckets["< 4.0"]++;
    });

    chartsRef.current.push(
      new Chart(ratingCanvas.current!, {
        type: "bar",
        data: {
          labels: Object.keys(ratingBuckets),
          datasets: [
            {
              label: "Jumlah Tempat",
              data: Object.values(ratingBuckets),
              backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e"],
              borderRadius: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { display: false } },
            y: { ticks: { color: colors.text }, grid: { color: colors.grid } },
          },
        } as ChartConfiguration<"bar">["options"],
      }),
    );

    // 3. Rentang harga (bar horizontal)
    const priceBuckets = new Map<string, number>();
    places.forEach((p) => {
      const pr = p.price_range || "Tidak Tercantum";
      priceBuckets.set(pr, (priceBuckets.get(pr) ?? 0) + 1);
    });
    const topPrices = [...priceBuckets.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    chartsRef.current.push(
      new Chart(priceCanvas.current!, {
        type: "bar",
        data: {
          labels: topPrices.map((x) => x[0]),
          datasets: [
            {
              label: "Tempat",
              data: topPrices.map((x) => x[1]),
              backgroundColor: "#0d9488",
              borderRadius: 6,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: colors.text }, grid: { color: colors.grid } },
            y: { ticks: { color: colors.text }, grid: { display: false } },
          },
        } as ChartConfiguration<"bar">["options"],
      }),
    );

    // 4. Popular times (line) — port dari updatePopularTimesChart
    const hourlySums = new Array(24).fill(0) as number[];
    const hourlyCounts = new Array(24).fill(0) as number[];
    places.forEach((p) => {
      const dayData = p.popular_times?.[popularDay];
      if (!dayData) return;
      Object.entries(dayData).forEach(([hStr, val]) => {
        const h = parseInt(hStr);
        if (h >= 0 && h < 24) {
          hourlySums[h] += val;
          hourlyCounts[h]++;
        }
      });
    });
    const hourlyAvgs = hourlySums.map((sum, i) =>
      hourlyCounts[i] ? Math.round(sum / hourlyCounts[i]) : 0,
    );
    const hoursLabels = Array.from(
      { length: 24 },
      (_, i) => `${String(i).padStart(2, "0")}:00`,
    );

    chartsRef.current.push(
      new Chart(popularCanvas.current!, {
        type: "line",
        data: {
          labels: hoursLabels,
          datasets: [
            {
              label: "Indeks Keramaian Rata-Rata",
              data: hourlyAvgs,
              borderColor: "#6366f1",
              backgroundColor: "rgba(99, 102, 241, 0.15)",
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: "#6366f1",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: { color: colors.text, maxTicksLimit: 8 },
              grid: { display: false },
            },
            y: {
              ticks: { color: colors.text },
              grid: { color: colors.grid },
              min: 0,
            },
          },
        } as ChartConfiguration<"line">["options"],
      }),
    );

    return () => {
      chartsRef.current.forEach((c) => c.destroy());
      chartsRef.current = [];
    };
  }, [places, dark, popularDay, colors.text, colors.grid]);

  // Leaderboards (port dari renderLeaderboards)
  const topReviewed = useMemo(
    () =>
      [...places]
        .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
        .slice(0, 5),
    [places],
  );

  const topRated = useMemo(
    () =>
      [...places]
        .filter((p) => (p.review_count || 0) >= 100)
        .sort((a, b) => {
          if (b.rating === a.rating)
            return (b.review_count || 0) - (a.review_count || 0);
          return (b.rating ?? 0) - (a.rating ?? 0);
        })
        .slice(0, 5),
    [places],
  );

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex-grow space-y-6">
      {/* Row 1: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <i className="fa-solid fa-chart-pie text-emerald-500 mr-2"></i>{" "}
                Komposisi Kategori F&amp;B
              </h3>
              <p className="text-xs text-slate-500">
                Persebaran jenis tempat kuliner di Tegal &amp; sekitarnya
              </p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <canvas ref={catCanvas}></canvas>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <i className="fa-solid fa-chart-simple text-amber-500 mr-2"></i>{" "}
                Distribusi Rating Google Maps
              </h3>
              <p className="text-xs text-slate-500">
                Rata-rata kepuasan pengunjung berdasarkan bintang
              </p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <canvas ref={ratingCanvas}></canvas>
          </div>
        </div>
      </div>

      {/* Row 2: Price and Popular Times */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <i className="fa-solid fa-money-bill-wave text-teal-500 mr-2"></i>{" "}
                Persebaran Rentang Harga
              </h3>
              <p className="text-xs text-slate-500">
                Tingkat pengeluaran rata-rata per orang
              </p>
            </div>
          </div>
          <div className="h-64 flex items-center justify-center">
            <canvas ref={priceCanvas}></canvas>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center">
                <i className="fa-solid fa-users text-indigo-500 mr-2"></i> Kurva
                Jam Sibuk (Popular Times)
              </h3>
              <p className="text-xs text-slate-500">
                Indeks keramaian per jam (24 jam)
              </p>
            </div>
            <select
              value={popularDay}
              onChange={(e) => setPopularDay(e.target.value)}
              className="text-xs px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700"
            >
              {POPULAR_DAYS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64 flex items-center justify-center">
            <canvas ref={popularCanvas}></canvas>
          </div>
        </div>
      </div>

      {/* Row 3: Leaderboards & Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
            <i className="fa-solid fa-fire text-rose-500 mr-2"></i> Top 5
            Terpopuler (Paling Banyak Diulas)
          </h4>
          <div className="space-y-3">
            {topReviewed.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onOpenPlace(p.id)}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:text-emerald-600 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 font-bold flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-400">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-700 dark:text-slate-300">
                    {formatCount(p.review_count)}
                  </div>
                  <div className="text-[10px] text-amber-500">
                    ★ {formatRating(p)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
            <i className="fa-solid fa-award text-amber-500 mr-2"></i> Top 5
            Rating Tertinggi (Min. 100 Ulasan)
          </h4>
          <div className="space-y-3">
            {topRated.map((p, idx) => (
              <div
                key={p.id}
                onClick={() => onOpenPlace(p.id)}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer hover:text-emerald-600 transition"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-50 dark:bg-amber-950 font-bold flex items-center justify-center text-[10px] text-amber-700 dark:text-amber-300">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200 line-clamp-1">
                      {p.title}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {p.category}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-amber-500">
                    ★ {formatRating(p)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    ({formatCount(p.review_count)} ulasan)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center">
              <i className="fa-solid fa-lightbulb text-emerald-500 mr-2"></i>{" "}
              Temuan Analisis Kunci
            </h4>
            <KeyInsights places={places} />
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
            Analisis otomatis dari Google Maps Places Dataset
          </div>
        </div>
      </div>
    </section>
  );
}
