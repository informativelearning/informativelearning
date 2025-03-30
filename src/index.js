// --- Imports ---
import { createServer } from "node:http";
// No 'join', 'dirname', 'fileURLToPath', 'fs' needed for this simple version
import { hostname } from "node:os";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static"; // Original UV frontend files/assets
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";    // Core UV engine scripts
import { epoxyPath } from "@mercuryworkshop/epoxy-transport"; // Epoxy transport scripts
import { baremuxPath } from "@mercuryworkshop/bare-mux/node"; // Bare transport scripts

// --- Fastify Setup ---
console.log('[INIT - Revert Basic UV] Creating Fastify instance...');
const fastify = Fastify({
    logger: true, // Keep logging enabled
    // Use the serverFactory that includes Wisp handling
    serverFactory: (handler, opts) => {
        console.log('[INIT - Revert Basic UV] Server factory called.');
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
console.log('[INIT - Revert Basic UV] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
//    This handles index.html, index.css, uv.png, search.js etc. from the package
console.log('[INIT - Revert Basic UV] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,   // Serve files FROM the ultraviolet-static package
    prefix: '/',          // Serve AT the root
    decorateReply: true,  // Needs decoration once
    index: "index.html",  // Default file for '/' is UV's index.html
});
console.log('[INIT - Revert Basic UV] Registered / (UV Frontend & Assets) static handler OK.');


// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
//    This handles uv.bundle.js, uv.config.js, uv.sw.js, etc.
console.log('[INIT - Revert Basic UV] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Revert Basic UV] Registered /uv/ static handler OK.');

console.log('[INIT - Revert Basic UV] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Revert Basic UV] Registered /epoxy/ static handler OK.');

console.log('[INIT - Revert Basic UV] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Revert Basic UV] Registered /baremux/ static handler OK.');


// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Revert Basic UV] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error('[ERROR] Failed to start server listener:', err);
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`[INIT - Revert Basic UV] Server successfully listening at ${address}`);
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