const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();
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
  console.log('Received date parameter:', date);
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const formattedDate = new Date(date).toISOString().split('T')[0];
    console.log('Formatted date for query:', formattedDate);

    const [rows] = await db.execute(
      'SELECT id, title, completed, due_date, created_at FROM todos WHERE user_id = ? AND DATE(due_date) = ? ORDER BY created_at DESC',
      [req.user.id, formattedDate]
    );
    console.log('Query result:', rows);
    res.json(rows);
    await db.close();
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/created/:date', authenticate, async (req, res) => {
  const { date } = req.params;
  console.log('Received created date parameter:', date);
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const formattedDate = new Date(date).toISOString().split('T')[0];
    console.log('Formatted created date for query:', formattedDate);

    const [rows] = await db.execute(
      'SELECT id, title, completed, due_date, created_at FROM todos WHERE user_id = ? AND DATE(created_at) = ? ORDER BY created_at DESC',
      [req.user.id, formattedDate]
    );
    console.log('Query result for created date:', rows);
    res.json(rows);
    await db.close();
  } catch (error) {
    console.error('Database error:', error.message);
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

module.exports = router;