import { useState, useEffect } from 'react'
import { CalendarOff, Clock, Send } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

export default function LeaveApply() {
  const [balance, setBalance] = useState({ totalOvertimeHours: 0, exchangedHours: 0, usedHours: 0, availableHours: 0 })
  const [records, setRecords] = useState([])
  const [form, setForm] = useState({ startDate: '', endDate: '', hours: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const fetchBalance = () => {
    api.get('/leave/balance').then((res) => setBalance(res.data)).catch(() => {})
  }

  const fetchRecords = () => {
    api.get('/leave/my', { params: { pageSize: 10 } }).then((res) => {
      setRecords(res.data?.list || [])
    }).catch(() => {})
  }

  useEffect(() => {
    fetchBalance()
    fetchRecords()
  }, [])

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const start = dayjs(form.startDate)
      const end = dayjs(form.endDate)
      if (end.isSameOrAfter(start)) {
        const diff = end.diff(start, 'day') + 1
        setForm((prev) => ({ ...prev, hours: diff * 8 }))
      }
    } else {
      setForm((prev) => ({ ...prev, hours: '' }))
    }
  }, [form.startDate, form.endDate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage(null)

    if (!form.startDate || !form.endDate || !form.reason) {
      setMessage({ type: 'error', text: '请填写所有必填项' })
      return
    }

    const hours = Number(form.hours)
    if (!hours || hours <= 0) {
      setMessage({ type: 'error', text: '调休时长必须大于0' })
      return
    }

    if (hours > balance.availableHours) {
      setMessage({ type: 'error', text: `调休时长不能超过可用时长（${balance.availableHours}小时）` })
      return
    }

    setSubmitting(true)
    try {
      await api.post('/leave/apply', {
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        hours
      })
      setMessage({ type: 'success', text: '调休申请提交成功' })
      setForm({ startDate: '', endDate: '', hours: '', reason: '' })
      fetchBalance()
      fetchRecords()
    } catch {
      setMessage({ type: 'error', text: '提交失败，请稍后重试' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <CalendarOff className="w-6 h-6 text-blue-600" />
        <h1 className="text-xl font-bold text-slate-800">调休申请</h1>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">总加班时长</p>
            <p className="text-2xl font-bold text-slate-800">
              {balance.totalOvertimeHours}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
            <CalendarOff className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">已兑换调休</p>
            <p className="text-2xl font-bold text-slate-800">
              {balance.exchangedHours}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">已使用调休</p>
            <p className="text-2xl font-bold text-slate-800">
              {balance.usedHours}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Send className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm text-slate-500">可用调休</p>
            <p className="text-2xl font-bold text-blue-600">
              {balance.availableHours}
              <span className="text-sm font-normal text-slate-500 ml-1">小时</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <h2 className="text-base font-semibold text-slate-700 mb-4">填写调休申请</h2>

        {message && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">调休开始日期</label>
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">调休结束日期</label>
              <input
                type="date"
                name="endDate"
                value={form.endDate}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">调休时长（小时）</label>
            <input
              type="number"
              name="hours"
              value={form.hours}
              onChange={handleChange}
              min="0"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="根据日期自动计算"
            />
            <p className="mt-1 text-xs text-slate-400">根据日期范围自动计算（天数 × 8小时），也可手动修改</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">调休原因</label>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="请输入调休原因"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="text-base font-semibold text-slate-700 mb-4">近期申请记录</h2>
        {records.length === 0 ? (
          <p className="text-slate-400 text-sm py-4">暂无申请记录</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">开始日期</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">结束日期</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">时长</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">原因</th>
                  <th className="text-left py-3 px-2 text-slate-500 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50">
                    <td className="py-3 px-2 text-slate-700">{dayjs(r.start_date).format('YYYY-MM-DD')}</td>
                    <td className="py-3 px-2 text-slate-700">{dayjs(r.end_date).format('YYYY-MM-DD')}</td>
                    <td className="py-3 px-2 text-slate-700">{r.hours}小时</td>
                    <td className="py-3 px-2 text-slate-700">{r.reason}</td>
                    <td className="py-3 px-2">
                      <StatusBadge status={r.status} />
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
