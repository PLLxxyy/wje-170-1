import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../database.js';
import { auth, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const user = db.prepare(
    'SELECT id, username, password, name, role, department_id, supervisor_id FROM users WHERE username = ?'
  ).get(username);

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
      supervisorId: user.supervisor_id,
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      departmentId: user.department_id,
      supervisorId: user.supervisor_id,
    },
  });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare(
    `SELECT u.id, u.username, u.name, u.role, u.department_id, u.supervisor_id, d.name as department_name
     FROM users u LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?`
  ).get(req.user.id);

  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }

  res.json({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    departmentId: user.department_id,
    departmentName: user.department_name,
    supervisorId: user.supervisor_id,
  });
});

export default router;
