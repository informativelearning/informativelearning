const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (like your HTML and JS files) from the current directory
app.use(express.static(__dirname));

// Use /app/data directory for SQLite database (matches fly.toml mount point)
const db = new sqlite3.Database('/app/data/devices.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create the devices table if it doesn’t exist
db.run(`CREATE TABLE IF NOT EXISTS devices (
  deviceId TEXT PRIMARY KEY,
  verified INTEGER DEFAULT 0,
  lastAccessStart INTEGER
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Devices table created or already exists.');
  }
});

// Define the /register-device endpoint
app.post('/register-device', (req, res) => {
  console.log('Received request body:', req.body); // Log for debugging
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }
  // Check if the device already exists
  db.get('SELECT deviceId FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (row) {
      console.log(`Device already registered: ${deviceId}`);
      return res.send('Device already registered');
    }
    // Insert new device with verified=0 and lastAccessStart=NULL
    db.run('INSERT INTO devices (deviceId, verified, lastAccessStart) VALUES (?, 0, NULL)', [deviceId], (err) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).send('Server error');
      }
      console.log(`Registered device: ${deviceId}`);
      res.send('Device registered successfully');
    });
  });
});

// Check verification status
app.get('/check-verification', (req, res) => {
  const { deviceId } = req.query;
  db.get('SELECT verified FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    res.json({ verified: row ? row.verified === 1 : false });
  });
});

// Verify device (admin endpoint)
app.post('/verify-device', (req, res) => {
  const { deviceId } = req.body;
  db.run('UPDATE devices SET verified = 1 WHERE deviceId = ?', [deviceId], function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (this.changes > 0) {
      console.log(`Verified device: ${deviceId}`);
      res.send('Device verified successfully');
    } else {
      res.status(404).send('Device not found');
    }
  });
});

// Get access status for coursebooks.html
app.get('/get-access-status', (req, res) => {
  const { deviceId } = req.query;
  db.get('SELECT verified, lastAccessStart FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (!row || row.verified === 0) {
      return res.json({ accessGranted: false, reason: 'Not verified' });
    }
    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000; // 3-hour cooldown period
    const fortyMinutes = 40 * 60 * 1000;   // 40-minute access window
    const lastAccessStart = row.lastAccessStart ? parseInt(row.lastAccessStart) : null;

    if (!lastAccessStart || now - lastAccessStart >= threeHours) {
      // Start a new access window by updating lastAccessStart
      db.run('UPDATE devices SET lastAccessStart = ? WHERE deviceId = ?', [now, deviceId], (err) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).send('Server error');
        }
        res.json({ accessGranted: true, remainingTime: fortyMinutes });
      });
    } else if (now - lastAccessStart < fortyMinutes) {
      // Still within the 40-minute window
      const remaining = fortyMinutes - (now - lastAccessStart);
      res.json({ accessGranted: true, remainingTime: remaining });
    } else {
      // Access denied until the 3-hour cooldown expires
      const nextWindowAt = lastAccessStart + threeHours;
      res.json({ accessGranted: false, nextWindowAt });
    }
  });
});

// Start the server on the port Fly.io provides or default to 8080
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Gracefully close the database connection on server shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
});