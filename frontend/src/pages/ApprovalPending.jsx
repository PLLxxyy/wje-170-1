import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, X, Check, MessageSquare } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'
import useAuthStore from '../store/auth'

const TABS = [
  { key: 'all', label: '全部' },
  { key: 'overtime', label: '加班申请' },
  { key: 'leave', label: '调休申请' }
]

const TYPE_BADGE = {
  overtime: { label: '加班', cls: 'bg-blue-100 text-blue-700' },
  leave: { label: '调休', cls: 'bg-green-100 text-green-700' }
}

const OVERTIME_TYPE_BADGE = {
  workday: { label: '工作日', cls: 'bg-slate-100 text-slate-600' },
  weekend: { label: '周末', cls: 'bg-purple-100 text-purple-700' },
  holiday: { label: '节假日', cls: 'bg-orange-100 text-orange-700' },
}

const STATUS_BADGE = {
  pending_supervisor: { label: '待主管审批', cls: 'bg-yellow-100 text-yellow-700' },
  pending_hr: { label: '待人事复核', cls: 'bg-blue-100 text-blue-700' }
}

export default function ApprovalPending() {
  const user = useAuthStore((s) => s.user)
  const level = user?.role === 'hr' ? 'hr' : 'supervisor'

  const [activeTab, setActiveTab] = useState('all')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [rejectingId, setRejectingId] = useState(null)
  const [comment, setComment] = useState('')
  const [actionLoading, setActionLoading] = useState({})
  const pageSize = 10

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (activeTab !== 'all') params.application_type = activeTab
      const res = await api.get('/approval/pending', { params })
      const data = res.data || {}
      setList(data.list || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch {
      setList([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, activeTab])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    setPage(1)
  }, [activeTab])

  const handleApprove = async (id) => {
    setActionLoading((prev) => ({ ...prev, [id]: 'approve' }))
    try {
      await api.post(`/approval/${id}/approve`, { level })
      fetchList()
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }))
    }
  }

  const handleReject = async (id) => {
    if (!comment.trim()) return
    setActionLoading((prev) => ({ ...prev, [id]: 'reject' }))
    try {
      await api.post(`/approval/${id}/reject`, { level, comment: comment.trim() })
      setRejectingId(null)
      setComment('')
      fetchList()
    } catch {
    } finally {
      setActionLoading((prev) => ({ ...prev, [id]: null }))
    }
  }

  const openReject = (id) => {
    setRejectingId(id)
    setComment('')
  }

  const cancelReject = () => {
    setRejectingId(null)
    setComment('')
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null
    return (
      <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
        <span className="text-sm text-slate-500">共 {total} 条记录</span>
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
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-slate-800">待审批</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <MessageSquare className="w-16 h-16 mb-4" />
          <p className="text-lg">暂无待审批申请</p>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((item) => {
            const typeBadge = TYPE_BADGE[item.application_type] || { label: item.application_type, cls: 'bg-slate-100 text-slate-600' }
            const statusBadge = STATUS_BADGE[item.status] || { label: item.status, cls: 'bg-slate-100 text-slate-600' }
            const isActing = !!actionLoading[item.id]

            return (
              <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base font-semibold text-slate-800">{item.applicant_name}</span>
                      <span className="text-sm text-slate-400">{item.department_name}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeBadge.cls}`}>
                        {typeBadge.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="text-sm text-slate-600 space-y-1">
                      {item.application_type === 'overtime' ? (
                        <p>
                          <span className="text-slate-400">日期：</span>
                          {dayjs(item.date).format('YYYY-MM-DD')}
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-slate-400">时间：</span>
                          {item.start_time} - {item.end_time}
                          {item.overtime_type && (
                            <>
                              <span className="mx-2 text-slate-300">|</span>
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${(OVERTIME_TYPE_BADGE[item.overtime_type] || OVERTIME_TYPE_BADGE.workday).cls}`}>
                                {(OVERTIME_TYPE_BADGE[item.overtime_type] || OVERTIME_TYPE_BADGE.workday).label}
                              </span>
                            </>
                          )}
                        </p>
                      ) : (
                        <p>
                          <span className="text-slate-400">开始：</span>
                          {dayjs(item.start_date).format('YYYY-MM-DD')}
                          <span className="mx-2 text-slate-300">|</span>
                          <span className="text-slate-400">结束：</span>
                          {dayjs(item.end_date).format('YYYY-MM-DD')}
                        </p>
                      )}
                      <p>
                        <span className="text-slate-400">时长：</span>
                        {item.duration}小时
                        {item.application_type === 'overtime' && item.compensatory_hours && item.compensatory_hours !== item.duration && (
                          <span className="text-green-600 ml-2">→ {item.compensatory_hours}h调休</span>
                        )}
                      </p>
                      <p>
                        <span className="text-slate-400">原因：</span>
                        {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                    <button
                      onClick={() => handleApprove(item.id)}
                      disabled={isActing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      {actionLoading[item.id] === 'approve' ? '处理中...' : '通过'}
                    </button>
                    <button
                      onClick={() => openReject(item.id)}
                      disabled={isActing}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                    >
                      <X className="w-4 h-4" />
                      打回
                    </button>
                  </div>
                </div>

                {rejectingId === item.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="请输入打回原因（必填）"
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        autoFocus
                      />
                      <button
                        onClick={() => handleReject(item.id)}
                        disabled={!comment.trim() || isActing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {actionLoading[item.id] === 'reject' ? '提交中...' : '确认打回'}
                      </button>
                      <button
                        onClick={cancelReject}
                        className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
            {renderPagination()}
          </div>
        </div>
      )}
    </div>
  )
}
