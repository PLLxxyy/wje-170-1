import bcrypt from 'bcryptjs';
import db from './database.js';

console.log('Seeding database...');

const clearAll = db.transaction(() => {
  db.exec('DELETE FROM approval_records');
  db.exec('DELETE FROM leave_balances');
  db.exec('DELETE FROM leave_applications');
  db.exec('DELETE FROM overtime_applications');
  db.exec('DELETE FROM users');
  db.exec('DELETE FROM departments');
  db.exec('DELETE FROM sqlite_sequence');
});

clearAll();

const seed = db.transaction(() => {
  const insertDept = db.prepare('INSERT INTO departments (name) VALUES (?)');
  const techId = insertDept.run('技术部').lastInsertRowid;
  const productId = insertDept.run('产品部').lastInsertRowid;
  const marketId = insertDept.run('市场部').lastInsertRowid;
  const hrId = insertDept.run('人事部').lastInsertRowid;

  const hashedPassword = bcrypt.hashSync('123456', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (username, password, name, role, department_id, supervisor_id) VALUES (?, ?, ?, ?, ?, ?)'
  );

  const lisiId = insertUser.run('lisi', hashedPassword, '李四', 'supervisor', techId, null).lastInsertRowid;
  const zhangsanId = insertUser.run('zhangsan', hashedPassword, '张三', 'employee', techId, lisiId).lastInsertRowid;
  const zhaoliuId = insertUser.run('zhaoliu', hashedPassword, '赵六', 'supervisor', productId, null).lastInsertRowid;
  const wangwuId = insertUser.run('wangwu', hashedPassword, '王五', 'employee', productId, zhaoliuId).lastInsertRowid;
  const chenqiId = insertUser.run('chenqi', hashedPassword, '陈七', 'employee', marketId, zhaoliuId).lastInsertRowid;
  const hr01Id = insertUser.run('hr01', hashedPassword, '人事专员', 'hr', hrId, null).lastInsertRowid;

  const insertOvertime = db.prepare(
    `INSERT INTO overtime_applications (user_id, date, start_time, end_time, duration, overtime_type, compensatory_hours, reason, work_content, status, exchanged)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const ot1 = insertOvertime.run(zhangsanId, '2026-06-01', '18:00', '21:00', 3, 'workday', 3, '项目上线紧急修复', '修复线上支付bug', 'approved', 0).lastInsertRowid;
  const ot2 = insertOvertime.run(zhangsanId, '2026-06-03', '19:00', '22:30', 3.5, 'workday', 3.5, '版本迭代开发', '完成用户模块重构', 'approved', 0).lastInsertRowid;
  const ot3 = insertOvertime.run(zhangsanId, '2026-06-05', '18:00', '20:00', 2, 'workday', 2, '系统监控告警处理', '处理服务器内存告警', 'pending_supervisor', 0).lastInsertRowid;
  const ot4 = insertOvertime.run(zhangsanId, '2026-06-07', '20:00', '23:00', 3, 'weekend', 4.5, '数据库迁移', 'MySQL数据迁移到新集群', 'pending_hr', 0).lastInsertRowid;

  const ot5 = insertOvertime.run(wangwuId, '2026-06-02', '18:00', '21:00', 3, 'workday', 3, '需求评审准备', '准备V2.0需求文档', 'approved', 0).lastInsertRowid;
  const ot6 = insertOvertime.run(wangwuId, '2026-06-04', '19:00', '22:00', 3, 'workday', 3, '竞品分析报告', '完成竞品分析报告', 'rejected', 0).lastInsertRowid;

  const ot7 = insertOvertime.run(chenqiId, '2026-06-01', '18:00', '20:00', 2, 'workday', 2, '市场活动方案', '准备618活动方案', 'approved', 0).lastInsertRowid;
  const ot8 = insertOvertime.run(chenqiId, '2026-06-06', '18:00', '21:30', 3.5, 'holiday', 7, '客户方案定制', '定制大客户推广方案', 'pending_supervisor', 0).lastInsertRowid;

  const insertApproval = db.prepare(
    `INSERT INTO approval_records (application_id, application_type, approver_id, level, action, comment)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  insertApproval.run(ot1, 'overtime', lisiId, 'supervisor', 'approved', '同意');
  insertApproval.run(ot1, 'overtime', hr01Id, 'hr', 'approved', '同意');
  insertApproval.run(ot2, 'overtime', lisiId, 'supervisor', 'approved', '同意');
  insertApproval.run(ot2, 'overtime', hr01Id, 'hr', 'approved', '同意');
  insertApproval.run(ot5, 'overtime', zhaoliuId, 'supervisor', 'approved', '同意');
  insertApproval.run(ot5, 'overtime', hr01Id, 'hr', 'approved', '同意');
  insertApproval.run(ot6, 'overtime', zhaoliuId, 'supervisor', 'rejected', '非紧急任务请合理安排时间');
  insertApproval.run(ot7, 'overtime', zhaoliuId, 'supervisor', 'approved', '同意');
  insertApproval.run(ot7, 'overtime', hr01Id, 'hr', 'approved', '同意');
  insertApproval.run(ot4, 'overtime', lisiId, 'supervisor', 'approved', '同意');

  const insertBalance = db.prepare(
    'INSERT INTO leave_balances (user_id, total_overtime_hours, exchanged_hours, used_hours) VALUES (?, ?, ?, ?)'
  );

  insertBalance.run(zhangsanId, 6.5, 3, 4);
  insertBalance.run(wangwuId, 3, 0, 0);
  insertBalance.run(chenqiId, 2, 0, 0);

  const insertLeave = db.prepare(
    `INSERT INTO leave_applications (user_id, start_date, end_date, hours, reason, status)
     VALUES (?, ?, ?, ?, ?, ?)`
  );

  insertLeave.run(zhangsanId, '2026-06-10', '2026-06-10', 4, '调休', 'approved');
  insertLeave.run(wangwuId, '2026-06-12', '2026-06-12', 3, '调休', 'pending_supervisor');
});

seed();

console.log('Database seeded successfully!');
console.log('');
console.log('Users created:');
console.log('  zhangsan / 123456 (employee, 技术部, supervisor: lisi)');
console.log('  lisi     / 123456 (supervisor, 技术部)');
console.log('  wangwu   / 123456 (employee, 产品部, supervisor: zhaoliu)');
console.log('  zhaoliu  / 123456 (supervisor, 产品部)');
console.log('  chenqi   / 123456 (employee, 市场部, supervisor: zhaoliu)');
console.log('  hr01     / 123456 (hr, 人事部)');
