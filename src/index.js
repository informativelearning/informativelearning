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
// *** CHANGE BareMux Import ***
// import { baremuxPath, BareMux } from "@mercuryworkshop/bare-mux/node"; // Old failing import
import bareServer from "@mercuryworkshop/bare-mux/node"; // Default import
const { baremuxPath, BareMux } = bareServer; // Extract named exports from default
// *** END CHANGE ***
import httpProxy from "http-proxy"; // Ensure this is present

// --- Constants ---
console.log('[INIT - Fix Bare Import] Initializing BareMux...');
// Use the extracted BareMux class
const bare = new BareMux("/baremux/");
console.log('[INIT - Fix Bare Import] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - Fix Bare Import] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - Fix Bare Import] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => {
        console.log('[INIT - Fix Bare Import] Server factory called.');
        const server = createServer((req, res) => {
            res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
            res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
            handler(req, res);
        });

        // Attach WebSocket upgrade handlers
        server.on('upgrade', (req, socket, head) => {
            // Route Bare WebSockets FIRST
            if (bare.shouldRoute(req)) {
                 console.log('[BARE WS] Routing Bare WebSocket request');
                 bare.routeUpgrade(req, socket, head);
            // Route Wisp WebSockets SECOND
            } else if (req.url?.endsWith("/wisp/")) {
                console.log('[WISP] Routing Wisp request');
                wisp.routeRequest(req, socket, head);
            } else {
                 console.log('[WEBSOCKET] Closing unknown upgrade request');
                socket.end();
            }
        });

        // Add connection listener for http-proxy errors
        proxy.on('error', (err, req, res) => {
           console.error('[BARE Proxy Error] Error fetching origin site:', err);
           try {
                if (res && !res.headersSent && !res.writableEnded) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end('Service unavailable.');
                } else if (res && !res.writableEnded) {
                     res.end();
                }
           } catch (e) { console.error("[BARE Proxy Error] Error writing proxy error response:", e); }
        });

        return server;
    }
});
console.log('[INIT - Fix Bare Import] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Fix Bare Import] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - Fix Bare Import] Registered / (UV Frontend & Assets) static handler OK.');


// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Fix Bare Import] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Import] Registered /uv/ static handler OK.');
console.log('[INIT - Fix Bare Import] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Import] Registered /epoxy/ static handler OK.');
console.log('[INIT - Fix Bare Import] Registering /baremux/ static handler (for API client)...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Import] Registered /baremux/ static handler OK.');


// 3. Bare Server Route - Handles the requests from the Service Worker
console.log('[INIT - Fix Bare Import] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => {
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try {
        await bare.routeRequest(request.raw, reply.raw);
    } catch (err) {
         console.error(`[BARE HTTP] Error routing Bare request for ${request.url}:`, err);
         if (!reply.sent) {
            reply.code(500).send({ error: "Proxy server processing error." });
         }
    }
});
console.log('[INIT - Fix Bare Import] Registered Bare request handler OK.');


// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Fix Bare Import] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) {
        console.error('[ERROR] Failed to start server listener:', err);
        fastify.log.error(err);
        process.exit(1);
    }
    console.log(`[INIT - Fix Bare Import] Server successfully listening at ${address}`);
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
process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});