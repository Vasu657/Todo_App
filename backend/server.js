const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const authRoutes = require('./routes/auth');
const todoRoutes = require('./routes/todos');
const IP_ADDRESS = require('./ip');


const app = express();
app.use(cors({
  origin: 'http://192.168.x.x:19006', // Replace with your Expo frontend URL (check Expo dev server)
  methods: ['GET', 'POST', 'DELETE'],
}));
app.use(express.json());

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('MySQL connection error:', err);
    throw err;
  }
  console.log('MySQL Connected');
});

app.use('/api/auth', authRoutes);
app.use('/api/todos', todoRoutes);

app.listen(5000, IP_ADDRESS, () => {
  console.log(`Server running on http://${IP_ADDRESS}:5000`);
});