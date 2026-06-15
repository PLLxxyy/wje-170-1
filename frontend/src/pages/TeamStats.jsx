import { useState, useEffect } from 'react'
import { Users, Inbox, CalendarDays, TrendingUp, Clock } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import api from '../utils/api'
import dayjs from 'dayjs'

const rankBadges = [
  { label: '1st', className: 'bg-amber-400 text-white' },
  { label: '2nd', className: 'bg-slate-400 text-white' },
  { label: '3rd', className: 'bg-amber-700 text-white' }
]

export default function TeamStats() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await api.get('/stats/team', { params: { month } })
      setData(res.data?.data || res.data || null)
    } catch {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [month])

  const members = data?.members || data?.list || []
  const totalHours = data?.total_hours || data?.totalHours || 0
  const avgHours = data?.avg_hours || data?.avgHours || (members.length > 0 ? (totalHours / members.length).toFixed(1) : 0)
  const sorted = [...members].sort((a, b) => (b.hours || b.overtime_hours) - (a.hours || a.overtime_hours))
  const maxHours = sorted.length > 0 ? (sorted[0].hours || sorted[0].overtime_hours) : 0

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0]
        return `${item.name}<br/>加班时长: <b>${item.value}小时</b>`
      }
    },
    grid: {
      left: '3%',
      right: '12%',
      top: '3%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}h' },
      splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } }
    },
    yAxis: {
      type: 'category',
      data: sorted.map((m) => m.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [
      {
        type: 'bar',
        data: sorted
          .map((m) => m.hours || m.overtime_hours || 0)
          .reverse(),
        barWidth: '55%',
        itemStyle: {
          borderRadius: [0, 4, 4, 0],
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#93c5fd' }
            ]
          }
        },
        label: {
          show: true,
          position: 'right',
          formatter: '{c}小时',
          fontSize: 12,
          color: '#475569'
        }
      }
    ]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">团队统计</h1>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-slate-400" />
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data || sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无统计数据</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <span className="text-sm text-slate-500">团队总加班时长</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {totalHours}
                <span className="text-base font-normal text-slate-400 ml-1">小时</span>
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-indigo-600" />
                </div>
                <span className="text-sm text-slate-500">人均加班时长</span>
              </div>
              <p className="text-3xl font-bold text-slate-800">
                {avgHours}
                <span className="text-base font-normal text-slate-400 ml-1">小时</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100 mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">成员排行</h2>
            <div className="space-y-3">
              {sorted.map((member, idx) => {
                const hours = member.hours || member.overtime_hours || 0
                const pct = maxHours > 0 ? (hours / maxHours) * 100 : 0
                const badge = rankBadges[idx]
                return (
                  <div key={member.user_id || idx} className="flex items-center gap-3">
                    <div className="w-8 text-center shrink-0">
                      {badge ? (
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${badge.className}`}
                        >
                          {idx + 1}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400 font-medium">{idx + 1}</span>
                      )}
                    </div>
                    <div className="w-20 shrink-0 text-sm font-medium text-slate-700 truncate">
                      {member.name}
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-slate-100 rounded-full h-5 relative overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-medium text-slate-600">
                          {hours}小时
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5 border border-slate-100">
            <h2 className="text-base font-semibold text-slate-800 mb-4">加班时长对比</h2>
            <ReactECharts option={chartOption} style={{ height: Math.max(300, sorted.length * 45) }} />
          </div>
        </>
      )}
    </div>
  )
}
