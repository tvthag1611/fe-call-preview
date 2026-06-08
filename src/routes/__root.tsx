import { createRootRouteWithContext, Link, Outlet, useRouterState } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '@/components/biva/icon'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { conversationsQuery } from '@/features/calls/api/conversations'
import { useGlobalStream } from '@/features/calls/api/use-global-stream'
import { learningQuery } from '@/features/learn/api'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
})

/**
 * Các route render độc lập (không có sidebar app) — vd trang chia sẻ /teach/:id
 * dành cho người ngoài không có tài khoản.
 */
function isStandaloneRoute(pathname: string) {
  return pathname.startsWith('/teach')
}

function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  if (isStandaloneRoute(pathname)) {
    return (
      <div className="h-screen overflow-hidden bg-background">
        <Outlet />
      </div>
    )
  }
  return <AppShell />
}

const NAV = [
  { to: '/', label: 'Inbound', icon: 'phone-incoming' },
  { to: '/outbound', label: 'Outbound', icon: 'phone-outgoing' },
  { to: '/learn', label: 'Bot cần học', icon: 'graduation-cap' },
] as const

function NavItem({ to, label, icon, badge }: { to: string; label: string; icon: string; badge?: number }) {
  return (
    <Link to={to} className="no-underline">
      {({ isActive }) => (
        <span
          className={cn(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] font-medium',
            isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:bg-muted/70',
          )}
        >
          <Icon name={icon} size={17} />
          <span className="flex-1">{label}</span>
          {badge != null && badge > 0 && (
            <span className="rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[11px] font-semibold text-orange-700">
              {badge}
            </span>
          )}
        </span>
      )}
    </Link>
  )
}

function AppShell() {
  useGlobalStream()
  const { data: calls = [] } = useQuery(conversationsQuery())
  const { data: learn = [] } = useQuery(learningQuery())
  const liveCount = calls.filter((c) => c.status === 'live').length
  // chỉ đếm phiếu còn cần xử lý — đã dạy & "không cần dạy" (dismissed) coi như xong
  const learnPending = learn.filter((l) => l.status === 'open' || l.status === 'review').length

  return (
    <div className="grid h-screen grid-cols-[232px_1fr] overflow-hidden bg-background">
      {/* sidebar */}
      <aside className="flex flex-col border-r bg-card">
        <div className="px-4 pt-[18px] pb-3.5">
          <img src="/logo_biva.png" alt="Biva" className="block h-[26px] w-auto" />
          <div className="mt-2 text-[11px] text-muted-foreground">Trợ lý tổng đài AI</div>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 px-3 py-1.5">
          <div className="px-2.5 pt-2 pb-1.5 text-[10.5px] font-semibold tracking-wider text-muted-foreground uppercase">
            Vận hành
          </div>
          {NAV.map((n) => (
            <NavItem key={n.to} to={n.to} label={n.label} icon={n.icon} badge={n.to === '/learn' ? learnPending : undefined} />
          ))}
        </div>

        <div className="border-t p-3">
          {liveCount > 0 && (
            <div className="flex items-center gap-2.5 rounded-[10px] border border-green-600/20 bg-green-600/[0.07] px-2.5 py-2.5">
              <span className="size-2 rounded-full bg-green-600 animate-pulse" />
              <div className="flex-1">
                <div className="text-[12.5px] font-semibold text-green-700">{liveCount} cuộc gọi đang diễn ra</div>
                <div className="text-[11px] text-muted-foreground">Bot đang trực hotline</div>
              </div>
            </div>
          )}
          <div className={cn('flex items-center gap-2.5 px-0.5', liveCount > 0 && 'mt-3')}>
            <Avatar className="size-[30px]">
              <AvatarFallback>QL</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-[12.5px] font-semibold">Quản trị viên</div>
              <div className="text-[11px] text-muted-foreground">Long Vân Limousine</div>
            </div>
            <Icon name="chevrons-up-down" size={15} className="text-muted-foreground" />
          </div>
        </div>
      </aside>

      {/* main */}
      <main className="min-h-0 min-w-0 overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
