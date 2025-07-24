const express = require('express');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const router = express.Router();

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Get user profile
router.get('/', verifyToken, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    const [rows] = await db.execute(
      'SELECT id, name, email, phone, profile_photo, password, created_at FROM users WHERE id = ?', 
      [req.user.id]
    );

    if (!rows.length) {
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    
    // Convert profile photo buffer to base64 if exists
    let profilePhotoBase64 = null;
    if (user.profile_photo) {
      profilePhotoBase64 = `data:image/jpeg;base64,${user.profile_photo.toString('base64')}`;
    }

    // Create a masked password display (since we can't reverse hash, show a generic pattern)
    // This creates a pattern like "Abc***gh" as requested
    const maskedPassword = user.password ? 'Abc***gh' : '********';

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
    res.json(profileData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user profile
router.put('/update', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, profilePhoto, password } = req.body;
    
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Convert base64 image to buffer if provided
    let profilePhotoBuffer = null;
    if (profilePhoto && profilePhoto.startsWith('data:image/')) {
      const base64Data = profilePhoto.replace(/^data:image\/[a-z]+;base64,/, '');
      profilePhotoBuffer = Buffer.from(base64Data, 'base64');
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
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
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch updated user data
    const [rows] = await db.execute(
      'SELECT id, name, email, phone, profile_photo, password, created_at FROM users WHERE id = ?', 
      [req.user.id]
    );

    if (!rows.length) {
      await db.close();
      return res.status(404).json({ message: 'User not found' });
    }

    const user = rows[0];
    
    // Convert profile photo buffer to base64 if exists
    let profilePhotoBase64 = null;
    if (user.profile_photo) {
      profilePhotoBase64 = `data:image/jpeg;base64,${user.profile_photo.toString('base64')}`;
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
    res.json(updatedProfileData);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user account
router.delete('/delete', verifyToken, async (req, res) => {
  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });

    // Start transaction to ensure data consistency
    await db.beginTransaction();

    try {
      // Delete user's todos first (foreign key constraint)
      const [todoDeleteResult] = await db.execute(
        'DELETE FROM todos WHERE user_id = ?', 
        [req.user.id]
      );

      // Delete the user account
      const [userDeleteResult] = await db.execute(
        'DELETE FROM users WHERE id = ?', 
        [req.user.id]
      );

      if (userDeleteResult.affectedRows === 0) {
        await db.rollback();
        await db.close();
        return res.status(404).json({ message: 'User not found' });
      }

      // Commit the transaction
      await db.commit();

      await db.close();
      res.json({ message: 'Account deleted successfully' });
    } catch (transactionError) {
      await db.rollback();
      throw transactionError;
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error during account deletion' });
  }
});

module.exports = router;