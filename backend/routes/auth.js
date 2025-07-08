const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();
const router = express.Router();

router.post('/register', async (req, res) => {
  console.log('Register request received:', req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    console.log('Missing fields:', { email, password });
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log('Database connection established for register');

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    console.log('Email check result:', rows);
    if (rows.length) {
      console.log('User already exists:', email);
      await db.close();
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Password hashed for:', email);
    const [result] = await db.execute('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);
    console.log('User inserted:', { id: result.insertId, email });

    await db.close();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  console.log('Login request received:', req.body);
  const { email, password } = req.body;
  if (!email || !password) {
    console.log('Missing fields:', { email, password });
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    console.log('Database connection established for login');

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    console.log('Email check result:', rows);
    if (!rows.length) {
      console.log('User not found:', email);
      await db.close();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    console.log('Password match for:', email, isMatch);
    if (!isMatch) {
      console.log('Invalid password for:', email);
      await db.close();
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    console.log('Token generated for user:', user.id);
    await db.close();
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;