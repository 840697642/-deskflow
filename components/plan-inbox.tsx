'use client'

import { useState } from 'react'
import { ChevronDown, ExternalLink, Inbox, X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button, Dialog, FOCUS_RING, IconButton, TONE_BADGE, TONE_BAR } from '@/components/ui-primitives'
import { INBOX_TYPE, TOOL_META, openDeepLink, type InboxItem } from '@/components/creation-shared'

// =============================================================================
// 计划看板收件箱：工具上报的想法 / 问题 / 任务先入托盘，采纳后才生成看板卡片。
// 采纳走 POST /inbox/:id/accept { column, priority, due, project }，忽略走 /dismiss。
// =============================================================================

export interface AcceptPayload {
  column: 'todo' | 'doing'
  priority: 'high' | 'medium' | 'low'
  due: string
  project: string
}

const PRIORITIES: { id: AcceptPayload['priority']; label: string }[] = [
  { id: 'high', label: '高' },
  { id: 'medium', label: '中' },
  { id: 'low', label: '低' },
]

export default function PlanInbox({
  items,
  onAccept,
  onDismiss,
}: {
  items: InboxItem[]
  onAccept: (id: string, payload: AcceptPayload) => void
  onDismiss: (id: string) => void
}) {
  const pending = items.filter((i) => i.status === 'pending')
  const [open, setOpen] = useState(pending.length > 0)
  const [accepting, setAccepting] = useState<InboxItem | null>(null)

  if (pending.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-4 py-3 text-[11px] text-muted-foreground">
        <Inbox className="size-4" aria-hidden="true" />
        收件箱为空。创作工具上报的想法与问题会先出现在这里，采纳后进入看板。
      </div>
    )
  }

  return (
    <>
      <section aria-label="计划收件箱" className="overflow-hidden rounded-lg bg-card shadow-sm">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={cn('flex h-12 w-full items-center gap-3 px-5 text-left transition-colors hover:bg-surface-raised', FOCUS_RING)}
        >
          <span className="flex size-7 items-center justify-center rounded-md bg-primary/8 text-primary">
            <Inbox className="size-4" aria-hidden="true" />
          </span>
          <span className="flex-1 text-[13px] font-medium text-foreground">
            收件箱 <span className="tabular-nums text-muted-foreground">{pending.length}</span>
          </span>
          <span className="hidden text-[11px] text-muted-foreground md:inline">来自创作工具的想法 / 问题 / 任务，采纳后生成看板卡片</span>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>

        {open && (
          <ul className="divide-y divide-border/60 border-t border-border/60">
            {pending.map((item) => {
              const t = TOOL_META[item.toolId]
              const ty = INBOX_TYPE[item.type]
              const Icon = t.icon
              return (
                <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                  <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md', t.badge)} title={t.short}>
                    <Icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[13px] font-medium leading-snug text-foreground">
                      <span className={cn('inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium', TONE_BADGE[ty.tone])}>
                        <span aria-hidden="true" className={cn('size-1.5 rounded-full', TONE_BAR[ty.tone])} />
                        {ty.label}
                      </span>
                      <span className="text-pretty">{item.title}</span>
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {t.short}
                      {item.project && ` · ${item.project}`}
                      {' · '}
                      {item.createdAt}
                      {item.note && <span className="text-muted-foreground/80"> · {item.note}</span>}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {item.refUrl && <IconButton label="在工具中查看" icon={ExternalLink} onClick={() => openDeepLink(item.refUrl!)} />}
                    <IconButton label="忽略" icon={X} onClick={() => onDismiss(item.id)} />
                    <Button variant="primary" className="h-8" onClick={() => setAccepting(item)}>
                      <Check className="size-3.5" aria-hidden="true" />
                      采纳
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {accepting && (
        <AcceptDialog
          item={accepting}
          onClose={() => setAccepting(null)}
          onConfirm={(payload) => {
            onAccept(accepting.id, payload)
            setAccepting(null)
          }}
        />
      )}
    </>
  )
}

function AcceptDialog({ item, onClose, onConfirm }: { item: InboxItem; onClose: () => void; onConfirm: (p: AcceptPayload) => void }) {
  const [column, setColumn] = useState<AcceptPayload['column']>('todo')
  const [priority, setPriority] = useState<AcceptPayload['priority']>(item.priority ?? (item.type === 'issue' ? 'high' : 'medium'))
  const [due, setDue] = useState('9 月 10 日')
  const [project, setProject] = useState(item.project ?? '')

  const t = TOOL_META[item.toolId]

  return (
    <Dialog open onClose={onClose} title="采纳到计划看板" description={`来自 ${t.short} · ${INBOX_TYPE[item.type].label}`} icon={Check} tone="primary" width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={() => onConfirm({ column, priority, due, project: project || t.short })}>
            生成卡片
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="rounded-md bg-muted px-3 py-2 text-[13px] leading-relaxed text-foreground text-pretty">{item.title}</p>

        <Field label="放入列">
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {(['todo', 'doing'] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColumn(c)}
                className={cn('h-8 flex-1 rounded text-[13px] transition-colors', column === c ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground', FOCUS_RING)}
              >
                {c === 'todo' ? '待办' : '进行中'}
              </button>
            ))}
          </div>
        </Field>

        <Field label="优先级">
          <div className="flex gap-1 rounded-md bg-muted p-0.5">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id)}
                className={cn('h-8 flex-1 rounded text-[13px] transition-colors', priority === p.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground', FOCUS_RING)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="截止">
            <input
              value={due}
              onChange={(e) => setDue(e.target.value)}
              className={cn('h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground', FOCUS_RING)}
            />
          </Field>
          <Field label="项目">
            <input
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder={t.short}
              className={cn('h-9 w-full rounded-md border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground', FOCUS_RING)}
            />
          </Field>
        </div>
      </div>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  )
}
