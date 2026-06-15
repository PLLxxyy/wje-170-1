import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import OvertimeApply from './pages/OvertimeApply'
import OvertimeList from './pages/OvertimeList'
import LeaveExchange from './pages/LeaveExchange'
import LeaveApply from './pages/LeaveApply'
import ApprovalPending from './pages/ApprovalPending'
import ApprovalHistory from './pages/ApprovalHistory'
import TeamStats from './pages/TeamStats'
import AdminOverview from './pages/AdminOverview'
import AdminDepartments from './pages/AdminDepartments'
import AdminEfficiency from './pages/AdminEfficiency'
import AdminExport from './pages/AdminExport'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<ProtectedRoute roles={['employee', 'supervisor', 'hr']}><Dashboard /></ProtectedRoute>} />
        <Route path="overtime/apply" element={<ProtectedRoute roles={['employee', 'supervisor', 'hr']}><OvertimeApply /></ProtectedRoute>} />
        <Route path="overtime/list" element={<ProtectedRoute roles={['employee', 'supervisor', 'hr']}><OvertimeList /></ProtectedRoute>} />
        <Route path="leave/exchange" element={<ProtectedRoute roles={['employee', 'supervisor', 'hr']}><LeaveExchange /></ProtectedRoute>} />
        <Route path="leave/apply" element={<ProtectedRoute roles={['employee', 'supervisor', 'hr']}><LeaveApply /></ProtectedRoute>} />
        <Route path="approval/pending" element={<ProtectedRoute roles={['supervisor', 'hr']}><ApprovalPending /></ProtectedRoute>} />
        <Route path="approval/history" element={<ProtectedRoute roles={['supervisor', 'hr']}><ApprovalHistory /></ProtectedRoute>} />
        <Route path="team/stats" element={<ProtectedRoute roles={['supervisor', 'hr']}><TeamStats /></ProtectedRoute>} />
        <Route path="admin/overview" element={<ProtectedRoute roles={['hr']}><AdminOverview /></ProtectedRoute>} />
        <Route path="admin/departments" element={<ProtectedRoute roles={['hr']}><AdminDepartments /></ProtectedRoute>} />
        <Route path="admin/efficiency" element={<ProtectedRoute roles={['hr']}><AdminEfficiency /></ProtectedRoute>} />
        <Route path="admin/export" element={<ProtectedRoute roles={['hr']}><AdminExport /></ProtectedRoute>} />
      </Route>
    </Routes>
  )
}
