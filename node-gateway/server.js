const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// The address of our Python/Rust scheduling engine
const PYTHON_ENGINE_URL = process.env.PYTHON_ENGINE_URL || 'http://localhost:8000/api/v1/schedule';

// Route to handle schedule generation requests from React
app.post('/api/generate-schedule', async (req, res) => {
    try {
        console.log("Received request from React. Forwarding to Python Engine...");
        
        // Pass the universal JSON payload to the Python engine
        const engineResponse = await axios.post(PYTHON_ENGINE_URL, req.body);
        
        console.log("Engine returned schedule successfully.");
        
        // In the future, you will save engineResponse.data to MongoDB here
        // before sending it back to the frontend.
        
        res.json(engineResponse.data);
    } catch (error) {
        console.error("Engine Communication Error:", error.message);
        res.status(500).json({ error: "Failed to generate schedule from engine." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Node Gateway running on http://localhost:${PORT}`);
});