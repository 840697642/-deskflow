'use client'

import { useMemo, useState } from 'react'
import {
  Activity, AppWindow, Archive, ArrowUpRight, Bot, Box, Check, CircleHelp, Clock3, Command, FolderKanban, Gamepad2, HeartPulse, Inbox, LayoutDashboard, Library, ListTodo, MoreHorizontal, Plus, RefreshCw, Search, Settings2, Sparkles, TerminalSquare, Video, X, Zap,
} from 'lucide-react'

const navGroups = [
  { label: '工作空间', items: [['工作台', LayoutDashboard], ['项目', FolderKanban], ['任务队列', ListTodo]] },
  { label: '创作工具', items: [['AI 视频', Video], ['Harmony Game', GamepadIcon], ['App Dev', AppWindow], ['知识库', Library]] },
  { label: '系统', items: [['Skills', Sparkles], ['日志', TerminalSquare], ['设置', Settings2]] },
] as const

function GamepadIcon(props: React.ComponentProps<typeof Gamepad2>) { return <Gamepad2 {...props} /> }
import { Gamepad2 } from 'lucide-react'

type Task = { id: number; title: string; tag: string; time: string; done?: boolean }
type Job = { id: number; title: string; type: string; progress: number; eta: string; state: '运行中' | '已暂停' }

const initialTasks: Task[] = [
  { id: 1, title: '审定 AI 视频脚本', tag: '高优先级', time: '30 分钟' },
  { id: 2, title: '生成角色模型与表情库', tag: '创作', time: '1 小时' },
  { id: 3, title: '整理本周研究笔记', tag: '知识库', time: '45 分钟' },
  { id: 4, title: '发布 Harmony Game 原型', tag: '项目', time: '20 分钟' },
]
const initialJobs: Job[] = [
  { id: 1, title: 'Scene-01 / 叙事镜头生成', type: 'AI VIDEO', progress: 68, eta: '约 12 分钟', state: '运行中' },
  { id: 2, title: '角色表情集 · v3', type: 'COMFYUI', progress: 42, eta: '约 8 分钟', state: '运行中' },
  { id: 3, title: 'Demo build / Windows x64', type: 'APP DEV', progress: 84, eta: '约 3 分钟', state: '已暂停' },
]

const modules = [
  ['ComfyUI', '健康', '本地服务 · 12 秒前', 'bg-primary'], ['FFmpeg', '健康', '转码服务 · 1 分钟前', 'bg-primary'], ['Obsidian', '健康', '知识库 · 2 分钟前', 'bg-primary'], ['Local API', '警告', '需要重新连接', 'bg-accent'], ['GPU Worker', '健康', 'RTX 4090 · 空闲', 'bg-primary'], ['Windows CLI', '离线', '等待启动', 'bg-muted-foreground'],
]

