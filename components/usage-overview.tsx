'use client'

import { useMemo, useState } from 'react'
import { Coins, Timer, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING, SectionHeader, TONE_BADGE } from '@/components/ui-primitives'
import { TOOL_META, TOOL_ORDER, fmtCost, fmtMinutes, fmtTokens, type ToolId, type ToolTimeDay, type Usage } from '@/components/creation-shared'

// =============================================================================
// 用量与花费：工具 × 模型 × 项目，今日 / 本周 / 本月；前端聚合原子记录。
// 数据来自 GET /usage?group=tool|model|project&range=today|week|month
// =============================================================================

export type UsageRange = 'today' | 'week' | 'month'

const RANGE_LABEL: Record<UsageRange, string> = { today: '今日', week: '本周', month: '本月' }

/** 以 today 为锚，按天数窗口过滤 */
function inRange(day: string, today: string, range: UsageRange) {
  if (range === 'today') return day === today
  const d = new Date(day).getTime()
  const t = new Date(today).getTime()
  const diff = (t - d) / 86_400_000
  return range === 'week' ? diff >= 0 && diff < 7 : diff >= 0 && diff < 30
}

interface Agg {
  cost: number
  tokens: number
}

export function aggregate(usage: Usage[], today: string, range: UsageRange, by: 'toolId' | 'model' | 'project', toolId?: ToolId) {
  const map = new Map<string, Agg>()
  for (const u of usage) {
    if (!inRange(u.day, today, range)) continue
    if (toolId && u.toolId !== toolId) continue
    const key = u[by]
    const cur = map.get(key) ?? { cost: 0, tokens: 0 }
    cur.cost += u.cost
    cur.tokens += u.tokensIn + u.tokensOut
    map.set(key, cur)
  }
  return [...map.entries()].map(([key, v]) => ({ key, ...v })).sort((a, b) => b.cost - a.cost)
}

export function totalFor(usage: Usage[], today: string, range: UsageRange, toolId?: ToolId): Agg {
  return aggregate(usage, today, range, 'toolId', toolId).reduce((acc, r) => ({ cost: acc.cost + r.cost, tokens: acc.tokens + r.tokens }), { cost: 0, tokens: 0 })
}

