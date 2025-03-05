const express = require('express');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files first
app.use(express.static(__dirname));

// In-memory storage for device IDs
const deviceRegistry = new Map();

// Define API routes before the catch-all
app.post('/api/register-device', (req, res) => {
  console.log('Received request body:', req.body);
  const { deviceId } = req.body;

  if (!deviceId) {
    console.log('Missing deviceId in request');
    return res.status(400).send('Device ID is required');
  }

  if (!deviceRegistry.has(deviceId)) {
    deviceRegistry.set(deviceId, { verified: false });
    console.log(`Registered device: ${deviceId}`);
    res.send('Device registered successfully');
  } else {
    console.log(`Device already registered: ${deviceId}`);
    res.send('Device already registered');
  }
});

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});