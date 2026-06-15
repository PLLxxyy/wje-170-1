import { useState, useEffect } from 'react'
import { Shield, Clock, AlertCircle, Users, TrendingUp } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import api from '../utils/api'

const PALETTE = ['#2563eb', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444']

export default function AdminOverview() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState(null)
  const [trend, setTrend] = useState([])

  useEffect(() => {
    api.get('/admin/overview', { params: { month } }).then(res => {
      setData(res.data)
    }).catch(() => {
      setData({ totalHours: 0, pendingCount: 0, employeeCount: 0, avgHours: 0, departments: [] })
    })
  }, [month])

  useEffect(() => {
    const endMonth = dayjs(month)
    const months = []
    for (let i = 5; i >= 0; i--) {
      months.push(endMonth.subtract(i, 'month').format('YYYY-MM'))
    }
    Promise.all(
      months.map(m => api.get('/admin/overview', { params: { month: m } }).then(res => ({
        month: m,
        totalHours: res.data.totalHours || 0
      })).catch(() => ({ month: m, totalHours: 0 })))
    ).then(setTrend)
  }, [month])

  const stats = [
    { label: '全公司加班总时长', value: (data?.totalHours || 0) + ' 小时', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: '待审批申请', value: data?.pendingCount || 0, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: '加班人数', value: data?.employeeCount || 0, icon: Users, color: 'text-green-600', bg: 'bg-green-50' },
    { label: '人均加班', value: (data?.avgHours || 0) + ' 小时', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' }
  ]

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c}小时 ({d}%)' },
    legend: { orient: 'vertical', right: 10, top: 'center' },
    color: PALETTE,
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['35%', '50%'],
      avoidLabelOverlap: true,
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      label: { show: true, formatter: '{b}\n{d}%' },
      data: (data?.departments || []).map(d => ({ name: d.name, value: d.hours }))
    }]
  }

  const lineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: { type: 'category', data: trend.map(t => dayjs(t.month).format('M月')), boundaryGap: false },
    yAxis: { type: 'value', name: '小时' },
    series: [{
      type: 'line',
      data: trend.map(t => t.totalHours),
      smooth: true,
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(37,99,235,0.3)' }, { offset: 1, color: 'rgba(37,99,235,0.02)' }] } },
      lineStyle: { color: '#2563eb', width: 2 },
      itemStyle: { color: '#2563eb' }
    }]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">人事概览</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">{s.label}</span>
              <div className={`${s.bg} p-2 rounded-lg`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold mt-2 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">部门加班分布</h2>
          <ReactECharts option={pieOption} style={{ height: 300 }} />
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-lg font-semibold text-slate-700 mb-4">月度趋势（近6月）</h2>
          <ReactECharts option={lineOption} style={{ height: 300 }} />
        </div>
      </div>
    </div>
  )
}
