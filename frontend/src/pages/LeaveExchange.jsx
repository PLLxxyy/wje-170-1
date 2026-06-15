import { useState, useEffect } from 'react'
import { ArrowLeftRight, Clock, Coffee, Sun } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

export default function LeaveExchange() {
  const [balance, setBalance] = useState({ totalOvertimeHours: 0, exchangedHours: 0, usedHours: 0, availableHours: 0 })
  const [overtimes, setOvertimes] = useState([])
  const [selected, setSelected] = useState([])
  const [history, setHistory] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const fetchBalance = () => {
    api.get('/leave/balance').then((res) => setBalance(res.data)).catch(() => {})
  }

  const fetchOvertimes = () => {
    api.get('/overtime/my', { params: { status: 'approved' } }).then((res) => {
      const list = res.data.list || []
      const unexchanged = list.filter((o) => !o.exchanged)
      setOvertimes(unexchanged)
    }).catch(() => {})
  }

  const fetchHistory = () => {
    api.get('/leave/my').then((res) => setHistory(res.data.list || [])).catch(() => {})
  }

  useEffect(() => {
    fetchBalance()
    fetchOvertimes()
    fetchHistory()
  }, [])

  const availableHours = balance.availableHours || 0
  const totalSelectedHours = overtimes
    .filter((o) => selected.includes(o.id))
    .reduce((sum, o) => sum + (o.duration || 0), 0)

  const toggleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleExchange = async () => {
    if (selected.length === 0) return
    setSubmitting(true)
    try {
      await api.post('/leave/exchange', {
        overtimeIds: selected,
        hours: totalSelectedHours
      })
      setSelected([])
      fetchBalance()
      fetchOvertimes()
      fetchHistory()
    } catch {
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ArrowLeftRight className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">调休兑换</h1>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">可用加班时长</p>
            <p className="text-2xl font-bold text-slate-800">
              {availableHours}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
            <Coffee className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">已兑换调休</p>
            <p className="text-2xl font-bold text-slate-800">
              {balance.exchangedHours || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
            <Sun className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">已使用调休</p>
            <p className="text-2xl font-bold text-slate-800">
              {balance.usedHours || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">兑换调休</h2>

        {overtimes.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">暂无可兑换的加班记录</p>
        ) : (
          <>
            <div className="space-y-2 mb-4">
              {overtimes.map((o) => (
                <label
                  key={o.id}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
                    selected.includes(o.id)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(o.id)}
                    onChange={() => toggleSelect(o.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-slate-700">
                      {dayjs(o.date).format('YYYY-MM-DD')}
                    </span>
                    <span className="text-sm text-slate-500">
                      {o.start_time} ~ {o.end_time}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{o.duration}小时</span>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-sm text-slate-600">
                已选择 <span className="font-semibold text-blue-600">{selected.length}</span> 条，合计{' '}
                <span className="font-semibold text-blue-600">{totalSelectedHours}</span> 小时
              </span>
              <button
                onClick={handleExchange}
                disabled={selected.length === 0 || submitting}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? '兑换中...' : '确认兑换'}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">兑换记录</h2>
        {history.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">暂无兑换记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">调休日期</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">时长</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">原因</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-50">
                    <td className="py-3 px-2 text-slate-700">{dayjs(h.start_date).format('YYYY-MM-DD')}</td>
                    <td className="py-3 px-2 text-slate-700">{h.hours}小时</td>
                    <td className="py-3 px-2 text-slate-700">{h.reason}</td>
                    <td className="py-3 px-2">
                      <StatusBadge status={h.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    pending_supervisor: { label: '待主管审批', cls: 'bg-yellow-100 text-yellow-700' },
    pending_hr: { label: '待人事复核', cls: 'bg-blue-100 text-blue-700' },
    approved: { label: '已批准', cls: 'bg-green-100 text-green-700' },
    rejected: { label: '已打回', cls: 'bg-red-100 text-red-700' }
  }
  const c = config[status] || { label: status, cls: 'bg-slate-100 text-slate-600' }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${c.cls}`}>{c.label}</span>
}
