// --- Imports ---
import { createServer } from "node:http";
import { hostname } from "node:os";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Fastify Setup ---
console.log('[INIT - Final Stable Fallback] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => {
        console.log('[INIT - Final Stable Fallback] Server factory called.');
        const server = createServer((req, res) => {
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
            handler(req, res);
        });
        server.on('upgrade', (req, socket, head) => {
            if (req.url?.endsWith("/wisp/")) {
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
console.log('[INIT - Final Stable Fallback] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Final Stable Fallback] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,
    prefix: '/',
    decorateReply: true,
    index: "index.html",
});
console.log('[INIT - Final Stable Fallback] Registered / (UV Frontend & Assets) static handler OK.');


// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Final Stable Fallback] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Final Stable Fallback] Registered /uv/ static handler OK.');

console.log('[INIT - Final Stable Fallback] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Final Stable Fallback] Registered /epoxy/ static handler OK.');

console.log('[INIT - Final Stable Fallback] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Final Stable Fallback] Registered /baremux/ static handler OK.');


// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Final Stable Fallback] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error('[ERROR] Failed to start server listener:', err);
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`[INIT - Final Stable Fallback] Server successfully listening at ${address}`);
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
process.on('unhandledRejection', (reason, promise) => { console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason); });