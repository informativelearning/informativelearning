// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path"; // Added back for file path handling
import { fileURLToPath } from "node:url"; // Added back for __dirname equivalent
import { hostname } from "node:os";
import fs from "node:fs"; // Added back for file existence checking
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static"; // Original UV frontend files/assets
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";    // Core UV engine scripts
import { epoxyPath } from "@mercuryworkshop/epoxy-transport"; // Epoxy transport scripts
import { baremuxPath } from "@mercuryworkshop/bare-mux/node"; // Bare transport scripts

// --- Configuration ---
// Added back path configuration for locating custom uv.config.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// Path to your 'static' folder
const localStaticPath = join(__dirname, "..", "static");
console.log(`[DEBUG] Expecting user static files at: ${localStaticPath}`);
console.log(`[DEBUG] Looking for custom uv.config.js at: ${join(localStaticPath, 'uv', 'uv.config.js')}`);

// --- Fastify Setup ---
console.log('[INIT - Basic UV] Creating Fastify instance...');
const fastify = Fastify({
    logger: true, // Keep logging enabled
    // Use the serverFactory that includes Wisp handling
    serverFactory: (handler, opts) => {
        console.log('[INIT - Basic UV] Server factory called.');
        const server = createServer((req, res) => {
             // Add security headers needed by UV
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
            handler(req, res);
        });
        server.on('upgrade', (req, socket, head) => {
            if (req.url?.endsWith("/wisp/")) { // Added optional chaining
                console.log('[WISP] Routing Wisp request');
                wisp.routeRequest(req, socket, head);
            } else {
                 console.log('[WISP] Closing non-Wisp upgrade request');
                socket.end();
            }
        });
        return server;
    }
});
console.log('[INIT - Basic UV] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Basic UV] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,   // Serve files FROM the ultraviolet-static package
    prefix: '/',          // Serve AT the root
    decorateReply: true,  // Needs decoration once for potential internal use by plugins/UV
    index: "index.html",  // Default file for '/' is UV's index.html
});
console.log('[INIT - Basic UV] Registered / (UV Frontend & Assets) static handler OK.');

// 2. Add the specific route to serve custom uv.config.js BEFORE the /uv/ static handler
console.log('[INIT - Basic UV] Registering override for /uv/uv.config.js...');
fastify.get("/uv/uv.config.js", (request, reply) => {
    console.log("[ROUTE] Serving OVERRIDDEN /uv/uv.config.js from static/uv/");
    const configPath = join(localStaticPath, 'uv', 'uv.config.js');
    if (fs.existsSync(configPath)) {
        return reply.sendFile('uv.config.js', join(localStaticPath, 'uv'));
    } else {
        console.error(`[ERROR] OVERRIDDEN uv.config.js not found at ${configPath}! Check static/uv folder.`);
        reply.code(404).send({ error: 'UV Configuration not found' });
    }
});
console.log('[INIT - Basic UV] Registered override for /uv/uv.config.js OK.');

// 3. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Basic UV] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Basic UV] Registered /uv/ static handler OK.');

console.log('[INIT - Basic UV] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Basic UV] Registered /epoxy/ static handler OK.');

console.log('[INIT - Basic UV] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Basic UV] Registered /baremux/ static handler OK.');

// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Basic UV] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error('[ERROR] Failed to start server listener:', err);
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`[INIT - Basic UV] Server successfully listening at ${address}`);
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function shutdown() {
    console.log("[SYSTEM] SIGTERM signal received: closing HTTP server");
    fastify.close().then(() => {
        console.log("[SYSTEM] Server closed.");
        process.exit(0);
    }).catch(err => {
        console.error("[ERROR] Error closing server during shutdown:", err);
        process.exit(1);
    });
}