console.log('Starting server...');

const express = require('express');
const path = require('path');
const http = require('http');
const httpProxy = require('http-proxy');
const fs = require('fs');
const app = express();
require('dotenv').config();

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files from the current directory
app.use(express.static(__dirname));

// Set database path dynamically
const dbPath = process.env.FLY_APP_NAME ? '/app/data/devices.db' : './devices.db';

// Create the data directory on Fly.io if it doesn't exist
if (process.env.FLY_APP_NAME) {
  const dataDir = '/app/data';
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('Created data directory on Fly.io at:', dataDir);
  }
}

// SQLite database setup
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database at:', dbPath);
  }
});

// Create devices table with initial columns
db.run(`CREATE TABLE IF NOT EXISTS devices (
  deviceId TEXT PRIMARY KEY,
  verified INTEGER DEFAULT 0,
  lastAccessStart INTEGER
)`, (err) => {
  if (err) {
    console.error('Error creating table:', err.message);
  } else {
    console.log('Devices table created or already exists.');
    
    // Add verification_expires_at column
    db.run(`ALTER TABLE devices ADD COLUMN verification_expires_at INTEGER`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding verification_expires_at column:', err.message);
      } else {
        console.log('Added verification_expires_at column or it already exists.');
      }
    });

    // Add access_coursebooks column with default value 0
    db.run(`ALTER TABLE devices ADD COLUMN access_coursebooks INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding access_coursebooks column:', err.message);
      } else {
        console.log('Added access_coursebooks column or it already exists.');
        db.run(`UPDATE devices SET access_coursebooks = 0 WHERE access_coursebooks IS NULL`, (err) => {
          if (err) {
            console.error('Error setting default for access_coursebooks:', err.message);
          }
        });
      }
    });

    // Add access_collegecourses column with default value 0
    db.run(`ALTER TABLE devices ADD COLUMN access_collegecourses INTEGER DEFAULT 0`, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        console.error('Error adding access_collegecourses column:', err.message);
      } else {
        console.log('Added access_collegecourses column or it already exists.');
        db.run(`UPDATE devices SET access_collegecourses = 0 WHERE access_collegecourses IS NULL`, (err) => {
          if (err) {
            console.error('Error setting default for access_collegecourses:', err.message);
          }
        });
      }
    });
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
  
  const now = Date.now();
  db.get('SELECT verified, verification_expires_at FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.redirect('/index.html');
    }
    
    // Check if device exists, is verified, and verification hasn't expired
    if (!row || 
        row.verified !== 1 || 
        (row.verification_expires_at && row.verification_expires_at < now)) {
      return res.redirect('/index.html');
    }
    next();
  });
}

// Admin routes
app.get('/admin.html', adminAuth, (req, res, next) => next());
app.get('/get-devices', adminAuth, (req, res) => {
  db.all('SELECT deviceId, verified, verification_expires_at, access_coursebooks, access_collegecourses FROM devices', [], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows || []);
  });
});

app.post('/verify-device', adminAuth, (req, res) => {
  const { deviceId, days = 14, allowCoursebooks = false, allowCollegeCourses = false } = req.body;
  
  // Check if deviceId is provided
  if (!deviceId) {
    return res.status(400).send('Device ID is required');
  }
  
  // Calculate expiration timestamp (current time + days in milliseconds)
  const expiresAt = Date.now() + days * 24 * 60 * 60 * 1000;
  
  // Convert permissions to integers (1 for true, 0 for false)
  const accessCoursebooks = allowCoursebooks ? 1 : 0;
  const accessCollegeCourses = allowCollegeCourses ? 1 : 0;
  
  // Log the verification action
  console.log(`Verifying device: ${deviceId} for ${days} days with coursebooks access: ${accessCoursebooks} and college courses access: ${accessCollegeCourses}`);
  
  // Update the database
  db.run(
    'UPDATE devices SET verified = 1, verification_expires_at = ?, access_coursebooks = ?, access_collegecourses = ? WHERE deviceId = ?',
    [expiresAt, accessCoursebooks, accessCollegeCourses, deviceId],
    function (err) {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).send('Server error');
      }
      if (this.changes > 0) {
        res.send('Device verified successfully');
      } else {
        res.status(404).send('Device not found');
      }
    }
  );
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
  const deviceId = req.query.deviceId;
  const now = Date.now();

  db.get('SELECT verified, verification_expires_at, access_coursebooks FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }

    let verified = false;
    let expiresAt = null;
    let hasExpired = false;
    let permissions = { coursebooks: false };

    if (row) {
      expiresAt = row.verification_expires_at; // Timestamp from the database
      if (row.verified === 1) {
        if (!expiresAt || expiresAt > now) {
          verified = true;
        } else {
          hasExpired = true;
        }
      }
      permissions.coursebooks = row.access_coursebooks === 1;
    }

    res.json({
      verified,
      expiresAt,
      hasExpired,
      permissions
    });
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
  
  const now = Date.now();
  db.get('SELECT verified, verification_expires_at, access_coursebooks, lastAccessStart FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.redirect('/index.html');
    }
    
    // Check if device exists, is verified, verification hasn't expired, and has coursebook access
    if (!row || 
        row.verified !== 1 || 
        (row.verification_expires_at && row.verification_expires_at < now) ||
        row.access_coursebooks !== 1) {
      return res.redirect('/index.html');
    }
    
    // Time-window access logic for coursebooks
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

// Add route for college courses
app.get('/collegecourses.html', (req, res) => {
  const deviceId = req.query.deviceId;
  if (!deviceId) {
    return res.redirect('/index.html');
  }
  
  const now = Date.now();
  db.get('SELECT verified, verification_expires_at, access_collegecourses FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.redirect('/index.html');
    }
    
    // Check if device exists, is verified, verification hasn't expired, and has college courses access
    if (!row || 
        row.verified !== 1 || 
        (row.verification_expires_at && row.verification_expires_at < now) ||
        row.access_collegecourses !== 1) {
      return res.redirect('/index.html');
    }
    
    // College courses don't have time window restrictions
    res.sendFile(path.join(__dirname, 'collegecourses.html'));
  });
});

// Get access status for coursebooks.html
app.get('/get-access-status', (req, res) => {
  const { deviceId } = req.query;
  if (!deviceId) {
    return res.json({ accessGranted: false, reason: 'No device ID' });
  }
  
  const now = Date.now();
  db.get('SELECT verified, verification_expires_at, access_coursebooks, lastAccessStart FROM devices WHERE deviceId = ?', [deviceId], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).send('Server error');
    }
    
    // Check verification and permissions
    if (!row) {
      return res.json({ accessGranted: false, reason: 'Device not registered' });
    }
    
    if (row.verified !== 1) {
      return res.json({ accessGranted: false, reason: 'Not verified' });
    }
    
    if (row.verification_expires_at && row.verification_expires_at < now) {
      return res.json({ accessGranted: false, reason: 'Verification expired' });
    }
    
    if (row.access_coursebooks !== 1) {
      return res.json({ accessGranted: false, reason: 'No coursebook access permission' });
    }
    
    // Check time window restrictions
    const threeHours = 3 * 60 * 60 * 1000;
    const fortyMinutes = 40 * 60 * 1000;
    const lastAccessStart = row.lastAccessStart ? parseInt(row.lastAccessStart) : null;

    if (!lastAccessStart || now - lastAccessStart >= threeHours) {
      res.json({ accessGranted: true, remainingTime: fortyMinutes, newWindow: true });
    } else if (now - lastAccessStart < fortyMinutes) {
      const remaining = fortyMinutes - (now - lastAccessStart);
      res.json({ accessGranted: true, remainingTime: remaining, newWindow: false });
    } else {
      const nextWindowAt = lastAccessStart + threeHours;
      const waitTime = nextWindowAt - now;
      res.json({ 
        accessGranted: false, 
        reason: 'Time window closed',
        nextWindowAt,
        waitTime
      });
    }
  });
});

// Set up proxy for Ultraviolet
const proxy = httpProxy.createProxyServer();

// Initialize variables for lazy loading Ultraviolet
let ultravioletApp = null;
let ultravioletInitializing = false;
let ultravioletInitPromise = null;

// Function to initialize Ultraviolet
async function initUltraviolet() {
  if (ultravioletApp) return ultravioletApp;
  
  if (ultravioletInitializing) {
    // If initialization is in progress, wait for it to complete
    return await ultravioletInitPromise;
  }
  
  ultravioletInitializing = true;
  ultravioletInitPromise = new Promise(async (resolve, reject) => {
    try {
      console.log('Initializing Ultraviolet...');
      const uv = (await import('./ultraviolet/src/index.js')).default;
      await uv.listen({ port: 8081, host: 'localhost' });
      console.log('Ultraviolet initialized and running on port 8081');
      ultravioletApp = uv;
      resolve(ultravioletApp);
    } catch (error) {
      console.error('Failed to initialize Ultraviolet:', error);
      ultravioletInitializing = false;
      reject(error);
    }
  });
  
  return await ultravioletInitPromise;
}

// Modify proxy middleware to lazy-load Ultraviolet
app.use('/proxy', async (req, res, next) => {
  try {
    if (!ultravioletApp) {
      await initUltraviolet();
    }
    // Continue with proxying the request
    proxy.web(req, res, { target: 'http://localhost:8081' });
  } catch (error) {
    console.error('Error in Ultraviolet proxy:', error);
    res.status(500).send('Proxy service unavailable');
  }
});

// Start Express server
const PORT = process.env.PORT || 8080;
const server = http.createServer(app);

// Update websocket handling with lazy loading
server.on('upgrade', async (req, socket, head) => {
  if (req.url.startsWith('/proxy')) {
    try {
      if (!ultravioletApp) {
        await initUltraviolet();
      }
      proxy.ws(req, socket, head, { target: 'http://localhost:8081' });
    } catch (error) {
      console.error('Error handling WebSocket upgrade:', error);
      socket.destroy();
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log("SIGTERM signal received: closing servers");
  if (ultravioletApp) ultravioletApp.close();
  if (server) server.close();
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err.message);
    } else {
      console.log('Database connection closed.');
    }
    process.exit(0);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);