const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('../config/db');

// Load env variables
dotenv.config();

// Connect to MongoDB (Vercel warm-start optimization)
let isConnected = false;
const connect = async () => {
  if (isConnected) return;
  await connectDB();
  isConnected = true;
};

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure DB connection
app.use(async (req, res, next) => {
  await connect();
  next();
});

// Routes - adjusted paths for api/ directory
app.use('/api/auth', require('../routes/auth'));
app.use('/api/shipment', require('../routes/shipment'));
app.use('/api/handoff', require('../routes/handoff'));
app.use('/api/alert', require('../routes/alert'));
// Note: /api/ai/predict is handled by predict.py in vercel.json

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'ChainProof Serverless API is running' });
});

// Export the app for Vercel
module.exports = app;
