import { useState, useEffect } from 'react'
import { History, Inbox } from 'lucide-react'
import api from '../utils/api'
import dayjs from 'dayjs'

const actionLabels = { approved: '通过', rejected: '打回' }
const actionColors = {
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700'
}
const levelLabels = { supervisor: '主管', hr: '人事' }
const levelColors = {
  supervisor: 'bg-blue-100 text-blue-700',
  hr: 'bg-purple-100 text-purple-700'
}

export default function ApprovalHistory() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const pageSize = 10

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const res = await api.get('/approval/history', {
        params: { page, page_size: pageSize }
      })
      const data = res.data?.data || res.data || {}
      const items = Array.isArray(data) ? data : data.items || data.list || []
      setList(items)
      setTotal(data.total || items.length)
    } catch {
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [page])

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <History className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">审批记录</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Inbox className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无审批记录</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">申请人</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">申请类型</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">审批级别</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">审批动作</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">审批意见</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">审批时间</th>
                </tr>
              </thead>
              <tbody>
                {list.map((item, idx) => (
                  <tr
                    key={item.id || idx}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {item.applicant_name || item.applicant}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.application_type === 'leave'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {item.application_type === 'leave' ? '调休' : '加班'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          levelColors[item.level] || levelColors.supervisor
                        }`}
                      >
                        {levelLabels[item.level] || item.level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          actionColors[item.action] || actionColors.approved
                        }`}
                      >
                        {actionLabels[item.action] || item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                      {item.comment || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {dayjs(item.created_at || item.approved_at).format('YYYY-MM-DD HH:mm')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <span className="text-sm text-slate-500">
                共 {total} 条记录
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, i, arr) => (
                    <span key={p}>
                      {i > 0 && arr[i - 1] !== p - 1 && (
                        <span className="px-1 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                          page === p
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
