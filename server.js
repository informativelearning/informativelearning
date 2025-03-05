const express = require('express');
const sqlite3 = require('sqlite3');
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (like scientific.html) from the current directory
app.use(express.static(__dirname));

// Open the database
const db = new sqlite3('devices.db');
db.run("CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, verified INTEGER)", (err) => {
  if (err) {
    console.error('Error creating table:', err);
  }
});

// Endpoint to register a device ID
app.post('/register-device', (req, res) => {
  const { deviceId } = req.body;

  // Check if deviceId is provided
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }

  db.get("SELECT id FROM devices WHERE id = ?", [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).send('Database error');
    }
    if (row) {
      return res.send('Device already registered');
    }
    db.run("INSERT INTO devices (id, verified) VALUES (?, 0)", [deviceId], (err) => {
      if (err) {
        console.error('Error registering device:', err);
        return res.status(500).send('Error registering device');
      }
      console.log(`Registered device: ${deviceId}`); // Log for flyctl logs
      res.send('Device registered successfully');
    });
  });
});

// Start the server
const PORT = process.env.PORT || 8080; // Fly.io sets PORT automatically
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});