const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const router = express.Router();

const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', authenticate, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await db.execute('SELECT id, title, completed, due_date, created_at FROM todos WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
    res.json(rows);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/date/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const formattedDate = new Date(date).toISOString().split('T')[0];

    const [rows] = await db.execute(
      'SELECT id, title, completed, due_date, created_at FROM todos WHERE user_id = ? AND DATE(due_date) = ? ORDER BY created_at DESC',
      [req.user.id, formattedDate]
    );
    res.json(rows);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/created/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const formattedDate = new Date(date).toISOString().split('T')[0];

    const [rows] = await db.execute(
      'SELECT id, title, completed, due_date, created_at FROM todos WHERE user_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC',
      [req.user.id, formattedDate]
    );
    res.json(rows);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', authenticate, async (req, res) => {
  const { title, due_date } = req.body;
  if (!title) return res.status(400).json({ message: 'Title field is required' });

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [result] = await db.execute('INSERT INTO todos (user_id, title, due_date) VALUES (?, ?, ?)', [req.user.id, title, due_date || null]);
    const [newTodo] = await db.execute('SELECT id, title, completed, due_date, created_at FROM todos WHERE id = ?', [result.insertId]);
    res.status(201).json(newTodo[0]);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/toggle', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await db.execute('UPDATE todos SET completed = NOT completed WHERE id = ? AND user_id = ?', [id, req.user.id]);
    const [updatedTodo] = await db.execute('SELECT id, title, completed, due_date, created_at FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json(updatedTodo[0]);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  const { title, due_date } = req.body;
  
  if (!title) return res.status(400).json({ message: 'Title field is required' });

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await db.execute('UPDATE todos SET title = ?, due_date = ? WHERE id = ? AND user_id = ?', [title, due_date || null, id, req.user.id]);
    const [updatedTodo] = await db.execute('SELECT id, title, completed, due_date, created_at FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.json(updatedTodo[0]);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  const { id } = req.params;
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    await db.execute('DELETE FROM todos WHERE id = ? AND user_id = ?', [id, req.user.id]);
    res.status(200).json({ message: 'Todo deleted' });
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get upcoming todos (due within next 7 days)
router.get('/upcoming', authenticate, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const todayStr = today.toISOString().split('T')[0];
    const nextWeekStr = nextWeek.toISOString().split('T')[0];

    const [rows] = await db.execute(
      `SELECT id, title, completed, due_date, created_at 
       FROM todos 
       WHERE user_id = ? 
       AND due_date IS NOT NULL 
       AND DATE(due_date) BETWEEN ? AND ? 
       ORDER BY due_date ASC, created_at DESC`,
      [req.user.id, todayStr, nextWeekStr]
    );
    
    res.json(rows);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get overdue todos
router.get('/overdue', authenticate, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const today = new Date().toISOString().split('T')[0];

    const [rows] = await db.execute(
      `SELECT id, title, completed, due_date, created_at 
       FROM todos 
       WHERE user_id = ? 
       AND due_date IS NOT NULL 
       AND DATE(due_date) < ? 
       AND completed = 0
       ORDER BY due_date ASC`,
      [req.user.id, today]
    );
    
    res.json(rows);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get todo statistics
router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Get overall stats
    const [totalStats] = await db.execute(
      'SELECT COUNT(*) as total, SUM(completed) as completed FROM todos WHERE user_id = ?',
      [req.user.id]
    );

    // Get today's stats
    const today = new Date().toISOString().split('T')[0];
    const [todayStats] = await db.execute(
      'SELECT COUNT(*) as total, SUM(completed) as completed FROM todos WHERE user_id = ? AND DATE(created_at) = ?',
      [req.user.id, today]
    );

    // Get this week's stats
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    
    const [weekStats] = await db.execute(
      'SELECT COUNT(*) as total, SUM(completed) as completed FROM todos WHERE user_id = ? AND DATE(created_at) >= ?',
      [req.user.id, weekStartStr]
    );

    // Get this month's stats
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];
    
    const [monthStats] = await db.execute(
      'SELECT COUNT(*) as total, SUM(completed) as completed FROM todos WHERE user_id = ? AND DATE(created_at) >= ?',
      [req.user.id, monthStartStr]
    );

    // Get overdue count
    const [overdueStats] = await db.execute(
      `SELECT COUNT(*) as overdue FROM todos 
       WHERE user_id = ? 
       AND due_date IS NOT NULL 
       AND DATE(due_date) < ? 
       AND completed = 0`,
      [req.user.id, today]
    );

    // Get upcoming count (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekStr = nextWeek.toISOString().split('T')[0];
    
    const [upcomingStats] = await db.execute(
      `SELECT COUNT(*) as upcoming FROM todos 
       WHERE user_id = ? 
       AND due_date IS NOT NULL 
       AND DATE(due_date) BETWEEN ? AND ?`,
      [req.user.id, today, nextWeekStr]
    );

    const stats = {
      total: {
        total: totalStats[0].total || 0,
        completed: totalStats[0].completed || 0,
        pending: (totalStats[0].total || 0) - (totalStats[0].completed || 0)
      },
      today: {
        total: todayStats[0].total || 0,
        completed: todayStats[0].completed || 0,
        pending: (todayStats[0].total || 0) - (todayStats[0].completed || 0)
      },
      week: {
        total: weekStats[0].total || 0,
        completed: weekStats[0].completed || 0,
        pending: (weekStats[0].total || 0) - (weekStats[0].completed || 0)
      },
      month: {
        total: monthStats[0].total || 0,
        completed: monthStats[0].completed || 0,
        pending: (monthStats[0].total || 0) - (monthStats[0].completed || 0)
      },
      overdue: overdueStats[0].overdue || 0,
      upcoming: upcomingStats[0].upcoming || 0
    };

    res.json(stats);
    await db.close();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;