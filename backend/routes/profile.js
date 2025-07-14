const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

dotenv.config();
const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    console.log('No token provided in profile request');
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    //console.log('Token verified for user ID:', decoded.id);
    next();
  } catch (error) {
    console.log('Invalid token in profile request:', error.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get user profile
router.get('/', verifyToken, async (req, res) => {
  //console.log('Profile route accessed by user ID:', req.user.id);
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

   // console.log('Database connection established for profile fetch');

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, profile_photo, password, created_at FROM users WHERE id = ?', 
      [req.user.id]
    );

    if (!rows.length) {
      console.log('User not found in database for ID:', req.user.id);
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    console.log('User data retrieved:', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasProfilePhoto: !!user.profile_photo,
      hasPassword: !!user.password,
      createdAt: user.created_at
    });
    
    // Convert profile photo buffer to base64 if exists
    let profilePhotoBase64 = null;
    if (user.profile_photo) {
      profilePhotoBase64 = `data:image/jpeg;base64,${user.profile_photo.toString('base64')}`;
      console.log('Profile photo converted to base64');
    }

    // Create a masked password display (since we can't reverse hash, show a generic pattern)
    // This creates a pattern like "Abc***gh" as requested
    const maskedPassword = user.password ? 'Abc***gh' : '********';
    console.log('Password masked for display');

    const profileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: profilePhotoBase64,
      maskedPassword: maskedPassword,
      createdAt: user.created_at
    };

    await db.close();
    //console.log('Profile data sent successfully for user ID:', req.user.id);
    res.json(profileData);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/update', verifyToken, async (req, res) => {
  console.log('Profile update route accessed by user ID:', req.user.id);
  console.log('Update data received:', {
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    hasProfilePhoto: !!req.body.profilePhoto,
    hasPassword: !!req.body.password
  });
  
  try {
    const { name, email, phone, profilePhoto, password } = req.body;
    
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    console.log('Database connection established for profile update');

    // Convert base64 image to buffer if provided
    let profilePhotoBuffer = null;
    if (profilePhoto && profilePhoto.startsWith('data:image/')) {
      const base64Data = profilePhoto.replace(/^data:image\/[a-z]+;base64,/, '');
      profilePhotoBuffer = Buffer.from(base64Data, 'base64');
      console.log('Profile photo converted to buffer');
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log('Password hashed successfully');
    }

    // Build dynamic update query based on what's being updated
    let updateQuery = 'UPDATE users SET name = ?, email = ?, phone = ?';
    let updateParams = [name, email, phone];

    if (profilePhotoBuffer) {
      updateQuery += ', profile_photo = ?';
      updateParams.push(profilePhotoBuffer);
    }

    if (hashedPassword) {
      updateQuery += ', password = ?';
      updateParams.push(hashedPassword);
    }

    updateQuery += ' WHERE id = ?';
    updateParams.push(req.user.id);

    const [updateResult] = await db.execute(updateQuery, updateParams);
    
    if (updateResult.affectedRows === 0) {
      console.log('No rows affected during update for user ID:', req.user.id);
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    //console.log('Profile updated successfully, fetching updated data');

    // Fetch updated user data
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, profile_photo, password, created_at FROM users WHERE id = ?', 
      [req.user.id]
    );

    if (!rows.length) {
      console.log('User not found after update for ID:', req.user.id);
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    console.log('Updated user data retrieved:', {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasProfilePhoto: !!user.profile_photo,
      createdAt: user.created_at
    });
    
    // Convert profile photo buffer to base64 if exists
    let profilePhotoBase64 = null;
    if (user.profile_photo) {
      profilePhotoBase64 = `data:image/jpeg;base64,${user.profile_photo.toString('base64')}`;
      console.log('Updated profile photo converted to base64');
    }

    // Create a masked password display
    const maskedPassword = user.password ? 'Abc***gh' : '********';

    const updatedProfileData = {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      profilePhoto: profilePhotoBase64,
      maskedPassword: maskedPassword,
      createdAt: user.created_at
    };

    await db.close();
    console.log('Profile update completed successfully for user ID:', req.user.id);
    res.json(updatedProfileData);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;