"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowDownRight, ArrowUpRight, LineChart as LineIcon } from "lucide-react"
import type { Point, useStatsHistory } from "@/hooks/use-stats-history"
import { formatDate, formatFullNumber, formatNumber } from "@/lib/format"
import type { Mod } from "@/lib/types"
import { cn } from "@/lib/utils"

type History = ReturnType<typeof useStatsHistory>

/* ---------------------------------------------------------------- chrome */

function ChartCard({
  title,
  subtitle,
  table,
  className,
  children,
}: {
  title: string
  subtitle?: React.ReactNode
  /** Rows for the accessible table view: [label, value]. */
  table?: { head: [string, string]; rows: [string, string][] }
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-4 rounded-2xl border bg-card p-4 sm:p-5", className)}>
      <header className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
      {table && table.rows.length > 0 && (
        <details className="group text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">View as table</summary>
          <table className="mt-2 w-full">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1.5 font-medium">{table.head[0]}</th>
                <th className="py-1.5 text-right font-medium">{table.head[1]}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {table.rows.map(([k, v]) => (
                <tr key={k} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">{k}</td>
                  <td className="py-1.5 text-right">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </section>
  )
}

function Tooltip({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      role="tooltip"
      style={style}
      className={cn(
        "pointer-events-none absolute z-20 whitespace-nowrap rounded-lg border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-lg",
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ---------------------------------------------------------- horizontal bars */

type BarItem = { id: string; label: string; value: number; detail?: string }

function BarList({ items, total, onSelect }: { items: BarItem[]; total: number; onSelect?: (id: string) => void }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const share = total ? item.value / total : 0
        return (
          <li key={item.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              disabled={!onSelect}
              className="grid w-full grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-md px-1 py-1 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none disabled:cursor-default sm:grid-cols-[minmax(0,13rem)_1fr]"
            >
              <span className="truncate text-xs text-muted-foreground group-hover:text-foreground">{item.label}</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-3.5 rounded-r-[4px] bg-chart-1"
                  style={{ width: `max(2px, ${(item.value / max) * 82}%)` }}
                />
                <span className="text-xs tabular-nums">{formatNumber(item.value)}</span>
              </span>
            </button>
            <Tooltip className="left-1/2 top-full mt-1 hidden group-hover:block group-focus-within:block">
              <div className="font-medium">{item.label}</div>
              <div className="text-muted-foreground">
                {formatFullNumber(item.value)} · {Math.round(share * 100)}% of total
                {item.detail ? ` · ${item.detail}` : ""}
              </div>
            </Tooltip>
          </li>
        )
      })}
    </ul>
  )
}

/* --------------------------------------------------------------- columns */

function ColumnChart({ data }: { data: { label: string; value: number; detail: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="flex h-44 items-end gap-1.5 border-b border-chart-grid pt-5">
      {data.map((d) => (
        <div key={d.label} className="group relative flex h-full flex-1 flex-col items-center justify-end">
          <span className="mb-1 text-[11px] tabular-nums text-muted-foreground">{d.value || ""}</span>
          <div
            className="w-full max-w-6 rounded-t-[4px] bg-chart-1 transition-opacity group-hover:opacity-80"
            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 2 : 0 }}
          />
          <span className="absolute -bottom-5 text-[11px] tabular-nums text-muted-foreground">{d.label}</span>
          <Tooltip className="bottom-full mb-1 hidden group-hover:block">
            <div className="font-medium">{d.label}</div>
            <div className="text-muted-foreground">{d.detail}</div>
          </Tooltip>
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ line */

function niceTicks(min: number, max: number, count = 3): number[] {
  if (max === min) return [min]
  const step0 = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0) ?? step0
  const start = Math.floor(min / step) * step
  const ticks: number[] = []
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(v)
  return ticks
}

/** Width of an element, tracked so SVG text is drawn at its real pixel size. */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

function LineChart({ points, label }: { points: Point[]; label: string }) {
  const ref = useRef<SVGSVGElement>(null)
  const [box, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const W = Math.max(width, 280)
  const H = 220
  const pad = { l: 44, r: 12, t: 12, b: 24 }

  const values = points.map((p) => p.value)
  const ticks = niceTicks(Math.min(...values), Math.max(...values))
  const yMin = Math.min(ticks[0], ...values)
  const yMax = Math.max(ticks[ticks.length - 1], ...values)
  const t0 = points[0].t
  const t1 = points[points.length - 1].t
  const x = (t: number) => pad.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - pad.l - pad.r)
  const y = (v: number) => pad.t + (1 - (v - yMin) / Math.max(1, yMax - yMin)) * (H - pad.t - pad.b)

  const line = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join("")
  const area = `${line}L${x(t1)},${H - pad.b}L${x(t0)},${H - pad.b}Z`
  const last = points[points.length - 1]
  const active = hover != null ? points[hover] : null

  function onMove(e: React.PointerEvent) {
    const rect = ref.current!.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    let best = 0
    for (let i = 1; i < points.length; i++) if (Math.abs(x(points[i].t) - px) < Math.abs(x(points[best].t) - px)) best = i
    setHover(best)
  }

  return (
    // The SVG is absolutely positioned so it never feeds its width back into the layout.
    <div ref={box} className="relative w-full min-w-0" style={{ height: H }}>
      <svg
        ref={ref}
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 touch-none overflow-visible"
        role="img"
        aria-label={`${label}: ${formatFullNumber(points[0].value)} on ${formatDate(t0 / 1000)} to ${formatFullNumber(last.value)} on ${formatDate(t1 / 1000)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-chart-grid" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px] tabular-nums">
              {formatNumber(t)}
            </text>
          </g>
        ))}
        <text x={pad.l} y={H - 4} className="fill-muted-foreground text-[11px]">
          {formatDate(t0 / 1000)}
        </text>
        <text x={W - pad.r} y={H - 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {formatDate(t1 / 1000)}
        </text>
        <path d={area} className="fill-chart-1" opacity={0.1} />
        <path d={line} className="stroke-chart-1" fill="none" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {active && (
          <line x1={x(active.t)} x2={x(active.t)} y1={pad.t} y2={H - pad.b} className="stroke-muted-foreground/50" strokeWidth={1} />
        )}
        {(active ? [active] : [last]).map((p) => (
          <circle key={p.t} cx={x(p.t)} cy={y(p.value)} r={4.5} className="fill-chart-1 stroke-card" strokeWidth={2} />
        ))}
      </svg>
      {active && (
        <Tooltip className={cn("top-0", x(active.t) > W / 2 ? "-translate-x-[calc(100%+12px)]" : "translate-x-3")} style={{ left: x(active.t) }}>
          <div className="font-medium tabular-nums">{formatFullNumber(active.value)}</div>
          <div className="text-muted-foreground">{formatDate(active.t / 1000)}</div>
        </Tooltip>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- insights */

const yearOf = (unix: number | null) => (unix ? new Date(unix * 1000).getFullYear() : null)

export function Insights({
  mods,
  scopeLabel,
  showGames,
  history,
  onSelect,
}: {
  mods: Mod[]
  scopeLabel: string
  showGames: boolean
  history: History
  onSelect: (id: string) => void
}) {
  const totalSubs = mods.reduce((s, m) => s + m.subscriptions, 0)

  const top = useMemo(
    () =>
      [...mods]
        .sort((a, b) => b.subscriptions - a.subscriptions)
        .slice(0, 10)
        .map((m) => ({ id: m.id, label: m.title, value: m.subscriptions, detail: m.game })),
    [mods],
  )

  const byGame = useMemo(() => {
    const map = new Map<string, { subs: number; count: number }>()
    for (const m of mods) {
      const g = map.get(m.game) ?? { subs: 0, count: 0 }
      map.set(m.game, { subs: g.subs + m.subscriptions, count: g.count + 1 })
    }
    return [...map.entries()]
      .sort((a, b) => b[1].subs - a[1].subs)
      .map(([game, g]) => ({ id: game, label: game, value: g.subs, detail: `${g.count} mod${g.count === 1 ? "" : "s"}` }))
  }, [mods])

  const perYear = useMemo(() => {
    const published = new Map<number, number>()
    const updated = new Map<number, number>()
    for (const m of mods) {
      const y = yearOf(m.createdAt)
      if (y) published.set(y, (published.get(y) ?? 0) + 1)
      const u = yearOf(m.updatedAt)
      if (u) updated.set(u, (updated.get(u) ?? 0) + 1)
    }
    const years = [...published.keys()]
    if (years.length === 0) return []
    const out = []
    for (let y = Math.min(...years); y <= new Date().getFullYear(); y++) {
      const n = published.get(y) ?? 0
      out.push({ label: String(y), value: n, detail: `${n} published · ${updated.get(y) ?? 0} last updated this year` })
    }
    return out
  }, [mods])

  const trend = history.series(mods)
  const trendDelta = trend.length > 1 ? trend[trend.length - 1].value - trend[0].value : 0

  const movers = useMemo(
    () =>
      mods
        .map((m) => ({ mod: m, delta: history.modDelta(m) }))
        .filter((x): x is { mod: Mod; delta: number } => x.delta != null && x.delta !== 0)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 6),
    [mods, history],
  )

  if (mods.length === 0) {
    return <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">No mods in {scopeLabel}.</p>
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ChartCard
        title="Subscriber trend"
        className="lg:col-span-2"
        subtitle={
          trend.length > 1 ? (
            <>
              {trendDelta >= 0 ? "+" : ""}
              {formatFullNumber(trendDelta)} since {formatDate(trend[0].t / 1000)} · {trend.length} daily snapshots on this device
            </>
          ) : (
            "Built from daily snapshots saved on this device"
          )
        }
        table={trend.length > 1 ? { head: ["Date", "Subscribers"], rows: trend.map((p) => [formatDate(p.t / 1000), formatFullNumber(p.value)]) } : undefined}
      >
        {trend.length > 1 ? (
          <LineChart points={trend} label={`Subscribers, ${scopeLabel}`} />
        ) : (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <LineIcon className="size-6 opacity-60" />
            The first snapshot is saved today. Check back tomorrow to see the trend start.
          </div>
        )}
      </ChartCard>

      <ChartCard
        title="Top mods by subscribers"
        subtitle={`Current subscribers · ${scopeLabel}`}
        table={{ head: ["Mod", "Subscribers"], rows: top.map((t) => [t.label, formatFullNumber(t.value)]) }}
      >
        <BarList items={top} total={totalSubs} onSelect={onSelect} />
      </ChartCard>

      <ChartCard
        title={history.baselineAt ? "Biggest movers" : "Most discussed"}
        subtitle={history.baselineAt ? `Subscriber change since ${formatDate(history.baselineAt / 1000)}` : "Comment counts · movers appear once there's history"}
      >
        {history.baselineAt && movers.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {movers.map(({ mod, delta }) => (
              <li key={mod.id}>
                <button type="button" onClick={() => onSelect(mod.id)} className="flex w-full items-center justify-between gap-3 py-2 text-left hover:text-primary">
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{mod.title}</span>
                    <span className="text-xs text-muted-foreground">{formatNumber(mod.subscriptions)} subscribers</span>
                  </span>
                  <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-sm font-medium tabular-nums", delta > 0 ? "text-updated" : "text-destructive")}>
                    {delta > 0 ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
                    {delta > 0 ? "+" : ""}
                    {formatFullNumber(delta)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <BarList
            items={[...mods]
              .sort((a, b) => b.commentCount - a.commentCount)
              .slice(0, 6)
              .map((m) => ({ id: m.id, label: m.title, value: m.commentCount }))}
            total={mods.reduce((s, m) => s + m.commentCount, 0)}
            onSelect={onSelect}
          />
        )}
      </ChartCard>

      {showGames && byGame.length > 1 && (
        <ChartCard
          title="Subscribers by game"
          subtitle="Where your audience is"
          table={{ head: ["Game", "Subscribers"], rows: byGame.map((g) => [g.label, formatFullNumber(g.value)]) }}
        >
          <BarList items={byGame} total={totalSubs} />
        </ChartCard>
      )}

      {perYear.length > 0 && (
        <ChartCard
          title="Mods published per year"
          subtitle={`${mods.length} total · ${scopeLabel}`}
          className={cn(!(showGames && byGame.length > 1) && "lg:col-span-2")}
          table={{ head: ["Year", "Published"], rows: perYear.map((d) => [d.label, String(d.value)]) }}
        >
          <div className="pb-5">
            <ColumnChart data={perYear} />
          </div>
        </ChartCard>
      )}
    </div>
  )
}
