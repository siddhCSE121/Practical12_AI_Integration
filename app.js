const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ override: true });

const aiRoutes = require('./routes/aiRoutes');
const taskRoutes = require('./routes/taskRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api/ai', aiRoutes);
app.use('/tasks', taskRoutes);

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'UP',
        service: 'prac13-ai-task-manager',
        timestamp: new Date().toISOString()
    });
});

// Root fallback to frontend UI
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

module.exports = app;
