import { Router } from 'express';
import db from '../database.js';
import { auth, roleCheck } from '../middleware/auth.js';

const router = Router();

router.get('/monthly', auth, (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const totalHours = db.prepare(
    `SELECT COALESCE(SUM(duration), 0) as total FROM overtime_applications
     WHERE user_id = ? AND status = 'approved' AND strftime('%Y-%m', date) = ?`
  ).get(req.user.id, currentMonth).total;

  const totalCompensatoryHours = db.prepare(
    `SELECT COALESCE(SUM(compensatory_hours), 0) as total FROM overtime_applications
     WHERE user_id = ? AND status = 'approved' AND strftime('%Y-%m', date) = ?`
  ).get(req.user.id, currentMonth).total;

  const balance = db.prepare(
    'SELECT * FROM leave_balances WHERE user_id = ?'
  ).get(req.user.id);

  const leaveBalance = balance
    ? balance.total_overtime_hours - balance.exchanged_hours - balance.used_hours
    : 0;

  const monthlyTrend = db.prepare(
    `SELECT strftime('%Y-%m', date) as month, COALESCE(SUM(duration), 0) as hours,
            COALESCE(SUM(compensatory_hours), 0) as compensatory_hours
     FROM overtime_applications
     WHERE user_id = ? AND status = 'approved'
       AND date >= date('now', '-5 months', 'start of month')
     GROUP BY strftime('%Y-%m', date)
     ORDER BY month`
  ).all(req.user.id);

  const typeBreakdown = db.prepare(
    `SELECT overtime_type, COALESCE(SUM(duration), 0) as hours,
            COALESCE(SUM(compensatory_hours), 0) as compensatory_hours
     FROM overtime_applications
     WHERE user_id = ? AND status = 'approved' AND strftime('%Y-%m', date) = ?
     GROUP BY overtime_type`
  ).all(req.user.id, currentMonth);

  res.json({
    totalHours,
    totalCompensatoryHours,
    leaveBalance,
    overtimePay: totalHours * 150,
    isOverLimit: totalHours > 36,
    monthlyTrend: monthlyTrend.map(t => ({ month: t.month, hours: t.hours, compensatoryHours: t.compensatory_hours })),
    typeBreakdown: typeBreakdown.map(t => ({ type: t.overtime_type, hours: t.hours, compensatoryHours: t.compensatory_hours })),
  });
});

router.get('/team', auth, roleCheck('supervisor'), (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const members = db.prepare(
    `SELECT u.id, u.name, COALESCE(SUM(o.duration), 0) as hours
     FROM users u
     LEFT JOIN overtime_applications o ON u.id = o.user_id AND o.status = 'approved'
       AND strftime('%Y-%m', o.date) = ?
     WHERE u.supervisor_id = ?
     GROUP BY u.id, u.name`
  ).all(currentMonth, req.user.id);

  const totalHours = members.reduce((sum, m) => sum + m.hours, 0);
  const avgHours = members.length > 0 ? totalHours / members.length : 0;

  res.json({ members, totalHours, avgHours });
});

router.get('/department-ranking', auth, roleCheck('hr'), (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const ranking = db.prepare(
    `SELECT d.name, COALESCE(SUM(o.duration), 0) as total_hours
     FROM departments d
     LEFT JOIN users u ON d.id = u.department_id
     LEFT JOIN overtime_applications o ON u.id = o.user_id AND o.status = 'approved'
       AND strftime('%Y-%m', o.date) = ?
     GROUP BY d.id, d.name
     ORDER BY total_hours DESC`
  ).all(currentMonth);

  res.json(ranking);
});

router.get('/approval-efficiency', auth, roleCheck('hr'), (req, res) => {
  const { month } = req.query;
  const currentMonth = month || new Date().toISOString().slice(0, 7);

  const overall = db.prepare(
    `SELECT AVG(
       (julianday(ar.created_at) - julianday(
         CASE WHEN ar.application_type = 'overtime' THEN
           (SELECT created_at FROM overtime_applications WHERE id = ar.application_id)
         ELSE
           (SELECT created_at FROM leave_applications WHERE id = ar.application_id)
         END
       )) * 24
     ) as avg_hours
     FROM approval_records ar
     WHERE strftime('%Y-%m', ar.created_at) = ?`
  ).get(currentMonth);

  const byDepartment = db.prepare(
    `SELECT d.name, AVG(
       (julianday(ar.created_at) - julianday(
         CASE WHEN ar.application_type = 'overtime' THEN
           (SELECT created_at FROM overtime_applications WHERE id = ar.application_id)
         ELSE
           (SELECT created_at FROM leave_applications WHERE id = ar.application_id)
         END
       )) * 24
     ) as avg_hours
     FROM approval_records ar
     JOIN users u ON ar.approver_id = u.id
     JOIN departments d ON u.department_id = d.id
     WHERE strftime('%Y-%m', ar.created_at) = ?
     GROUP BY d.id, d.name`
  ).all(currentMonth);

  res.json({
    avgApprovalHours: overall.avg_hours ? Math.round(overall.avg_hours * 100) / 100 : 0,
    byDepartment,
  });
});

export default router;
