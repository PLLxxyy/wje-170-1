import { Router } from 'express';
import db from '../database.js';
import { auth, roleCheck } from '../middleware/auth.js';

const router = Router();

router.get('/pending', auth, roleCheck('supervisor', 'hr'), (req, res) => {
  const { page = 1, pageSize = 10, application_type } = req.query;
  const offset = (page - 1) * pageSize;

  let overtimeWhere = '';
  let leaveWhere = '';
  const overtimeParams = [];
  const leaveParams = [];

  if (req.user.role === 'supervisor') {
    overtimeWhere = "WHERE o.status = 'pending_supervisor' AND u.supervisor_id = ?";
    leaveWhere = "WHERE la.status = 'pending_supervisor' AND u.supervisor_id = ?";
    overtimeParams.push(req.user.id);
    leaveParams.push(req.user.id);
  } else if (req.user.role === 'hr') {
    overtimeWhere = "WHERE o.status = 'pending_hr'";
    leaveWhere = "WHERE la.status = 'pending_hr'";
  }

  let list = [];
  let total = 0;

  if (!application_type || application_type === 'overtime') {
    const otTotal = db.prepare(
      `SELECT COUNT(*) as count FROM overtime_applications o JOIN users u ON o.user_id = u.id ${overtimeWhere}`
    ).get(...overtimeParams).count;
    const otList = db.prepare(
      `SELECT o.id, 'overtime' as application_type, o.date, o.start_time, o.end_time, o.duration,
              o.overtime_type, o.compensatory_hours, o.reason, o.status, o.created_at,
              u.name as applicant_name, d.name as department_name
       FROM overtime_applications o
       JOIN users u ON o.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${overtimeWhere}
       ORDER BY o.created_at DESC`
    ).all(...overtimeParams);
    list = list.concat(otList);
    total += otTotal;
  }

  if (!application_type || application_type === 'leave') {
    const lvTotal = db.prepare(
      `SELECT COUNT(*) as count FROM leave_applications la JOIN users u ON la.user_id = u.id ${leaveWhere}`
    ).get(...leaveParams).count;
    const lvList = db.prepare(
      `SELECT la.id, 'leave' as application_type, la.start_date as date, la.start_date, la.end_date,
              la.hours as duration, la.reason, la.status, la.created_at,
              u.name as applicant_name, d.name as department_name
       FROM leave_applications la
       JOIN users u ON la.user_id = u.id
       LEFT JOIN departments d ON u.department_id = d.id
       ${leaveWhere}
       ORDER BY la.created_at DESC`
    ).all(...leaveParams);
    list = list.concat(lvList);
    total += lvTotal;
  }

  list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const pagedList = list.slice(offset, offset + Number(pageSize));

  res.json({
    list: pagedList,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / pageSize),
  });
});

function getApplicationAndType(id) {
  let app = db.prepare('SELECT * FROM overtime_applications WHERE id = ?').get(id);
  if (app) return { app, type: 'overtime' };
  app = db.prepare('SELECT * FROM leave_applications WHERE id = ?').get(id);
  if (app) return { app, type: 'leave' };
  return null;
}

