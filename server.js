const express = require('express');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (like your HTML and JS files) from the current directory
app.use(express.static(__dirname));

// In-memory storage for device IDs (temporary solution)
const deviceRegistry = new Map();

// Define the /register-device endpoint
app.post('/register-device', (req, res) => {
  console.log('Received request body:', req.body); // Log for debugging
  const { deviceId } = req.body;
  if (!deviceId) {
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

// Start the server on the port Fly.io provides or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});