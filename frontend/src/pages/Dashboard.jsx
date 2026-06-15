import { useState, useEffect } from 'react'
import { Clock, Coffee, Wallet, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import api from '../utils/api'

export default function Dashboard() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api
      .get('/stats/monthly', { params: { month } })
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [month])

  const prevMonth = () => {
    setMonth(dayjs(month).subtract(1, 'month').format('YYYY-MM'))
  }

  const nextMonth = () => {
    const next = dayjs(month).add(1, 'month')
    if (next.isAfter(dayjs(), 'month')) return
    setMonth(next.format('YYYY-MM'))
  }

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#fff',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      textStyle: { color: '#1e293b', fontSize: 13 },
      formatter: (params) => {
        const p = params[0]
        return `${p.name}<br/>加班时长：<b>${p.value}</b> 小时`
      }
    },
    grid: { top: 20, right: 30, bottom: 30, left: 50 },
    xAxis: {
      type: 'category',
      data: (data?.monthlyTrend || []).map((t) => dayjs(t.month).format('M月')),
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#64748b', fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      name: '小时',
      nameTextStyle: { color: '#94a3b8', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
      axisLabel: { color: '#64748b', fontSize: 12 }
    },
    series: [
      {
        type: 'line',
        data: (data?.monthlyTrend || []).map((t) => t.hours),
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: { width: 3, color: '#2563eb' },
        itemStyle: { color: '#2563eb', borderWidth: 2, borderColor: '#fff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(37,99,235,0.25)' },
              { offset: 1, color: 'rgba(37,99,235,0.02)' }
            ]
          }
        },
        markLine: {
          silent: true,
          symbol: 'none',
          lineStyle: { color: '#ef4444', type: 'dashed', width: 1.5 },
          data: [{ yAxis: 36, label: { formatter: '法定上限 36h', color: '#ef4444', fontSize: 11 } }]
        }
      }
    ]
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">月度汇总</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={prevMonth}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-slate-800 min-w-[100px] text-center">
            {dayjs(month).format('YYYY年M月')}
          </span>
          <button
            onClick={nextMonth}
            disabled={dayjs(month).add(1, 'month').isAfter(dayjs(), 'month')}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {data?.isOverLimit && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm font-medium text-red-700">
            当月加班已超过36小时法定上限，请关注工时合规风险
          </span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-5 mb-6">
            <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">当月加班总时长</p>
                <p className="text-2xl font-bold text-slate-800">
                  {data?.totalHours ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                <Coffee className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">调休余额</p>
                <p className="text-2xl font-bold text-slate-800">
                  {data?.leaveBalance ?? 0}
                  <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">加班费预估</p>
                <p className="text-2xl font-bold text-slate-800">
                  ¥{data?.overtimePay ?? 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-4">近6个月加班趋势</h2>
            <ReactECharts option={chartOption} style={{ height: 320 }} />
          </div>
        </>
      )}
    </div>
  )
}
