const express = require('express');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (like scientific.html) from the current directory
app.use(express.static(__dirname));

// In-memory storage for device IDs
const deviceRegistry = new Map();

// Endpoint to register a device ID
app.post('/register-device', (req, res) => {
  const { deviceId } = req.body;

  // Check if deviceId is provided
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }

  // Register the device if it’s not already in the registry
  if (!deviceRegistry.has(deviceId)) {
    deviceRegistry.set(deviceId, { verified: false });
    console.log(`Registered device: ${deviceId}`); // Log registration
    res.send('Device registered successfully');
  } else {
    console.log(`Device already registered: ${deviceId}`); // Log duplicate
    res.send('Device already registered');
  }
});

// Start the server
const PORT = process.env.PORT || 8080; // Fly.io sets PORT automatically
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});