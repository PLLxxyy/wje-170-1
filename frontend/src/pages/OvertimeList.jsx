import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Check, Clock, Circle, X, Edit3 } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已生效' },
  { key: 'rejected', label: '已打回' }
]

const STATUS_MAP = {
  pending_supervisor: { label: '待主管审批', className: 'bg-yellow-100 text-yellow-700' },
  pending_hr: { label: '待人事复核', className: 'bg-blue-100 text-blue-700' },
  approved: { label: '已生效', className: 'bg-green-100 text-green-700' },
  rejected: { label: '已打回', className: 'bg-red-100 text-red-700' }
}

const TIMELINE_STEPS = [
  { key: 'submitted', label: '已提交' },
  { key: 'supervisor', label: '主管审批' },
  { key: 'hr', label: '人事复核' },
  { key: 'approved', label: '已生效' }
]

function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

function ApprovalTimeline({ records, status }) {
  const supervisorRecord = records.find(r => r.level === 'supervisor')
  const hrRecord = records.find(r => r.level === 'hr')

  const getStepState = (step) => {
    if (step.key === 'submitted') return 'done'
    if (step.key === 'supervisor') {
      if (!supervisorRecord) return 'pending'
      if (supervisorRecord.action === 'approved') return 'done'
      if (supervisorRecord.action === 'rejected') return 'rejected'
      return 'current'
    }
    if (step.key === 'hr') {
      if (!hrRecord) {
        if (status === 'pending_hr') return 'current'
        if (status === 'approved') return 'done'
        if (supervisorRecord?.action === 'rejected') return 'rejected'
        return 'pending'
      }
      if (hrRecord.action === 'approved') return 'done'
      if (hrRecord.action === 'rejected') return 'rejected'
      return 'current'
    }
    if (step.key === 'approved') {
      if (status === 'approved') return 'done'
      if (status === 'rejected') return 'rejected'
      return 'pending'
    }
    return 'pending'
  }

  const getStepRecord = (step) => {
    if (step.key === 'supervisor') return supervisorRecord
    if (step.key === 'hr') return hrRecord
    return null
  }

  return (
    <div className="py-2">
      {TIMELINE_STEPS.map((step, index) => {
        const state = getStepState(step)
        const record = getStepRecord(step)
        return (
          <div key={step.key} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              {state === 'done' && (
                <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              {state === 'current' && (
                <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white animate-spin" />
                </div>
              )}
              {state === 'rejected' && (
                <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center">
                  <X className="w-4 h-4 text-white" />
                </div>
              )}
              {state === 'pending' && (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                  <Circle className="w-4 h-4 text-gray-400" />
                </div>
              )}
              {index < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${
                  state === 'done' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
            <div className="pt-0.5 pb-6">
              <div className={`text-sm font-medium ${
                state === 'pending' ? 'text-gray-400' :
                state === 'rejected' ? 'text-red-600' :
                'text-gray-900'
              }`}>
                {step.label}
              </div>
              {record && (
                <div className="mt-1 text-xs text-gray-500 space-y-0.5">
                  <div>{record.approver_name} · {dayjs(record.created_at).format('YYYY-MM-DD HH:mm')}</div>
                  {record.comment && <div>意见: {record.comment}</div>}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function OvertimeList() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all')
  const [list, setList] = useState([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const fetchList = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize }
      if (activeTab === 'pending') {
        params.status = 'pending'
      } else if (activeTab !== 'all') {
        params.status = activeTab
      }
      const res = await api.get('/overtime/my', { params })
      setList(res.data.list || [])
      setTotalPages(res.data.totalPages || 1)
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, activeTab])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setPage(1)
  }

  const handleRowClick = async (item) => {
    setDetailVisible(true)
    setDetailLoading(true)
    setDetail(null)
    try {
      const res = await api.get(`/overtime/${item.id}`)
      setDetail(res.data)
    } catch {
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const closeDetail = () => {
    setDetailVisible(false)
    setDetail(null)
  }

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, page - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">我的加班申请</h1>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">加班日期</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">开始时间</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">结束时间</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">时长</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">原因</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">状态</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">加载中...</td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">暂无数据</td>
              </tr>
            ) : (
              list.map(item => (
                <tr
                  key={item.id}
                  onClick={() => handleRowClick(item)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-gray-900">{dayjs(item.date).format('YYYY-MM-DD')}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.start_time}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.end_time}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{item.duration}h</td>
                  <td className="px-4 py-3 text-sm text-gray-700 max-w-[200px] truncate">{item.reason}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    {item.status === 'rejected' && (
                      <button
                        onClick={() => navigate('/overtime/apply', { state: { editId: item.id } })}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        修改
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {getPageNumbers().map(p => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 text-sm rounded ${
                p === page
                  ? 'bg-blue-500 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {detailVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">审批进度</h2>
              <button onClick={closeDetail} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {detailLoading ? (
              <div className="py-8 text-center text-gray-400">加载中...</div>
            ) : detail ? (
              <>
                <div className="mb-6 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">加班日期</span>
                    <span className="text-gray-900">{dayjs(detail.date).format('YYYY-MM-DD')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">时间</span>
                    <span className="text-gray-900">{detail.start_time} - {detail.end_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">时长</span>
                    <span className="text-gray-900">{detail.duration}小时</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">原因</span>
                    <span className="text-gray-900">{detail.reason}</span>
                  </div>
                  {detail.work_content && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">工作内容</span>
                      <span className="text-gray-900">{detail.work_content}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">状态</span>
                    <StatusBadge status={detail.status} />
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">审批流程</h3>
                  <ApprovalTimeline
                    records={detail.approvalRecords || []}
                    status={detail.status}
                  />
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-gray-400">加载失败</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
