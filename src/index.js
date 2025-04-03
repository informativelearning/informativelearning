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
        // Don't throw the error further
    } finally {
        if (client) {
            client.release();
            console.log('[INIT - Postgres Connect v2] DB client released.');
        }
    }
}

// --- Fastify Setup ---
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

// --- Route Definitions ---
// Serves UV assets from root
fastify.register(fastifyStatic, {
    root: publicPath,
    decorateReply: true,
    prefix: '/',
    index: "index.html",
});

// Serves specific UV config
fastify.get("/uv/uv.config.js", (req, res) => {
    return res.sendFile("uv/uv.config.js", publicPath);
});

// Serves core UV scripts
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// Serves your static files
fastify.register(fastifyStatic, {
    root: localStaticPath,
    prefix: "/welcome/",
    decorateReply: false,
});

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