// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from 'node:url';
import { hostname } from "node:os";
import fs from 'node:fs';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
import pg from "pg";
import auth from 'basic-auth';
import fastifyFormbody from '@fastify/formbody';

// UV Core Imports
import { publicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localStaticPath = join(__dirname, "..", "static");
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_USER = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASSWORD || 'password';
console.log(`[DEBUG] Admin User: ${ADMIN_USER}`);

// --- PostgreSQL Connection Setup ---
console.log('[INIT - Postgres Connect v2] Setting up PostgreSQL connection pool...');
let pool;

if (!DATABASE_URL) {
    console.error("WARNING: DATABASE_URL environment variable not set! PostgreSQL features will be disabled.");
    // Don't exit the process - allow the server to start without DB
} else {
    pool = new pg.Pool({
        connectionString: DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        },
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 10000,
        max: 10,
    });

    pool.on('connect', () => console.log('[INIT - Postgres Connect v2] PostgreSQL pool emitted connect event.'));
    pool.on('error', (err, client) => {
        console.error('[ERROR] Unexpected error on idle PostgreSQL client', err);
        // Don't crash the server on pool errors
    });

    // Initialize database after pool is created
    initializeDatabase().catch(err => {
        console.error('[ERROR] Database initialization error:', err);
        // Don't crash the server on initialization error
    });
}

