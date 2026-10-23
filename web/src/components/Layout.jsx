import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Globe, Landmark, LayoutDashboard, Tag, Target } from 'lucide-react'
import { useData } from '../lib/data'
import { dateLabel } from '../lib/format'

export const NAV = [
  { to: '/', label: 'Overview', Icon: LayoutDashboard, end: true },
  { to: '/skills', label: 'Skills Explorer', Icon: Tag },
  { to: '/salary', label: 'Salary Benchmarks', Icon: Landmark },
  { to: '/access', label: 'PH Accessibility', Icon: Globe },
  { to: '/recommender', label: 'Skill Gap Recommender', Icon: Target },
  { to: '/methodology', label: 'Methodology', Icon: BookOpen },
]

function Sidebar() {
  return (
    <aside className="w-[248px] shrink-0 border-r border-line bg-surface">
    <nav aria-label="Main" className="sticky top-0 flex h-screen flex-col gap-8 px-4 py-6">
      <NavLink to="/" className="flex items-center gap-3 px-3 text-ink no-underline">
        <img src="/logo.png" alt="" width="32" height="32" className="h-8 w-8 shrink-0" />
        <span className="flex min-w-0 flex-col">
          <span className="whitespace-nowrap text-[17px] font-semibold leading-6 tracking-[-0.01em]">RemoteReady PH</span>
          <span className="text-caption text-subtle">Remote job analytics</span>
        </span>
      </NavLink>

      <div className="flex flex-col gap-1">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex h-10 items-center gap-3 whitespace-nowrap rounded-md px-3 text-[14px] font-medium no-underline ${
                isActive ? 'bg-brand-soft text-brand-ink' : 'text-muted hover:bg-sunken'
              }`
            }
          >
            <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-2 rounded-md bg-sunken px-3 py-4">
        <span className="label">Data from</span>
        <span className="text-body-sm text-muted">Himalayas · Jobicy · Remotive · Arbeitnow</span>
        <NavLink to="/methodology" className="text-body-sm font-medium text-brand hover:text-brand-hover">
          How we collect it
        </NavLink>
      </div>
    </nav>
    </aside>
  )
}

function TopBar() {
  const { pathname } = useLocation()
  const { data } = useData('meta')
  const title = NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)))?.label ?? 'RemoteReady PH'
  return (
    <header className="flex min-h-[72px] flex-wrap items-center justify-between gap-4 border-b border-line bg-surface px-8 py-3">
      <h1 className="m-0 text-page-title">{title}</h1>
      {data && (
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-caption text-subtle">
          <span className="h-2 w-2 rounded-full bg-up" aria-hidden="true" />
          Snapshot {dateLabel(data.meta.snapshot_date)} · {data.meta.jobs.toLocaleString('en-US')} jobs
        </span>
      )}
    </header>
  )
}

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <div className="w-full max-w-[1192px] px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
