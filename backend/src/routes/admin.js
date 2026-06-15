import { Router } from 'express';
import db from '../database.js';
import { auth, roleCheck } from '../middleware/auth.js';

const router = Router();

router.get('/overview', auth, roleCheck('hr'), (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const totalOvertimeHours = db.prepare(
    `SELECT COALESCE(SUM(duration), 0) as total FROM overtime_applications
     WHERE status = 'approved' AND strftime('%Y-%m', date) = ?`
  ).get(currentMonth).total;

  const pendingApprovals = db.prepare(
    `SELECT COUNT(*) as count FROM overtime_applications WHERE status IN ('pending_supervisor', 'pending_hr')
     UNION ALL
     SELECT COUNT(*) FROM leave_applications WHERE status IN ('pending_supervisor', 'pending_hr')`
  ).all();
  const pendingCount = pendingApprovals.reduce((sum, r) => sum + r.count, 0);

  const departmentDistribution = db.prepare(
    `SELECT d.name, COALESCE(SUM(o.duration), 0) as hours
     FROM departments d
     LEFT JOIN users u ON d.id = u.department_id
     LEFT JOIN overtime_applications o ON u.id = o.user_id AND o.status = 'approved'
       AND strftime('%Y-%m', o.date) = ?
     GROUP BY d.id, d.name`
  ).all(currentMonth);

  const monthlyTrend = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(duration), 0) as hours
     FROM overtime_applications
     WHERE status = 'approved'
       AND date >= date('now', '-5 months', 'start of month')
     GROUP BY strftime('%Y-%m', date)
     ORDER BY month`
  ).all();

  const employeeCount = db.prepare(
    `SELECT COUNT(DISTINCT user_id) as count FROM overtime_applications
     WHERE status = 'approved' AND strftime('%Y-%m', date) = ?`
  ).get(currentMonth).count;

  const avgHours = employeeCount > 0 ? Math.round(totalOvertimeHours / employeeCount * 10) / 10 : 0;

  const recordCount = db.prepare(
    `SELECT COUNT(*) as count FROM overtime_applications
     WHERE strftime('%Y-%m', date) = ?`
  ).get(currentMonth).count;

  res.json({
    totalHours: totalOvertimeHours,
    pendingCount: pendingCount,
    employeeCount,
    avgHours,
    departments: departmentDistribution.map(d => ({ name: d.name, hours: d.hours })),
    monthlyTrend,
    recordCount,
  });
});

router.get('/export', auth, roleCheck('hr'), (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const records = db.prepare(
    `SELECT o.id, u.name as employee_name, d.name as department_name, o.date,
            o.start_time, o.end_time, o.duration, o.reason, o.work_content,
            o.status, o.created_at
     FROM overtime_applications o
     JOIN users u ON o.user_id = u.id
     LEFT JOIN departments d ON u.department_id = d.id
     WHERE strftime('%Y-%m', o.date) = ?
     ORDER BY o.date`
  ).all(currentMonth);

  const headers = ['ID', '员工姓名', '部门', '日期', '开始时间', '结束时间', '时长(小时)', '原因', '工作内容', '状态', '创建时间'];
  const rows = records.map(r => [
    r.id, r.employee_name, r.department_name, r.date,
    r.start_time, r.end_time, r.duration, r.reason,
    r.work_content, r.status, r.created_at,
  ]);

  const escapeCsv = val => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [headers.map(escapeCsv).join(','), ...rows.map(r => r.map(escapeCsv).join(','))].join('\n');
  const bom = '\uFEFF';
  const filename = `overtime_${currentMonth}.csv`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(bom + csv);
});

export default router;
