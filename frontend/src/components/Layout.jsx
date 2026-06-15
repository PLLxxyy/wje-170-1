import { useEffect } from 'react'
import { Outlet, Navigate, useLocation, Link } from 'react-router-dom'
import {
  Clock,
  LayoutDashboard,
  List,
  ArrowLeftRight,
  CalendarOff,
  CheckSquare,
  History,
  Users,
  Shield,
  Building,
  BarChart3,
  Download,
  LogOut,
  PenLine
} from 'lucide-react'
import useAuthStore from '../store/auth'

const roleLabels = { employee: '员工', supervisor: '主管', hr: '人事' }
const roleColors = {
  employee: 'bg-blue-600',
  supervisor: 'bg-amber-600',
  hr: 'bg-emerald-600'
}

const navConfig = {
  employee: [
    { label: '月度汇总', path: '/dashboard', icon: LayoutDashboard },
    { label: '加班申请', path: '/overtime/apply', icon: PenLine },
    { label: '我的申请', path: '/overtime/list', icon: List },
    { label: '调休兑换', path: '/leave/exchange', icon: ArrowLeftRight },
    { label: '调休申请', path: '/leave/apply', icon: CalendarOff }
  ],
  supervisor: [
    { label: '月度汇总', path: '/dashboard', icon: LayoutDashboard },
    { label: '加班申请', path: '/overtime/apply', icon: PenLine },
    { label: '我的申请', path: '/overtime/list', icon: List },
    { label: '调休兑换', path: '/leave/exchange', icon: ArrowLeftRight },
    { label: '调休申请', path: '/leave/apply', icon: CalendarOff },
    { label: '待审批', path: '/approval/pending', icon: CheckSquare },
    { label: '审批记录', path: '/approval/history', icon: History },
    { label: '团队统计', path: '/team/stats', icon: Users }
  ],
  hr: [
    { label: '月度汇总', path: '/dashboard', icon: LayoutDashboard },
    { label: '加班申请', path: '/overtime/apply', icon: PenLine },
    { label: '我的申请', path: '/overtime/list', icon: List },
    { label: '调休兑换', path: '/leave/exchange', icon: ArrowLeftRight },
    { label: '调休申请', path: '/leave/apply', icon: CalendarOff },
    { label: '待审批', path: '/approval/pending', icon: CheckSquare },
    { label: '审批记录', path: '/approval/history', icon: History },
    { label: '团队统计', path: '/team/stats', icon: Users },
    { label: '人事概览', path: '/admin/overview', icon: Shield },
    { label: '部门排行', path: '/admin/departments', icon: Building },
    { label: '审批效率', path: '/admin/efficiency', icon: BarChart3 },
    { label: '导出报表', path: '/admin/export', icon: Download }
  ]
}

export default function Layout() {
  const { user, isAuthenticated, logout, checkAuth } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    checkAuth()
  }, [])

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const role = user?.role || 'employee'
  const navItems = navConfig[role] || navConfig.employee

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 bg-slate-900 text-white flex flex-col shrink-0">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <Clock className="w-7 h-7 text-blue-500" />
          <span className="text-xl font-bold tracking-wide">工时管理</span>
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-6 py-2.5 text-sm transition-colors ${
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-slate-700 px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-medium">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || '用户'}</p>
              <span
                className={`inline-block mt-0.5 px-2 py-0.5 rounded text-xs text-white ${
                  roleColors[role] || 'bg-slate-600'
                }`}
              >
                {roleLabels[role] || '未知'}
              </span>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 shrink-0">
          <h2 className="text-base font-semibold text-slate-800">
            {navItems.find((i) => i.path === location.pathname)?.label || ''}
          </h2>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-100 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
