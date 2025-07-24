const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, phone, password, confirmPassword, profilePhoto, agreeToTerms } = req.body;
  
  // Validate required fields
  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ message: 'Name, email, password, and confirm password are required' });
  }

  // Validate password match
  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Passwords do not match' });
  }

  // Validate terms agreement
  if (!agreeToTerms) {
    return res.status(400).json({ message: 'You must agree to the terms and conditions' });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  // Validate password strength
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    // Check if user already exists
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length) {
      await db.close();
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Convert base64 image to buffer if provided
    let profilePhotoBuffer = null;
    if (profilePhoto) {
      try {
        // Remove data:image/jpeg;base64, or similar prefix if present
        const base64Data = profilePhoto.replace(/^data:image\/[a-z]+;base64,/, '');
        profilePhotoBuffer = Buffer.from(base64Data, 'base64');
      } catch (imageError) {
        await db.close();
        return res.status(400).json({ message: 'Invalid profile photo format' });
      }
    }

    // Insert user into database
    const [result] = await db.execute(
      'INSERT INTO users (name, email, phone, password, profile_photo) VALUES (?, ?, ?, ?, ?)', 
      [name, email, phone || null, hashedPassword, profilePhotoBuffer]
    );

    await db.close();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (!rows.length) {
      await db.close();
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await db.close();
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
    await db.close();
    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;