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
  console.log('Received request body:', req.body);
  const { deviceId } = req.body;
  // Check if deviceId is provided
  // Check if deviceId is provided
  if (!deviceId) {tus(400).send('Device ID is required');
    console.log('Missing deviceId in request');
    return res.status(400).send('Device ID is required');
  }  // Register the device if it’s not already in the registry

  // Register the device if it’s not already in the registryified: false });
  if (!deviceRegistry.has(deviceId)) {Log registration
    deviceRegistry.set(deviceId, { verified: false });
    console.log(`Registered device: ${deviceId}`); // Log registration
    res.send('Device registered successfully');e.log(`Device already registered: ${deviceId}`); // Log duplicate
  } else {
    console.log(`Device already registered: ${deviceId}`); // Log duplicate
    res.send('Device already registered');
  }
});// Start the server
s.env.PORT || 8080; // Fly.io sets PORT automatically
// Start the server
const PORT = process.env.PORT || 8080; // Fly.io sets PORT automaticallynning on port ${PORT}`);
app.listen(PORT, () => {  console.log(`Server running on port ${PORT}`);
});