router.post('/:id/approve', auth, roleCheck('supervisor', 'hr'), (req, res) => {
  const id = req.params.id;
  const result = getApplicationAndType(id);
  if (!result) {
    return res.status(404).json({ error: '申请不存在' });
  }

  const { app, type } = result;
  const tableName = type === 'overtime' ? 'overtime_applications' : 'leave_applications';

  if (req.user.role === 'supervisor') {
    if (app.status !== 'pending_supervisor') {
      return res.status(400).json({ error: '当前状态不允许主管审批' });
    }
    const applicant = db.prepare('SELECT supervisor_id FROM users WHERE id = ?').get(app.user_id);
    if (applicant.supervisor_id !== req.user.id) {
      return res.status(403).json({ error: '无权审批此申请' });
    }
  } else if (req.user.role === 'hr') {
    if (app.status !== 'pending_hr') {
      return res.status(400).json({ error: '当前状态不允许HR审批' });
    }
  }

  const newStatus = req.user.role === 'supervisor' ? 'pending_hr' : 'approved';
  const level = req.user.role === 'supervisor' ? 'supervisor' : 'hr';

  const updateApp = db.prepare(
    `UPDATE ${tableName} SET status = ?, updated_at = datetime('now') WHERE id = ?`
  );
  const insertRecord = db.prepare(
    `INSERT INTO approval_records (application_id, application_type, approver_id, level, action, comment)
     VALUES (?, ?, ?, ?, 'approved', ?)`
  );
  const updateLeaveBalance = db.prepare(
    `UPDATE leave_balances SET total_overtime_hours = total_overtime_hours + ? WHERE user_id = ?`
  );
  const ensureBalance = db.prepare(
    `INSERT OR IGNORE INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, 0, 0, 0)`
  );

  const transaction = db.transaction(() => {
    updateApp.run(newStatus, id);
    insertRecord.run(id, type, req.user.id, level, req.body.comment || '');

    if (type === 'overtime' && newStatus === 'approved') {
      ensureBalance.run(app.user_id);
      updateLeaveBalance.run(app.compensatory_hours, app.user_id);
    }
  });

  transaction();
  res.json({ message: '审批通过', newStatus });
});

router.post('/:id/reject', auth, roleCheck('supervisor', 'hr'), (req, res) => {
  const id = req.params.id;
  const { comment } = req.body;
  if (!comment) {
    return res.status(400).json({ error: '驳回必须填写意见' });
  }

  const result = getApplicationAndType(id);
  if (!result) {
    return res.status(404).json({ error: '申请不存在' });
  }

  const { app, type } = result;
  const tableName = type === 'overtime' ? 'overtime_applications' : 'leave_applications';

  if (req.user.role === 'supervisor') {
    if (app.status !== 'pending_supervisor') {
      return res.status(400).json({ error: '当前状态不允许主管审批' });
    }
    const applicant = db.prepare('SELECT supervisor_id FROM users WHERE id = ?').get(app.user_id);
    if (applicant.supervisor_id !== req.user.id) {
      return res.status(403).json({ error: '无权审批此申请' });
    }
  } else if (req.user.role === 'hr') {
    if (app.status !== 'pending_hr') {
      return res.status(400).json({ error: '当前状态不允许HR审批' });
    }
  }

  const level = req.user.role === 'supervisor' ? 'supervisor' : 'hr';

  const transaction = db.transaction(() => {
    db.prepare(`UPDATE ${tableName} SET status = 'rejected', updated_at = datetime('now') WHERE id = ?`).run(id);
    db.prepare(
      `INSERT INTO approval_records (application_id, application_type, approver_id, level, action, comment)
       VALUES (?, ?, ?, ?, 'rejected', ?)`
    ).run(id, type, req.user.id, level, comment);
  });

  transaction();
  res.json({ message: '已驳回' });
});

router.get('/history', auth, (req, res) => {
  const records = db.prepare(
    `SELECT ar.*, u.name as approver_name
     FROM approval_records ar
     JOIN users u ON ar.approver_id = u.id
     WHERE ar.approver_id = ?
     ORDER BY ar.created_at DESC`
  ).all(req.user.id);

  const enriched = records.map(r => {
    let applicantName = '';
    if (r.application_type === 'overtime') {
      const app = db.prepare(
        `SELECT u.name FROM overtime_applications o JOIN users u ON o.user_id = u.id WHERE o.id = ?`
      ).get(r.application_id);
      applicantName = app?.name || '';
    } else {
      const app = db.prepare(
        `SELECT u.name FROM leave_applications l JOIN users u ON l.user_id = u.id WHERE l.id = ?`
      ).get(r.application_id);
      applicantName = app?.name || '';
    }
    return { ...r, applicant_name: applicantName };
  });

  res.json(enriched);
});

export default router;
