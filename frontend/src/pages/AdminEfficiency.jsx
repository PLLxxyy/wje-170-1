import { useState, useEffect } from 'react'
import { BarChart3 } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import api from '../utils/api'

const SPEED_COLORS = {
  fast: 'text-green-600 bg-green-50',
  normal: 'text-amber-600 bg-amber-50',
  slow: 'text-red-600 bg-red-50'
}

function getSpeedClass(hours) {
  if (hours < 12) return SPEED_COLORS.fast
  if (hours <= 24) return SPEED_COLORS.normal
  return SPEED_COLORS.slow
}

function getSpeedLabel(hours) {
  if (hours < 12) return '快速'
  if (hours <= 24) return '正常'
  return '较慢'
}

export default function AdminEfficiency() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState({ avgHours: 0, departments: [] })

  useEffect(() => {
    api.get('/stats/approval-efficiency', { params: { month } }).then(res => {
      setData(res.data || { avgHours: 0, departments: [] })
    }).catch(() => setData({ avgHours: 0, departments: [] }))
  }, [month])

  const depts = data.departments || []

  const barOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, formatter: (params) => `${params[0].name}: ${params[0].value}小时` },
    grid: { left: 100, right: 60, top: 10, bottom: 20 },
    xAxis: { type: 'value', name: '小时' },
    yAxis: {
      type: 'category',
      data: [...depts].reverse().map(d => d.name),
      axisLabel: { width: 80, overflow: 'truncate' }
    },
    series: [{
      type: 'bar',
      data: [...depts].reverse().map((d) => ({
        value: d.avgHours,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 1, y2: 0,
            colorStops: [
              { offset: 0, color: d.avgHours < 12 ? '#10b981' : d.avgHours <= 24 ? '#f59e0b' : '#ef4444' },
              { offset: 1, color: d.avgHours < 12 ? '#34d399' : d.avgHours <= 24 ? '#fbbf24' : '#f87171' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        }
      })),
      barWidth: 20,
      label: { show: true, position: 'right', formatter: '{c}小时', fontSize: 12 }
    }]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">审批效率</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6 text-center">
        <p className="text-sm text-slate-500 mb-1">平均审批时长</p>
        <p className="text-4xl font-bold text-blue-600">{data.avgHours} <span className="text-lg font-normal text-slate-400">小时</span></p>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-lg font-semibold text-slate-700 mb-4">部门审批效率</h2>
        <ReactECharts option={barOption} style={{ height: Math.max(300, depts.length * 45) }} />
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">部门</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">平均审批时长(小时)</th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600 w-24">状态</th>
            </tr>
          </thead>
          <tbody>
            {depts.map((d) => {
              const cls = getSpeedClass(d.avgHours)
              const label = getSpeedLabel(d.avgHours)
              return (
                <tr key={d.name} className="border-b border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-700">{d.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-700 text-right">{d.avgHours}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                      {label}
                    </span>
                  </td>
                </tr>
              )
            })}
            {depts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">暂无数据</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
