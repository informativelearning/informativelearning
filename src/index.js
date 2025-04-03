// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path"; // <<< Ensure path utils are imported
import { fileURLToPath } from 'node:url'; // <<< Ensure this is imported
import { hostname } from "node:os";
import fs from 'node:fs';                 // <<< Need fs for directory check
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
import pg from "pg";                      // <<< ADDED: Import node-postgres

// UV Core Imports
import { publicPath } from "ultraviolet-static"; // Keep original name
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url); // <<< Need
const __dirname = dirname(__filename);             // <<< Need
const localStaticPath = join(__dirname, "..", "static"); // Path to your static folder
const DATABASE_URL = process.env.DATABASE_URL; // Provided by Fly.io

// --- PostgreSQL Connection Setup --- <<< ADDED SECTION >>>
console.log('[INIT - Postgres Connect v2] Setting up PostgreSQL connection pool...');
if (!DATABASE_URL) {
    console.error("FATAL: DATABASE_URL environment variable not set! Attach a Postgres DB using `fly postgres attach` or set it locally.");
    // For local testing without Fly, you might set a default fallback:
    // DATABASE_URL = "postgres://user:password@host:port/database";
    // Or use dotenv to load from a .env file
    process.exit(1); // Exit if DB URL isn't configured for deployment
}
const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    // Recommended settings for Fly.io Postgres
    ssl: {
         rejectUnauthorized: false // Necessary for Fly.io internal connections
    },
    connectionTimeoutMillis: 5000, // 5 seconds
    idleTimeoutMillis: 10000, // 10 seconds
    max: 10, // Max connections in pool
});

pool.on('connect', () => console.log('[INIT - Postgres Connect v2] PostgreSQL pool emitted connect event.')); // Info on connect
pool.on('error', (err, client) => {
  console.error('[ERROR] Unexpected error on idle PostgreSQL client', err);
});
// --- End PostgreSQL Connection Setup ---

// --- Create Table Function --- <<< ADDED SECTION >>>
async function initializeDatabase() {
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
    let client; // Declare client outside try block
    try {
        client = await pool.connect(); // Get a client from the pool
        await client.query(createTableQuery);
        console.log('[INIT - Postgres Connect v2] Table "verified_devices" is ready.');
    } catch (err) {
        console.error('[ERROR] Failed to create or check "verified_devices" table:', err);
    } finally {
        if (client) {
            client.release(); // Release the client back to the pool IMPORTANT!
            console.log('[INIT - Postgres Connect v2] DB client released.');
        }
    }
}
// Call the function immediately - it's async but we don't necessarily need to wait here
initializeDatabase();
// --- End Create Table Function ---


// --- Fastify Setup --- <<< Keep your existing setup >>>
const fastify = Fastify({
    logger: true, // <<< ADD Logger if you want it
	serverFactory: (handler) => { /* Your working serverFactory */ }
});

// --- Route Definitions --- <<< Keep your existing routes >>>

// Serves UV assets from root
fastify.register(fastifyStatic, {
	root: publicPath,
	decorateReply: true, // Decorate once
    prefix: '/',
    index: "index.html", // Serve UV index at root
});

// Serves specific UV config
fastify.get("/uv/uv.config.js", (req, res) => { /* ... */ });

// Serves core UV scripts
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });

// Serves your static files from /welcome/ (or remove if not needed yet)
// Consider adding path import back if you keep this
// fastify.register(fastifyStatic, {
//   root: join(__dirname, "..", "static"), // Use calculated path
//   prefix: "/welcome/",
//   decorateReply: false,
// });


// --- Server Start & Shutdown Logic --- <<< Update shutdown >>>

fastify.server.on("listening", () => { /* Your listening logs */ });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function shutdown() { // <<< Make shutdown async
	console.log("SIGTERM signal received: closing HTTP server");
	try {
        await fastify.close(); // Wait for Fastify
        console.log("Fastify server closed.");
        if (pool) { // Check if pool was initialized
            await pool.end(); // Close Postgres pool
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
    if (err) { console.error("Listener Error:", err); process.exit(1); }
    // Listening message will be logged by Fastify logger
});

process.on('unhandledRejection', (reason, promise) => { console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason); }); // <<< Good to keep