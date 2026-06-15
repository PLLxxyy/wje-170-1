import { Router } from 'express';
import db, { getOvertimeTypeByDate } from '../database.js';
import { auth } from '../middleware/auth.js';

const router = Router();

function calculateDuration(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  return (endMinutes - startMinutes) / 60;
}

function calculateCompensatoryHours(duration, overtimeType) {
  const multiplier = overtimeType === 'weekend' ? 1.5 : overtimeType === 'holiday' ? 2 : 1;
  return Math.round(duration * multiplier * 10) / 10;
}

router.post('/', auth, (req, res) => {
  const { date, startTime, endTime, reason, workContent, overtimeType } = req.body;
  if (!date || !startTime || !endTime || !reason || !workContent) {
    return res.status(400).json({ error: '所有字段均为必填' });
  }

  const type = overtimeType || getOvertimeTypeByDate(date);
  if (!['workday', 'weekend', 'holiday'].includes(type)) {
    return res.status(400).json({ error: '无效的加班类型' });
  }

  const duration = calculateDuration(startTime, endTime);
  if (duration <= 0) {
    return res.status(400).json({ error: '加班时长必须大于0' });
  }

  const compensatoryHours = calculateCompensatoryHours(duration, type);

  const result = db.prepare(
    `INSERT INTO overtime_applications (user_id, date, start_time, end_time, duration, overtime_type, compensatory_hours, reason, work_content, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_supervisor')`
  ).run(req.user.id, date, startTime, endTime, duration, type, compensatoryHours, reason, workContent);

  const application = db.prepare(
    'SELECT * FROM overtime_applications WHERE id = ?'
  ).get(result.lastInsertRowid);

  res.status(201).json(application);
});

router.get('/my', auth, (req, res) => {
  const { page = 1, pageSize = 10, status, month } = req.query;
  const offset = (page - 1) * pageSize;

  let where = 'WHERE user_id = ?';
  const params = [req.user.id];

  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (month) {
    where += " AND strftime('%Y-%m', date) = ?";
    params.push(month);
  }

  const total = db.prepare(
    `SELECT COUNT(*) as count FROM overtime_applications ${where}`
  ).get(...params).count;

  const list = db.prepare(
    `SELECT * FROM overtime_applications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, Number(pageSize), offset);

  res.json({
    list,
    total,
    page: Number(page),
    pageSize: Number(pageSize),
    totalPages: Math.ceil(total / pageSize),
  });
});

router.get('/:id', auth, (req, res) => {
  const application = db.prepare(
    'SELECT * FROM overtime_applications WHERE id = ?'
  ).get(req.params.id);

  if (!application) {
    return res.status(404).json({ error: '加班申请不存在' });
  }

  const approvalRecords = db.prepare(
    `SELECT ar.*, u.name as approver_name
     FROM approval_records ar
     JOIN users u ON ar.approver_id = u.id
     WHERE ar.application_id = ? AND ar.application_type = 'overtime'
     ORDER BY ar.created_at`
  ).all(req.params.id);

  res.json({ ...application, approvalRecords });
});

router.put('/:id', auth, (req, res) => {
  const application = db.prepare(
    'SELECT * FROM overtime_applications WHERE id = ?'
  ).get(req.params.id);

  if (!application) {
    return res.status(404).json({ error: '加班申请不存在' });
  }
  if (application.user_id !== req.user.id) {
    return res.status(403).json({ error: '无权修改此申请' });
  }
  if (application.status !== 'rejected') {
    return res.status(400).json({ error: '只有被驳回的申请才能修改' });
  }

  const { date, startTime, endTime, reason, workContent, overtimeType } = req.body;
  const newDate = date || application.date;
  const newStart = startTime || application.start_time;
  const newEnd = endTime || application.end_time;
  const newReason = reason || application.reason;
  const newContent = workContent || application.work_content;
  const newType = overtimeType || getOvertimeTypeByDate(newDate);
  const duration = calculateDuration(newStart, newEnd);
  const compensatoryHours = calculateCompensatoryHours(duration, newType);

  db.prepare(
    `UPDATE overtime_applications
     SET date = ?, start_time = ?, end_time = ?, duration = ?, overtime_type = ?, compensatory_hours = ?,
         reason = ?, work_content = ?, status = 'pending_supervisor', updated_at = datetime('now')
     WHERE id = ?`
  ).run(newDate, newStart, newEnd, duration, newType, compensatoryHours, newReason, newContent, req.params.id);

  const updated = db.prepare(
    'SELECT * FROM overtime_applications WHERE id = ?'
  ).get(req.params.id);

  res.json(updated);
});

export default router;