// --- Create Table Function ---
async function initializeDatabase() {
    if (!pool) return console.log('[INIT] Skipping database initialization - no connection pool');
    
    console.log('[INIT - Postgres Connect v2] Initializing database table...');
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS verified_devices (
        "deviceId" TEXT PRIMARY KEY NOT NULL,
        "verified" INTEGER DEFAULT 0 NOT NULL,
        "verifiedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "verification_expires_at" BIGINT,
        "access_proxy" INTEGER DEFAULT 0 NOT NULL,
        "access_games" INTEGER DEFAULT 0 NOT NULL,
        "access_other" TEXT
      );
    `;
    let client;
    try {
        client = await pool.connect();
        await client.query(createTableQuery);
        console.log('[INIT - Postgres Connect v2] Table "verified_devices" is ready.');
    } catch (err) {
        console.error('[ERROR] Failed to create or check "verified_devices" table:', err);
    } finally {
        if (client) {
            client.release();
            console.log('[INIT - Postgres Connect v2] DB client released.');
        }
    }
}

// --- Authentication Middleware ---
function checkAdminAuth(request, reply, done) {
    console.log('[AUTH] Checking admin auth...');
    const credentials = auth(request);
    let denied = true; // Assume denied initially
    
    if (credentials && credentials.name === ADMIN_USER && credentials.pass === ADMIN_PASS) {
        denied = false; // Grant access if credentials match
        console.log('[AUTH] Admin auth successful.');
        done(); // Proceed to the route handler
        return;
    }

    if (denied) {
        console.warn('[AUTH] Admin auth failed.');
        // If check failed, send 401 Unauthorized
        reply.code(401).header('WWW-Authenticate', 'Basic realm="Admin Area"').send({ error: 'Unauthorized' });
        // 'done()' is NOT called, preventing access to the route
    }
}

// --- Fastify Setup ---
console.log('[INIT - Server] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler) => {
        return createServer()
            .on("request", (req, res) => {
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
                res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                handler(req, res);
            })
            .on("upgrade", (req, socket, head) => {
                if (req.url.endsWith("/wisp/")) wisp.routeRequest(req, socket, head);
                else socket.end();
            });
    },
});

// Enable parsing of form data and JSON bodies
fastify.register(fastifyFormbody);
console.log('[INIT - Server] Fastify instance created.');

// --- Route Definitions ---

// Serves custom index.html at root
fastify.get('/', (request, reply) => {
    reply.sendFile('homepage.html', localStaticPath); // Use your custom file name
});

// Serves other UV assets from root (except index.html)
console.log('[INIT - Server] Registering / (UV Frontend) static handler...');
fastify.register(fastifyStatic, {
    root: publicPath,
    decorateReply: true,
    prefix: '/',
    index: false, // Disable automatic index serving
});
console.log('[INIT - Server] Registered / (UV Frontend) static handler OK.');

// Serves specific UV config
console.log('[INIT - Server] Registering specific /uv/uv.config.js route...');
fastify.get("/uv/uv.config.js", (req, res) => {
    return res.sendFile("uv/uv.config.js", publicPath);
});
console.log('[INIT - Server] Registered specific /uv/uv.config.js route OK.');

// Serves core UV scripts
console.log('[INIT - Server] Registering core script handlers...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
console.log('[INIT - Server] Registered core script handlers OK.');

// Serves static files - combining both paths
fastify.register(fastifyStatic, {
    root: localStaticPath,
    prefix: "/welcome/",
    decorateReply: false,
});
console.log('[INIT - Server] Registered static file handlers OK.');

// --- Public API Routes ---
console.log('[INIT - Server] Registering Public API routes...');

// API: Register Device
fastify.post('/api/register-device', async (request, reply) => {
    const { deviceId } = request.body || {};
    console.log(`[API] POST /api/register-device for ID: ${deviceId}`);
    
    if (!deviceId) return reply.code(400).send({ error: 'Device ID required' });
    if (!pool) return reply.code(503).send({ error: 'Database not connected' });
    
    try {
        // Check if device already exists
        const checkResult = await pool.query('SELECT * FROM verified_devices WHERE "deviceId" = $1', [deviceId]);
        
        if (checkResult.rowCount > 0) {
            // Device already registered
            return reply.send({ 
                success: true, 
                message: 'Device already registered',
                verified: checkResult.rows[0].verified === 1
            });
        }
        
        // Insert new unverified device
        const result = await pool.query(`
            INSERT INTO verified_devices ("deviceId", verified, "verifiedAt")
            VALUES ($1, 0, NOW())
        `, [deviceId]);
        
        reply.send({ 
            success: true, 
            message: 'Device registered successfully, awaiting verification' 
        });
    } catch (err) {
        console.error('[API Error] /api/register-device:', err);
        reply.code(500).send({ error: 'Database query failed' });
    }
});

// API: Check Verification Status
fastify.get('/api/check-verification', async (request, reply) => {
    const deviceId = request.query.deviceId;
    console.log(`[API] GET /api/check-verification for ID: ${deviceId}`);
    
    if (!deviceId) return reply.code(400).send({ error: 'Device ID required' });
    if (!pool) return reply.code(503).send({ error: 'Database not connected' });
    
    try {
        const result = await pool.query(`
            SELECT 
                verified, 
                "verification_expires_at", 
                access_proxy, 
                access_games, 
                access_other 
            FROM verified_devices 
            WHERE "deviceId" = $1
        `, [deviceId]);
        
        if (result.rowCount === 0) {
            return reply.code(404).send({ 
                verified: false, 
                message: 'Device not registered' 
            });
        }
        
        const device = result.rows[0];
        const now = Date.now();
        const isExpired = device.verification_expires_at && now > device.verification_expires_at;
        
        reply.send({
            verified: device.verified === 1 && !isExpired,
            expired: isExpired,
            access: {
                proxy: device.access_proxy === 1,
                games: device.access_games === 1,
                other: device.access_other
            },
            expiresAt: device.verification_expires_at
        });
    } catch (err) {
        console.error('[API Error] /api/check-verification:', err);
        reply.code(500).send({ error: 'Database query failed' });
    }
});

console.log('[INIT - Server] Registered Public API routes OK.');

// --- Admin Page & API Routes ---
console.log('[INIT - Server] Registering Admin routes...');
fastify.register(async function adminApiRoutes(fastify, options) {
    // Serve admin.html (Apply auth check before handler)
    fastify.get('/admin.html', { preHandler: checkAdminAuth }, (request, reply) => {
        console.log('[ROUTE] Serving static/admin.html');
        const pagePath = join(localStaticPath, 'admin.html');
        if (fs.existsSync(pagePath)) {
            return reply.sendFile('admin.html', localStaticPath);
        } else {
            console.error(`[ERROR] Cannot find admin.html at ${pagePath}`);
            reply.code(404).send('Admin page not found.');
        }
    });

    // API: List Devices (Apply auth check before handler)
    fastify.get('/api/list-devices', { preHandler: checkAdminAuth }, async (request, reply) => {
        console.log('[API] GET /api/list-devices');
        if (!pool) return reply.code(503).send({ error: 'Database not connected' });
        try {
            const result = await pool.query('SELECT "deviceId", "verified", "verifiedAt", "verification_expires_at", "access_proxy", "access_games", "access_other" FROM verified_devices ORDER BY "verifiedAt" DESC');
            reply.send(result.rows || []);
        } catch (err) {
            console.error('[API Error] /api/list-devices:', err);
            reply.code(500).send({ error: 'Database query failed' });
        }
    });

    // API: Verify/Update Device (Apply auth check before handler)
    fastify.post('/api/verify-device', { preHandler: checkAdminAuth }, async (request, reply) => {
        // Default values if not provided in request
        const { deviceId, days = 14, access_proxy = 0, access_games = 0, access_other = null } = request.body || {};
        console.log(`[API] POST /api/verify-device for ID: ${deviceId}`);
        if (!deviceId) return reply.code(400).send({ error: 'Device ID required' });
        if (!pool) return reply.code(503).send({ error: 'Database not connected' });

        // Use BIGINT for timestamp (milliseconds since epoch)
        const expiresAt = Date.now() + Number(days) * 24 * 60 * 60 * 1000;
        // Ensure boolean flags are integers 0 or 1
        const proxyAccess = access_proxy ? 1 : 0;
        const gamesAccess = access_games ? 1 : 0;

        const sql = `
            INSERT INTO verified_devices ("deviceId", verified, "verification_expires_at", access_proxy, access_games, access_other, "verifiedAt")
            VALUES ($1, 1, $2, $3, $4, $5, NOW())
            ON CONFLICT("deviceId") DO UPDATE SET
                verified=1,
                "verification_expires_at" = excluded."verification_expires_at",
                access_proxy = excluded.access_proxy,
                access_games = excluded.access_games,
                access_other = excluded.access_other,
                "verifiedAt" = NOW();
        `;
        try {
            const result = await pool.query(sql, [deviceId, expiresAt, proxyAccess, gamesAccess, access_other]);
            reply.send({ success: true, rowCount: result.rowCount });
        } catch (err) {
            console.error('[API Error] /api/verify-device:', err);
            reply.code(500).send({ error: 'Database query failed' });
        }
    });

    // API: Remove Device (Apply auth check before handler)
    fastify.post('/api/remove-device', { preHandler: checkAdminAuth }, async (request, reply) => {
        const { deviceId } = request.body || {};
        console.log(`[API] POST /api/remove-device for ID: ${deviceId}`);
        if (!deviceId) return reply.code(400).send({ error: 'Device ID required' });
        if (!pool) return reply.code(503).send({ error: 'Database not connected' });
        try {
            const result = await pool.query('DELETE FROM verified_devices WHERE "deviceId" = $1', [deviceId]);
            if (result.rowCount > 0) {
                reply.send({ success: true, message: 'Device removed.' });
            } else {
                reply.code(404).send({ error: 'Device not found.' });
            }
        } catch (err) {
            console.error('[API Error] /api/remove-device:', err);
            reply.code(500).send({ error: 'Database query failed' });
        }
    });
    
}, { prefix: '/admin' });
console.log('[INIT - Server] Registered Admin routes OK.');

// --- Server Start & Shutdown Logic ---
fastify.server.on("listening", () => {
    const address = fastify.server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(`\thttp://${hostname()}:${address.port}`);
    console.log(
        `\thttp://${
            address.family === "IPv6" ? `[${address.address}]` : address.address
        }:${address.port}`
    );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    try {
        await fastify.close();
        console.log("Fastify server closed.");
        if (pool) {
            await pool.end();
            console.log("PostgreSQL pool closed.");
        }
        process.exit(0);
    } catch (err) {
        console.error("Error during shutdown:", err);
        process.exit(1);
    }
}

let port = parseInt(process.env.PORT || "8080");
if (isNaN(port)) port = 8080;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error("Listener Error:", err);
        process.exit(1);
    }
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't exit - this is better for handling errors
});