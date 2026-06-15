import { useState, useEffect } from 'react'
import { Download, FileText, Info } from 'lucide-react'
import dayjs from 'dayjs'
import api from '../utils/api'

export default function AdminExport() {
  const [month, setMonth] = useState(dayjs().format('YYYY-MM'))
  const [recordCount, setRecordCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!month) return
    api.get('/admin/overview', { params: { month } }).then(res => {
      setRecordCount(res.data?.recordCount || 0)
    }).catch(() => setRecordCount(0))
  }, [month])

  const handleExport = async () => {
    if (!month) return
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const res = await api.get('/admin/export', {
        params: { month },
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `加班明细_${month}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      const token = localStorage.getItem('token')
      window.location.href = `/api/admin/export?month=${month}&token=${token}`
    } finally {
      setLoading(false)
    }
  }

  const monthLabel = month ? dayjs(month).format('YYYY年M月') : ''

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-slate-800">导出报表</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-50 p-2 rounded-lg">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-700">数据预览</h2>
            {month && (
              <p className="text-sm text-slate-500">{monthLabel} 加班数据共 <span className="font-semibold text-blue-600">{recordCount}</span> 条记录</p>
            )}
          </div>
        </div>
        <button
          onClick={handleExport}
          disabled={!month || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Download className="w-4 h-4" />
          {loading ? '导出中...' : '导出月度加班明细'}
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-5 h-5 text-slate-400" />
          <h2 className="text-lg font-semibold text-slate-700">导出说明</h2>
        </div>
        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-start gap-3">
            <span className="text-slate-400 w-16 shrink-0">说明</span>
            <span>导出包含该月所有员工的加班申请明细</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-slate-400 w-16 shrink-0">格式</span>
            <span>CSV（支持Excel打开）</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-slate-400 w-16 shrink-0">内容</span>
            <span>员工姓名、部门、加班日期、时间段、时长、原因、审批状态</span>
          </div>
        </div>
      </div>
    </div>
  )
}
