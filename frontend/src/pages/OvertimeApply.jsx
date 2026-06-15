import { useState, useEffect, useCallback } from 'react'
import { Clock, Send, FileText, AlertCircle, CheckCircle } from 'lucide-react'
import api from '../utils/api'

const STATUS_MAP = {
  pending_supervisor: { label: '待主管审批', color: 'bg-yellow-100 text-yellow-700' },
  pending_hr: { label: '待人事复核', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '已生效', color: 'bg-green-100 text-green-700' },
  rejected: { label: '已打回', color: 'bg-red-100 text-red-700' }
}

function calcDuration(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let startMin = sh * 60 + sm
  let endMin = eh * 60 + em
  if (endMin <= startMin) endMin += 24 * 60
  return ((endMin - startMin) / 60).toFixed(1)
}

export default function OvertimeApply() {
  const [form, setForm] = useState({ date: '', startTime: '', endTime: '', reason: '', workContent: '' })
  const [duration, setDuration] = useState(0)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [recentList, setRecentList] = useState([])

  const fetchRecent = useCallback(async () => {
    try {
      const res = await api.get('/overtime/my', { params: { pageSize: 5 } })
      setRecentList(res.data.list || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchRecent()
  }, [fetchRecent])

  useEffect(() => {
    setDuration(calcDuration(form.startTime, form.endTime))
  }, [form.startTime, form.endTime])

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await api.post('/overtime', {
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        reason: form.reason,
        workContent: form.workContent
      })
      setSuccess('加班申请提交成功')
      setForm({ date: '', startTime: '', endTime: '', reason: '', workContent: '' })
      setDuration(0)
      fetchRecent()
    } catch (err) {
      setError(err.response?.data?.message || '提交失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <Clock className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">加班申请</h1>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-500 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">加班日期</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">加班时长（小时）</label>
            <input
              type="text"
              value={duration ? `${duration} 小时` : ''}
              readOnly
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">开始时间</label>
            <input
              type="time"
              name="startTime"
              value={form.startTime}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">结束时间</label>
            <input
              type="time"
              name="endTime"
              value={form.endTime}
              onChange={handleChange}
              required
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">加班原因</label>
          <input
            type="text"
            name="reason"
            value={form.reason}
            onChange={handleChange}
            required
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="请输入加班原因"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">工作内容</label>
          <textarea
            name="workContent"
            value={form.workContent}
            onChange={handleChange}
            required
            rows={3}
            className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
            placeholder="请描述加班期间的工作内容"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Send className="w-4 h-4" />
          {loading ? '提交中...' : '提交申请'}
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-slate-500" />
          <h2 className="text-base font-semibold text-slate-900">最近申请</h2>
        </div>

        {recentList.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">暂无申请记录</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recentList.map((item) => {
              const status = STATUS_MAP[item.status] || { label: item.status, color: 'bg-slate-100 text-slate-600' }
              return (
                <li key={item.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 truncate">{item.reason}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {item.date} {item.startTime}-{item.endTime} · {item.duration}h
                    </div>
                  </div>
                  <span className={`ml-3 shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
