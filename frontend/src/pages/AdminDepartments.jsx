import { useState, useEffect } from 'react'
import { Building, Trophy } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import api from '../utils/api'

const RANK_STYLES = [
  { bg: 'bg-amber-100', text: 'text-amber-700', icon: '🥇' },
  { bg: 'bg-slate-200', text: 'text-slate-600', icon: '🥈' },
  { bg: 'bg-orange-100', text: 'text-orange-700', icon: '🥉' }
]

export default function AdminDepartments() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.get('/stats/department-ranking', { params: { month } })
      .then(res => setData(res.data || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [month])

  const sorted = [...data].sort((a, b) => b.total_hours - a.total_hours)
  const totalAll = sorted.reduce((s, d) => s + d.total_hours, 0)

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const item = params[0]
        return `${item.name}<br/>加班总时长：<b>${item.value}</b> 小时`
      }
    },
    grid: { left: 100, right: 80, top: 10, bottom: 10 },
    xAxis: { type: 'value', show: false },
    yAxis: {
      type: 'category',
      data: sorted.map(d => d.name).reverse(),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#475569', fontSize: 13 }
    },
    series: [{
      type: 'bar',
      data: sorted.map(d => d.total_hours).reverse(),
      barWidth: 22,
      itemStyle: {
        borderRadius: [0, 4, 4, 0],
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 1, y2: 0,
          colorStops: [
            { offset: 0, color: '#2563eb' },
            { offset: 1, color: '#93c5fd' }
          ]
        }
      },
      label: {
        show: true,
        position: 'right',
        formatter: '{c} 小时',
        color: '#475569',
        fontSize: 12
      }
    }]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">部门加班排行</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm p-20 flex justify-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-20 flex flex-col items-center justify-center text-slate-400">
          <Building className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无数据</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-lg font-semibold text-slate-700 mb-4">加班时长排行</h2>
            <ReactECharts option={chartOption} style={{ height: Math.max(200, sorted.length * 44) }} />
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h2 className="text-lg font-semibold text-slate-700">详细排名</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-slate-500 font-medium w-20">排名</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium">部门名称</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium w-36">加班总时长</th>
                    <th className="text-left py-3 px-2 text-slate-500 font-medium w-28">占比</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((d, i) => {
                    const rank = i + 1
                    const pct = totalAll > 0 ? ((d.total_hours / totalAll) * 100).toFixed(1) : '0.0'
                    const style = RANK_STYLES[i]
                    return (
                      <tr key={d.name} className="border-b border-slate-50">
                        <td className="py-3 px-2">
                          {style ? (
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${style.bg} ${style.text}`}>
                              {style.icon}
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">{rank}</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-700">{d.name}</td>
                        <td className="py-3 px-2 text-slate-700">{d.total_hours}<span className="text-slate-400 ml-1">小时</span></td>
                        <td className="py-3 px-2 text-slate-700">{pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