function RangeTabs({ value, onChange }: { value: UsageRange; onChange: (r: UsageRange) => void }) {
  return (
    <div role="tablist" aria-label="统计范围" className="flex gap-0.5 rounded-md bg-muted p-0.5">
      {(Object.keys(RANGE_LABEL) as UsageRange[]).map((r) => (
        <button
          key={r}
          role="tab"
          type="button"
          aria-selected={value === r}
          onClick={() => onChange(r)}
          className={cn('h-7 rounded px-2.5 text-[11px] font-medium transition-colors', value === r ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground', FOCUS_RING)}
        >
          {RANGE_LABEL[r]}
        </button>
      ))}
    </div>
  )
}

// -----------------------------------------------------------------------------
// 今日焦点用：三工具花费总览（今日 + 本月对比条）
// -----------------------------------------------------------------------------

export function UsageSummary({
  usage,
  today,
  budgets,
  onNavigate,
}: {
  usage: Usage[]
  today: string
  /** 每工具月度预算（元），undefined 表示未设 */
  budgets: Partial<Record<ToolId, number>>
  onNavigate?: (toolId: ToolId) => void
}) {
  const [range, setRange] = useState<UsageRange>('today')
  const rows = useMemo(
    () =>
      TOOL_ORDER.map((id) => ({
        id,
        now: totalFor(usage, today, range, id),
        month: totalFor(usage, today, 'month', id),
      })),
    [usage, today, range],
  )
  const total = rows.reduce((s, r) => s + r.now.cost, 0)
  const max = Math.max(...rows.map((r) => r.now.cost), 0.01)

  return (
    <section aria-labelledby="usage-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title="用量与花费">
        <RangeTabs value={range} onChange={setRange} />
      </SectionHeader>
      <span id="usage-heading" className="sr-only">
        用量与花费
      </span>
      <div className="flex flex-col gap-4 px-6 pb-6">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{fmtCost(total)}</span>
          <span className="text-[11px] text-muted-foreground">{RANGE_LABEL[range]}合计 · {fmtTokens(rows.reduce((s, r) => s + r.now.tokens, 0))} tokens</span>
        </div>
        <ul className="flex flex-col gap-3">
          {rows.map((r) => {
            const t = TOOL_META[r.id]
            const Icon = t.icon
            const budget = budgets[r.id]
            const ratio = budget ? r.month.cost / budget : null
            const over = ratio !== null && ratio >= 1
            const warn = ratio !== null && ratio >= 0.8 && !over
            return (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => onNavigate?.(r.id)}
                  className={cn('flex w-full flex-col gap-1.5 rounded-md text-left', onNavigate && 'hover:bg-surface-raised -mx-2 px-2 py-1', FOCUS_RING)}
                >
                  <span className="flex items-center gap-2 text-[13px]">
                    <Icon className={cn('size-4 shrink-0', t.text)} aria-hidden="true" />
                    <span className="flex-1 truncate text-foreground">{t.short}</span>
                    <span className="tabular-nums text-foreground">{fmtCost(r.now.cost)}</span>
                    <span className="w-16 text-right text-[11px] tabular-nums text-muted-foreground">{fmtTokens(r.now.tokens)} tok</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <span className={cn('block h-full rounded-full transition-[width] duration-300', t.bar)} style={{ width: `${(r.now.cost / max) * 100}%` }} />
                    </span>
                    {budget !== undefined && (
                      <span className={cn('shrink-0 text-[11px] tabular-nums', over ? 'text-destructive' : warn ? 'text-warning' : 'text-muted-foreground')}>
                        本月 {fmtCost(r.month.cost)} / {fmtCost(budget)}
                        {(over || warn) && <TriangleAlert className="ml-1 inline size-3 align-[-1px]" aria-label={over ? '已超预算' : '接近预算'} />}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

// -----------------------------------------------------------------------------
// 工作室页用：按模型 / 按项目明细 + 预算进度
// -----------------------------------------------------------------------------

export function UsageBreakdown({ usage, today, toolId, budget }: { usage: Usage[]; today: string; toolId: ToolId; budget?: number }) {
  const [range, setRange] = useState<UsageRange>('month')
  const [by, setBy] = useState<'model' | 'project'>('model')
  const rows = useMemo(() => aggregate(usage, today, range, by, toolId), [usage, today, range, by, toolId])
  const total = rows.reduce((s, r) => s + r.cost, 0)
  const month = totalFor(usage, today, 'month', toolId).cost
  const ratio = budget ? Math.min(month / budget, 1) : null
  const over = budget !== undefined && month >= budget
  const t = TOOL_META[toolId]

  return (
    <section aria-label="本工具用量明细" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
        <h3 className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Coins className="size-4 text-muted-foreground" aria-hidden="true" />
          用量明细
          <span className="tabular-nums text-muted-foreground">{fmtCost(total)}</span>
        </h3>
        <div className="flex items-center gap-2">
          <div role="tablist" aria-label="分组维度" className="flex gap-0.5 rounded-md bg-muted p-0.5">
            {(['model', 'project'] as const).map((b) => (
              <button
                key={b}
                role="tab"
                type="button"
                aria-selected={by === b}
                onClick={() => setBy(b)}
                className={cn('h-7 rounded px-2.5 text-[11px] font-medium transition-colors', by === b ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground', FOCUS_RING)}
              >
                {b === 'model' ? '按模型' : '按项目'}
              </button>
            ))}
          </div>
          <RangeTabs value={range} onChange={setRange} />
        </div>
      </div>

      {budget !== undefined && (
        <div className="flex items-center gap-3 border-t border-border/60 px-5 py-2.5 text-[11px]">
          <span className="text-muted-foreground">本月预算</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <span className={cn('block h-full rounded-full', over ? 'bg-destructive' : ratio! >= 0.8 ? 'bg-warning' : t.bar)} style={{ width: `${(ratio ?? 0) * 100}%` }} />
          </span>
          <span className={cn('tabular-nums', over ? 'text-destructive font-medium' : 'text-foreground')}>
            {fmtCost(month)} / {fmtCost(budget)}
          </span>
          {over && <span className={cn('rounded px-1.5 font-medium', TONE_BADGE.danger)}>已超额</span>}
        </div>
      )}

      <table className="w-full border-t border-border/60 text-[13px]">
        <thead>
          <tr className="text-left text-[11px] text-muted-foreground">
            <th className="px-5 py-2 font-medium">{by === 'model' ? '模型' : '项目'}</th>
            <th className="px-3 py-2 text-right font-medium">Tokens</th>
            <th className="px-3 py-2 text-right font-medium">花费</th>
            <th className="w-32 px-5 py-2 font-medium">占比</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-5 py-6 text-center text-[11px] text-muted-foreground">
                该范围内暂无用量记录
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.key}>
                <td className={cn('px-5 py-2 text-foreground', by === 'model' && 'font-mono text-[12px]')}>{r.key}</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{fmtTokens(r.tokens)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{fmtCost(r.cost)}</td>
                <td className="px-5 py-2">
                  <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span className={cn('block h-full rounded-full', t.bar)} style={{ width: `${total ? (r.cost / total) * 100 : 0}%` }} />
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  )
}

// -----------------------------------------------------------------------------
// 今日焦点用：近 7 天各工具使用时长比例（堆叠条）+ 今日占比
// -----------------------------------------------------------------------------

export function ToolTimeShare({ days }: { days: ToolTimeDay[] }) {
  const todayRow = days[days.length - 1]
  const todayTotal = todayRow ? TOOL_ORDER.reduce((s, id) => s + todayRow.minutes[id], 0) : 0
  const weekTotal = days.reduce((s, d) => s + TOOL_ORDER.reduce((x, id) => x + d.minutes[id], 0), 0)
  const maxDay = Math.max(...days.map((d) => TOOL_ORDER.reduce((s, id) => s + d.minutes[id], 0)), 1)

  return (
    <section aria-labelledby="time-heading" className="overflow-hidden rounded-lg bg-card shadow-sm">
      <SectionHeader title="创作时长">
        <span className="text-[11px] tabular-nums text-muted-foreground">近 7 天 {fmtMinutes(weekTotal)}</span>
      </SectionHeader>
      <span id="time-heading" className="sr-only">
        创作工具使用时长
      </span>
      <div className="flex flex-col gap-5 px-6 pb-6">
        {/* 今日占比 */}
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between">
            <span className="flex items-center gap-1.5 text-[13px] text-foreground">
              <Timer className="size-4 text-muted-foreground" aria-hidden="true" />
              今日 {fmtMinutes(todayTotal)}
            </span>
          </div>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`今日各工具时长：${TOOL_ORDER.map((id) => `${TOOL_META[id].short} ${fmtMinutes(todayRow?.minutes[id] ?? 0)}`).join('，')}`}>
            {todayRow &&
              TOOL_ORDER.map((id) => (
                <span key={id} className={cn('h-full', TOOL_META[id].bar)} style={{ width: `${todayTotal ? (todayRow.minutes[id] / todayTotal) * 100 : 0}%` }} />
              ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {TOOL_ORDER.map((id) => {
              const m = todayRow?.minutes[id] ?? 0
              return (
                <li key={id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span aria-hidden="true" className={cn('size-2 rounded-full', TOOL_META[id].bar)} />
                  {TOOL_META[id].short}
                  <span className="tabular-nums text-foreground">{todayTotal ? Math.round((m / todayTotal) * 100) : 0}%</span>
                </li>
              )
            })}
          </ul>
        </div>

        {/* 近 7 天堆叠柱 */}
        <div className="flex items-end gap-2" role="img" aria-label="近 7 天每日各工具使用时长">
          {days.map((d) => {
            const total = TOOL_ORDER.reduce((s, id) => s + d.minutes[id], 0)
            const isToday = d === todayRow
            const BAR_PX = 96
            return (
              <div key={d.day} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                <div className="flex w-full flex-col-reverse overflow-hidden rounded-sm bg-muted/60" style={{ height: BAR_PX }} title={`${d.label} · ${fmtMinutes(total)}`}>
                  {TOOL_ORDER.map((id) => (
                    <span key={id} className={cn('block w-full shrink-0', TOOL_META[id].bar, !isToday && 'opacity-70')} style={{ height: Math.round((d.minutes[id] / maxDay) * BAR_PX) }} />
                  ))}
                </div>
                <span className={cn('text-[11px] tabular-nums', isToday ? 'font-medium text-foreground' : 'text-muted-foreground')}>{d.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
