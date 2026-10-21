"use client";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { days, fmt, shift, today } from "@/lib/body";
// A small SVG line chart sized for this app's data (a few series, at most a
// few hundred points). It replaces a general charting library that was most
// of the JavaScript the phone downloaded.
export type Point = { date: string; value: number; hollow?: boolean };
export type Series = {
  name: string;
  color: string;
  points: Point[];
  width?: number;
  dots?: boolean;
};
const HEIGHT = 220,
  PAD = { top: 14, right: 12, bottom: 26, left: 40 };
function ticks(min: number, max: number) {
  const span = max - min || 1,
    raw = span / 4,
    mag = 10 ** Math.floor(Math.log10(raw)),
    step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw)!;
  const out: number[] = [];
  for (let v = Math.floor(min / step) * step; v <= max + step / 2; v += step)
    out.push(Number(v.toFixed(6)));
  return out;
}
const label = (date: string) => `${date.slice(8)}/${date.slice(5, 7)}`;
// A line drawn across weeks without records would suggest values nobody
// measured, so the line breaks where consecutive points are over 7 days apart.
const GAP_DAYS = 7;
function runs(points: Point[]) {
  const out: Point[][] = [];
  for (const p of points) {
    const run = out.at(-1),
      prev = run?.at(-1);
    if (run && prev && days(p.date, prev.date) <= GAP_DAYS) run.push(p);
    else out.push([p]);
  }
  return out;
}
export function TrendChart({
  series,
  period,
  unit,
  title,
  height = HEIGHT,
}: {
  series: Series[];
  period: number;
  unit: string;
  title: string;
  height?: number;
}) {
  const box = useRef<HTMLDivElement>(null),
    // Starts narrow so a phone never lays out wider than the screen before
    // the first measurement.
    [width, setWidth] = useState(320),
    [active, setActive] = useState<string | null>(null);
  const end = today(),
    start = shift(end, -period),
    shown = series.map((s) => ({
      ...s,
      points: s.points
        .filter((p) => p.date >= start && p.date <= end)
        .sort((a, b) => a.date.localeCompare(b.date)),
    })),
    values = shown.flatMap((s) => s.points.map((p) => p.value));
  const dates = [...new Set(shown.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const hasData = values.length > 0;
  // Re-attaches when the plot appears after an empty period.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(240, Math.round(entry.contentRect.width))),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasData]);
  if (!hasData) return null;
  const lo = Math.min(...values),
    hi = Math.max(...values),
    pad = Math.max((hi - lo) * 0.15, hi * 0.005, 0.5),
    yTicks = ticks(lo - pad, hi + pad),
    y0 = yTicks[0],
    y1 = yTicks.at(-1)!;
  const plotW = width - PAD.left - PAD.right,
    plotH = height - PAD.top - PAD.bottom;
  const x = (d: string) => PAD.left + (days(d, start) / period) * plotW,
    y = (v: number) => PAD.top + (1 - (v - y0) / (y1 - y0 || 1)) * plotH;
  const xTicks = [start, shift(end, -Math.round(period / 2)), end];
  const current = active ?? null;
  const pick = (clientX: number) => {
    const rect = box.current!.getBoundingClientRect(),
      px = clientX - rect.left;
    let best = dates[0];
    for (const d of dates)
      if (Math.abs(x(d) - px) < Math.abs(x(best) - px)) best = d;
    setActive(best);
  };
  const move = (e: KeyboardEvent) => {
    if (!dates.length) return;
    const i = current ? dates.indexOf(current) : dates.length;
    if (e.key === "ArrowLeft") setActive(dates[Math.max(0, i - 1)]);
    else if (e.key === "ArrowRight")
      setActive(dates[Math.min(dates.length - 1, i + 1)]);
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };
  const tipLeft = current ? Math.min(Math.max(x(current), 80), width - 80) : 0;
  return (
    <figure className="trend-chart">
      <div
        ref={box}
        className="trend-plot"
        style={{ height }}
        tabIndex={0}
        role="group"
        aria-label={`${title}. Use as setas para ler cada data.`}
        onPointerDown={(e) => pick(e.clientX)}
        onPointerMove={(e) => e.pointerType === "mouse" && pick(e.clientX)}
        onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
        onKeyDown={move}
        onBlur={() => setActive(null)}
      >
        <svg width={width} height={height} aria-hidden>
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(t)}
                y2={y(t)}
                className="grid-line"
              />
              <text x={PAD.left - 6} y={y(t) + 4} className="axis-label" textAnchor="end">
                {fmt(t, Number.isInteger(t) ? 0 : 1)}
              </text>
            </g>
          ))}
          <text x={4} y={PAD.top - 2} className="axis-label">
            {unit}
          </text>
          {xTicks.map((d, i) => (
            <text
              key={d}
              x={x(d)}
              y={height - 6}
              className="axis-label"
              textAnchor={i === 0 ? "start" : i === 2 ? "end" : "middle"}
            >
              {label(d)}
            </text>
          ))}
          {current && (
            <line
              x1={x(current)}
              x2={x(current)}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="cursor-line"
            />
          )}
          {shown.map((s) =>
            s.points.length ? (
              <g key={s.name}>
                {runs(s.points).map((run) =>
                  run.length > 1 ? (
                    <polyline
                      key={run[0].date}
                      fill="none"
                      stroke={s.color}
                      strokeWidth={s.width ?? 2}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={run.map((p) => `${x(p.date)},${y(p.value)}`).join(" ")}
                    />
                  ) : null,
                )}
                {(s.dots ?? true) &&
                  s.points.map((p) => (
                    <circle
                      key={p.date}
                      cx={x(p.date)}
                      cy={y(p.value)}
                      r={p.date === current ? 4.5 : 3}
                      fill={p.hollow ? "var(--card)" : s.color}
                      stroke={s.color}
                      strokeWidth={1.5}
                    />
                  ))}
              </g>
            ) : null,
          )}
        </svg>
        {current && (
          <div className="chart-tip" style={{ left: tipLeft }} aria-hidden>
            <strong>{label(current)}</strong>
            {shown.map((s) => {
              const p = s.points.find((q) => q.date === current);
              return p ? (
                <span key={s.name}>
                  <i style={{ background: s.color }} />
                  {s.name}: {fmt(p.value)} {unit}
                  {p.hollow ? " (referência)" : ""}
                </span>
              ) : null;
            })}
          </div>
        )}
      </div>
      <figcaption className="chart-legend">
        {shown
          .filter((s) => s.points.length)
          .map((s) => (
            <span key={s.name}>
              <i style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        {shown.some((s) => s.points.some((p) => p.hollow)) && (
          <span>
            <i className="hollow" />
            referência informada, não pesagem
          </span>
        )}
      </figcaption>
      {/* Tables ignore width: 1px, so the hidden data table sits in a div. */}
      <div className="sr-only">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Data</th>
            {shown.map((s) => (
              <th key={s.name}>
                {s.name} ({unit})
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dates.map((d) => (
            <tr key={d}>
              <td>{label(d)}</td>
              {shown.map((s) => (
                <td key={s.name}>
                  {fmt(s.points.find((p) => p.date === d)?.value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </figure>
  );
}
