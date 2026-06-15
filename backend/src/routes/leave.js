import { Router } from 'express';
import db from '../database.js';
import { auth } from '../middleware/auth.js';

const router = Router();

router.get('/balance', auth, (req, res) => {
  let balance = db.prepare(
    'SELECT * FROM leave_balances WHERE user_id = ?'
  ).get(req.user.id);

  if (!balance) {
    db.prepare(
      'INSERT OR IGNORE INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, 0, 0, 0)'
    ).run(req.user.id);
    balance = db.prepare(
      'SELECT * FROM leave_balances WHERE user_id = ?'
    ).get(req.user.id);
  }

  res.json({
    totalOvertimeHours: balance.total_overtime_hours,
    exchangedHours: balance.exchanged_hours,
    usedHours: balance.used_hours,
    availableHours: balance.total_overtime_hours - balance.exchanged_hours - balance.used_hours,
  });
});

router.post('/exchange', auth, (req, res) => {
  const { overtimeIds, hours } = req.body;
  if (!overtimeIds || !Array.isArray(overtimeIds) || overtimeIds.length === 0) {
    return res.status(400).json({ error: '请选择要兑换的加班记录' });
  }
  if (!hours || hours <= 0) {
    return res.status(400).json({ error: '兑换时长必须大于0' });
  }

  const applications = db.prepare(
    `SELECT * FROM overtime_applications WHERE id IN (${overtimeIds.map(() => '?').join(',')}) AND user_id = ?`
  ).all(...overtimeIds, req.user.id);

  const invalidApps = applications.filter(
    a => a.status !== 'approved' || a.exchanged === 1
  );
  if (invalidApps.length > 0) {
    return res.status(400).json({ error: '只能兑换已审批通过且未兑换的加班记录' });
  }

  const totalAvailable = applications.reduce((sum, a) => sum + a.duration, 0);
  if (hours > totalAvailable) {
    return res.status(400).json({ error: '兑换时长超过可兑换加班时长' });
  }

  const ensureBalance = db.prepare(
    'INSERT OR IGNORE INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, 0, 0, 0)'
  );
  const updateBalance = db.prepare(
    'UPDATE leave_balances SET exchanged_hours = exchanged_hours + ? WHERE user_id = ?'
  );
  const markExchanged = db.prepare(
    'UPDATE overtime_applications SET exchanged = 1 WHERE id = ?'
  );

  const transaction = db.transaction(() => {
    ensureBalance.run(req.user.id);
    updateBalance.run(hours, req.user.id);
    for (const id of overtimeIds) {
      markExchanged.run(id);
    }
  });

  transaction();

  const balance = db.prepare(
    'SELECT * FROM leave_balances WHERE user_id = ?'
  ).get(req.user.id);

  res.json({
    totalOvertimeHours: balance.total_overtime_hours,
    exchangedHours: balance.exchanged_hours,
    usedHours: balance.used_hours,
    availableHours: balance.total_overtime_hours - balance.exchanged_hours - balance.used_hours,
  });
});

router.post('/apply', auth, (req, res) => {
  const { startDate, endDate, reason, hours } = req.body;
  if (!startDate || !endDate || !reason || !hours) {
    return res.status(400).json({ error: '所有字段均为必填' });
  }

  const balance = db.prepare(
    'SELECT * FROM leave_balances WHERE user_id = ?'
  ).get(req.user.id);

  const available = balance
    ? balance.total_overtime_hours - balance.exchanged_hours - balance.used_hours
    : 0;

  if (hours > available) {
    return res.status(400).json({ error: '调休时长不足' });
  }

  const ensureBalance = db.prepare(
    'INSERT OR IGNORE INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, 0, 0, 0)'
  );
  const updateUsed = db.prepare(
    'UPDATE leave_balances SET used_hours = used_hours + ? WHERE user_id = ?'
  );
  const insertLeave = db.prepare(
    `INSERT INTO leave_applications (user_id, start_date, end_date, hours, reason, status)
     VALUES (?, ?, ?, ?, ?, 'pending_supervisor')`
  );

  const transaction = db.transaction(() => {
    ensureBalance.run(req.user.id);
    updateUsed.run(hours, req.user.id);
    insertLeave.run(req.user.id, startDate, endDate, hours, reason);
  });

  transaction();

  const application = db.prepare(
    'SELECT * FROM leave_applications WHERE user_id = ? ORDER BY created_at DESC LIMIT 1'
  ).get(req.user.id);

  res.status(201).json(application);
});

router.get('/my', auth, (req, res) => {
  const { page = 1, pageSize = 10, status } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE user_id = ?';
  const params = [req.user.id];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM leave_applications ${where}`
  ).get(...params).count;

  const list = db.prepare(
    `SELECT * FROM leave_applications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset);

  res.json({
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / pageSize),
  });
});

export default router;
