console.log('Starting server...');

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
require('dotenv').config();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// SQLite database setup
const db = new sqlite3.Database('/app/data/devices.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create devices table
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

// Basic auth middleware for admin
const basicAuth = require('basic-auth');
function adminAuth(req, res, next) {
  const user = basicAuth(req);
  const validUsername = process.env.ADMIN_USERNAME || 'admin';
  const validPassword = process.env.ADMIN_PASSWORD || 'cogitoergoball';
  if (!user || user.name !== validUsername || user.pass !== validPassword) {
    res.set('WWW-Authenticate', 'Basic realm="Admin Access"');
    return res.status(401).send('Access denied');
  }
  next();
}

// Verification middleware for protected pages
function checkVerification(req, res, next) {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.redirect('/index.html');
  }
  db.get('SELECT verified FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err || !row || row.verified !== 1) {
      return res.redirect('/index.html');
    }
    next();
  });
}

// Admin routes
app.get('/admin.html', adminAuth, (req, res, next) => next());
app.get('/get-devices', adminAuth, (req, res) => {
  db.all('SELECT deviceId, verified FROM devices', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});
app.post('/verify-device', adminAuth, (req, res) => {
  const { deviceId } = req.body;
  console.log(`Verifying device: ${deviceId}`);
  db.run('UPDATE devices SET verified = 1 WHERE deviceId = ?', [deviceId], function(err) {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (this.changes > 0) {
      res.send('Device verified successfully');
    } else {
      res.status(404).send('Device not found');
    }
  });
});

// Register device
app.post('/register-device', (req, res) => {
  const { deviceId } = req.body;
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }
  db.get('SELECT deviceId FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (row) {
      return res.send('Device already registered');
    }
    db.run('INSERT INTO devices (deviceId, verified, lastAccessStart) VALUES (?, 0, NULL)', [deviceId], (err) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).send('Server error');
      }
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

// Protected routes for hidden pages
app.get('/truemath.html', checkVerification, (req, res) => {
  res.sendFile(path.join(__dirname, 'truemath.html'));
});

app.get('/funinlearning.html', checkVerification, (req, res) => {
  res.sendFile(path.join(__dirname, 'funinlearning.html'));
});

app.get('/coursebooks.html', (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.redirect('/index.html');
  }
  db.get('SELECT verified, lastAccessStart FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err || !row || row.verified !== 1) {
      return res.redirect('/index.html');
    }
    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000;
    const fortyMinutes = 40 * 60 * 1000;
    const lastAccessStart = row.lastAccessStart ? parseInt(row.lastAccessStart) : null;

    if (!lastAccessStart || now - lastAccessStart >= threeHours) {
      db.run('UPDATE devices SET lastAccessStart = ? WHERE deviceId = ?', [now, deviceId], (err) => {
        if (err) {
          console.error('Database error:', err.message);
          return res.status(500).send('Server error');
        }
        res.sendFile(path.join(__dirname, 'coursebooks.html'));
      });
    } else if (now - lastAccessStart < fortyMinutes) {
      res.sendFile(path.join(__dirname, 'coursebooks.html'));
    } else {
      res.send('Access denied. Please wait until the next access window.');
    }
  });
});

// Get access status for coursebooks.html
app.get('/get-access-status', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.json({ accessGranted: false, reason: 'No device ID' });
  }
  db.get('SELECT verified, lastAccessStart FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    if (!row || row.verified !== 1) {
      return res.json({ accessGranted: false, reason: 'Not verified' });
    }
    const now = Date.now();
    const threeHours = 3 * 60 * 60 * 1000;
    const fortyMinutes = 40 * 60 * 1000;
    const lastAccessStart = row.lastAccessStart ? parseInt(row.lastAccessStart) : null;

    if (!lastAccessStart || now - lastAccessStart >= threeHours) {
      res.json({ accessGranted: true, remainingTime: fortyMinutes, newWindow: true });
    } else if (now - lastAccessStart < fortyMinutes) {
      const remaining = fortyMinutes - (now - lastAccessStart);
      res.json({ accessGranted: true, remainingTime: remaining });
    } else {
      const nextWindowAt = lastAccessStart + threeHours;
      res.json({ accessGranted: false, nextWindowAt });
    }
  });
});

// Start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
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