export default function WorkbenchShell() {
  const [active, setActive] = useState('工作台')
  const [tasks, setTasks] = useState(initialTasks)
  const [jobs, setJobs] = useState(initialJobs)
  const [selected, setSelected] = useState<{ title: string; type: string } | null>(null)
  const [search, setSearch] = useState('')
  const [notice, setNotice] = useState('')
  const filteredTasks = useMemo(() => tasks.filter((task) => task.title.includes(search)), [tasks, search])
  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2200) }

  const completeTask = (id: number) => { setTasks((items) => items.map((task) => task.id === id ? { ...task, done: true } : task)); toast('任务已标记完成') }
  const toggleJob = (id: number) => setJobs((items) => items.map((job) => job.id === id ? { ...job, state: job.state === '运行中' ? '已暂停' : '运行中' } : job))

  return <div className="min-h-screen bg-background text-foreground antialiased">
    <aside className="fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-border/80 bg-card/80 px-3 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-3 px-3 pb-7"><div className="grid size-8 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"><Sparkles className="size-4" /></div><div><p className="text-sm font-semibold tracking-tight">Atlas Studio</p><p className="text-[11px] text-muted-foreground">创意工作台</p></div></div>
      <div className="mb-4 flex items-center justify-between px-3"><span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">导航</span><Command className="size-3.5 text-muted-foreground" /></div>
      <nav className="flex flex-1 flex-col gap-6">{navGroups.map((group) => <div key={group.label}><p className="px-3 pb-2 text-[11px] font-medium text-muted-foreground">{group.label}</p><div className="flex flex-col gap-1">{group.items.map(([label, Icon]) => <button key={label} onClick={() => { setActive(label); if (label !== '工作台') toast(`${label} 模块即将开放`) }} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors ${active === label ? 'bg-primary/10 font-medium text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon className="size-4" />{label}{label === '任务队列' && <span className="ml-auto rounded-full bg-accent/15 px-1.5 text-[10px] text-accent">3</span>}</button>)}</div></div>)}</nav>
      <div className="rounded-xl border border-border bg-muted/50 p-3"><div className="flex items-center gap-2 text-xs font-medium"><HeartPulse className="size-3.5 text-primary" />系统健康</div><p className="mt-1 text-[11px] text-muted-foreground">5 / 6 个模块正常</p><div className="mt-2 h-1 overflow-hidden rounded-full bg-border"><div className="h-full w-[83%] rounded-full bg-primary" /></div></div>
      <div className="mt-3 flex items-center gap-3 border-t border-border pt-3"><div className="grid size-8 place-items-center rounded-full bg-primary/15 text-xs font-semibold text-primary">L</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">Lin Chen</p><p className="truncate text-[11px] text-muted-foreground">个人工作区</p></div><MoreHorizontal className="size-4 text-muted-foreground" /></div>
    </aside>
    <div className="ml-56 flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b border-border/80 bg-card/75 px-7 backdrop-blur-xl"><div className="flex-1"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><span>Atlas Studio</span><span>/</span><span className="text-foreground">{active}</span></div><h1 className="text-lg font-semibold tracking-tight">{active === '工作台' ? '工作台总览' : active}</h1></div><label className="hidden items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 md:flex"><Search className="size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索工作台..." className="w-44 bg-transparent text-xs outline-none placeholder:text-muted-foreground" /><kbd className="rounded border border-border bg-card px-1.5 text-[10px] text-muted-foreground">⌘ K</kbd></label><div className="flex items-center gap-3"><div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex"><span className="size-2 rounded-full bg-primary" />已同步</div><button onClick={() => toast('所有模块已刷新')} aria-label="刷新" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><RefreshCw className="size-4" /></button><button onClick={() => toast('暂无新通知')} aria-label="通知" className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Inbox className="size-4" /><span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-accent" /></button></div></header>
      <main className="flex-1 p-7"><div className="mx-auto max-w-[1320px]">{active !== '工作台' ? <EmptyModule name={active} onBack={() => setActive('工作台')} /> : <><div className="mb-7 flex items-end justify-between"><div><p className="mb-1 text-xs font-medium text-primary">星期一，9 月 2 日</p><h2 className="text-2xl font-semibold tracking-tight">早上好，Lin</h2><p className="mt-1 text-sm text-muted-foreground">这是你的创作控制台。今天有 4 个重点事项。</p></div><button onClick={() => toast('创建入口已准备')} className="flex items-center gap-2 rounded-lg bg-primary px-3.5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5"><Plus className="size-4" />新建任务</button></div>
        <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]"><section className="rounded-xl border border-border bg-card"><SectionHead icon={ListTodo} title="今日计划" action="查看全部" /><div className="divide-y divide-border">{filteredTasks.map((task) => <div key={task.id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/40 ${task.done ? 'opacity-50' : ''}`}><button onClick={() => completeTask(task.id)} aria-label={`完成${task.title}`} className={`grid size-5 place-items-center rounded-full border ${task.done ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary'}`}>{task.done && <Check className="size-3" />}</button><div className="min-w-0 flex-1"><p className={`truncate text-sm font-medium ${task.done ? 'line-through' : ''}`}>{task.title}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{task.tag}</p></div><span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{task.time}</span><button onClick={() => setSelected({ title: task.title, type: task.tag })} aria-label="查看详情"><ArrowUpRight className="size-4 text-muted-foreground hover:text-foreground" /></button></div>)}</div></section>
          <section className="rounded-xl border border-border bg-card"><SectionHead icon={Zap} title="模块健康" action="管理连接" /><div className="grid grid-cols-2 gap-2.5 p-4">{modules.map(([name, status, detail, dot]) => <button key={name} onClick={() => toast(`${name}：${status}`)} className="rounded-lg border border-border/80 p-3 text-left transition-colors hover:bg-muted/50"><div className="flex items-center justify-between"><span className="text-xs font-medium">{name}</span><span className={`size-2 rounded-full ${dot}`} /></div><p className="mt-2 text-[11px] text-muted-foreground">{status} · {detail.split(' · ')[1]}</p></button>)}</div></section></div>
        <section className="mt-5 rounded-xl border border-border bg-card"><SectionHead icon={Activity} title="活跃任务" action="任务队列" /><div className="divide-y divide-border">{jobs.map((job) => <div key={job.id} onClick={() => setSelected({ title: job.title, type: job.type })} className="flex cursor-pointer items-center gap-4 px-5 py-4 hover:bg-muted/40"><div className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><Bot className="size-4" /></div><div className="w-52 min-w-0"><p className="truncate text-sm font-medium">{job.title}</p><p className="mt-1 text-[10px] font-semibold tracking-wider text-muted-foreground">{job.type}</p></div><div className="flex flex-1 items-center gap-3"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${job.progress}%` }} /></div><span className="w-9 text-right text-xs font-medium">{job.progress}%</span></div><span className="hidden w-24 text-xs text-muted-foreground sm:block">{job.eta}</span><button onClick={(event) => { event.stopPropagation(); toggleJob(job.id) }} className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted">{job.state === '运行中' ? '暂停' : '继续'}</button><MoreHorizontal className="size-4 text-muted-foreground" /></div>)}</div></section>
        <div className="mt-5 grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-border bg-card"><SectionHead icon={CircleHelp} title="需要关注" action="查看问题" /><div className="flex items-start gap-3 p-5"><div className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent"><Archive className="size-4" /></div><div className="flex-1"><p className="text-sm font-medium">Local API 连接需要重新授权</p><p className="mt-1 text-xs leading-5 text-muted-foreground">视频导出流程正在等待本地服务响应。重新连接后将自动继续。</p><button onClick={() => toast('正在重新连接 Local API')} className="mt-3 text-xs font-medium text-primary hover:underline">重新连接 <ArrowUpRight className="ml-1 inline size-3" /></button></div></div></section><section className="rounded-xl border border-border bg-card"><SectionHead icon={Clock3} title="最近活动" action="活动日志" /><div className="flex flex-col gap-4 p-5">{[['视频生成任务完成', 'Scene-00 / establishing shot', '12 分钟前'], ['知识库新增 3 条笔记', 'AI Agent Research', '1 小时前'], ['项目已更新', 'Harmony Game · prototype', '3 小时前']].map(([title, sub, time]) => <div key={title} className="flex gap-3"><span className="mt-1.5 size-2 rounded-full bg-primary" /><div className="flex-1"><p className="text-xs font-medium">{title}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p></div><span className="text-[11px] text-muted-foreground">{time}</span></div>)}</div></section></div>
      </>}</div></main>
    </div>
    {selected && <aside className="fixed inset-y-0 right-0 z-30 w-80 border-l border-border bg-card p-6 shadow-xl"><div className="flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">检查器</p><h2 className="mt-1 text-base font-semibold">任务详情</h2></div><button onClick={() => setSelected(null)} aria-label="关闭检查器" className="rounded-md p-2 text-muted-foreground hover:bg-muted"><X className="size-4" /></button></div><div className="mt-8 flex flex-col gap-5"><div><p className="text-xs text-muted-foreground">名称</p><p className="mt-1 text-sm font-medium leading-6">{selected.title}</p></div><div><p className="text-xs text-muted-foreground">模块</p><span className="mt-2 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{selected.type}</span></div><div className="border-t border-border pt-5"><p className="text-xs text-muted-foreground">运行状态</p><div className="mt-2 flex items-center gap-2 text-sm"><span className="size-2 rounded-full bg-primary" />准备就绪</div></div><button onClick={() => { setSelected(null); toast('已打开详细工作流') }} className="mt-4 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground">打开工作流</button></div></aside>}
    {notice && <div role="status" className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2.5 text-xs font-medium text-background shadow-lg">{notice}</div>}
  </div>
}

function SectionHead({ icon: Icon, title, action }: { icon: React.ElementType; title: string; action: string }) { return <div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2"><Icon className="size-4 text-primary" /><h3 className="text-sm font-semibold">{title}</h3></div><button className="text-xs text-muted-foreground hover:text-foreground">{action}</button></div> }
function EmptyModule({ name, onBack }: { name: string; onBack: () => void }) { return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-sm text-center"><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Box className="size-6" /></div><h2 className="mt-5 text-xl font-semibold">{name} 模块</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">这个模块正在搭建中。先回到工作台查看你的创作进度与系统状态。</p><button onClick={onBack} className="mt-5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">返回工作台</button></div></div> }


