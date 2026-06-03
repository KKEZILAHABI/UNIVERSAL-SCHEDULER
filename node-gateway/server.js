require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const Schedule = require('./models/Schedule');

const app = express();

app.use(cors({
    origin: ['http://localhost:5173', 'https://universal-scheduler-murex.vercel.app/']
}));
app.use(express.json());

const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000/api/v1/schedule';/* */
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB successfully'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Health Check Route
app.get('/', (req, res) => {
    res.json({ status: "Gateway Online", database: mongoose.connection.readyState === 1 ? "Connected" : "Disconnected" });
});

// The core engine pipeline route
app.post('/api/generate-schedule', async (req, res) => {
    try {
        console.log("Received request from React. Forwarding to Python Engine...");
        
        // 1. Pass the payload to the Python engine
        const engineResponse = await axios.post(PYTHON_ENGINE_URL, req.body);
        console.log("Engine returned schedule successfully.");
        
        // 2. Save the input payload AND the engine output to MongoDB
        const newSchedule = new Schedule({
            title: `Run - ${new Date().toLocaleTimeString()}`,
            payload: req.body,
            result: engineResponse.data
        });
        
        const savedSchedule = await newSchedule.save();
        console.log(`Saved schedule to database with ID: ${savedSchedule._id}`);
        
        // 3. Return the saved document to the frontend
        res.json(savedSchedule);

    } catch (error) {
        console.error("Engine Communication Error:", error.message);
        res.status(500).json({ error: "Failed to process schedule via engine pipeline." });
    }
});

// Route to fetch all past schedules (for a future Dashboard view)
app.get('/api/schedules', async (req, res) => {
    try {
        const schedules = await Schedule.find().sort({ createdAt: -1 });
        res.json(schedules);
    } catch (error) {
        res.status(500).json({ error: "Failed to retrieve schedules." });
    }
});

app.listen(PORT, () => {
    console.log(`Node Gateway running on http://localhost:${PORT}`);
});