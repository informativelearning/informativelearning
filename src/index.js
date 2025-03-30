// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path"; // <<< Need for path calc
import { fileURLToPath } from 'node:url'; // <<< Need for path calc
import { hostname } from "node:os";
import fs from 'node:fs'; // Optional: For checks if needed later
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
import { publicPath as uvPublicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url); // <<< Need
const __dirname = dirname(__filename);             // <<< Need
// Path to YOUR static folder containing educational page + assets
const localStaticPath = join(__dirname, "..", "static"); // <<< Need
console.log(`[DEBUG] User static path: ${localStaticPath}`);

// --- Fastify Setup ---
console.log('[INIT - Welcome Page + Proxy] Creating Fastify instance...');
const fastify = Fastify({
    logger: true, // Good for debugging
    serverFactory: (handler, opts) => {
        console.log('[INIT - Welcome Page + Proxy] Server factory called.');
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
console.log('[INIT - Welcome Page + Proxy] Fastify instance created.');

// --- Route Definitions ---

// 1. Redirect ROOT '/' requests to '/welcome'
console.log('[INIT - Welcome Page + Proxy] Registering / redirect...');
fastify.get('/', (request, reply) => {
    console.log('[ROUTE] Redirecting / to /welcome');
    reply.code(302).redirect('/welcome');
});
console.log('[INIT - Welcome Page + Proxy] Registered / redirect OK.');

// 2. Serve YOUR educational page AND assets from the /welcome path prefix
console.log('[INIT - Welcome Page + Proxy] Registering /welcome static handler...');
fastify.register(fastifyStatic, {
    root: localStaticPath,      // Serve from your static folder
    prefix: '/welcome',         // Only match URLs starting with /welcome
    decorateReply: true,       // Decorate needed for sendFile etc.
    index: "index.html"         // Serve index.html if /welcome/ is requested
    // NOTE: Requests for /welcome/css/style.css will serve static/css/style.css
    //       Requests for /welcome/img/about.jpg will serve static/img/about.jpg
    //       Requests for /welcome/favicon.ico will serve static/favicon.ico
});
console.log('[INIT - Welcome Page + Proxy] Registered /welcome static handler OK.');

// 3. Serve standard UV Frontend & Assets from /proxy/
console.log('[INIT - Welcome Page + Proxy] Registering /proxy/ static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,         // Serve default UV files
    prefix: '/proxy/',          // Mount AT /proxy/
    decorateReply: false,       // Already decorated above
    index: "index.html",        // Default for /proxy/ is UV's index.html
});
console.log('[INIT - Welcome Page + Proxy] Registered /proxy/ static handler OK.');

// 4. Serve Core UV/Bare/Epoxy engine assets from their ROOT paths
//    These MUST remain at the root as the client config expects them there
console.log('[INIT - Welcome Page + Proxy] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Welcome Page + Proxy] Registered /uv/ static handler OK.');

console.log('[INIT - Welcome Page + Proxy] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Welcome Page + Proxy] Registered /epoxy/ static handler OK.');

console.log('[INIT - Welcome Page + Proxy] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Welcome Page + Proxy] Registered /baremux/ static handler OK.');

// 5. Bare Server Route - Add this back to fix proxy search functionality
//    We need to try the 'createRequire' method again, as it's the standard way
//    Let's assume it WILL work this time and add it back. If it crashes, we know
//    the baremux import is the unfixable blocker for now.
console.log('[INIT - Welcome Page + Proxy] Adding createRequire for BareMux...');
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let BareMux, baremuxPathResolved; // Use different name for path to avoid conflict
try {
    const bareServerModule = require("@mercuryworkshop/bare-mux/node");
    if (bareServerModule && typeof bareServerModule.BareMux === 'function') {
        BareMux = bareServerModule.BareMux;
    } else if (typeof bareServerModule === 'function') {
         BareMux = bareServerModule; // Assume default export is constructor
    } else { throw new Error('BareMux constructor not found'); }

    if (bareServerModule && typeof bareServerModule.baremuxPath === 'string') {
        baremuxPathResolved = bareServerModule.baremuxPath;
    } else { throw new Error('baremuxPath not found'); }

    console.log('[INIT - Welcome Page + Proxy] BareMux loaded via createRequire.');
} catch (err) {
    console.error('[FATAL] Failed loading BareMux via createRequire:', err);
    process.exit(1); // Exit if we can't load Bare
}
const bare = new BareMux("/baremux/"); // Use the loaded constructor

console.log('[INIT - Welcome Page + Proxy] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => {
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try { await bare.routeRequest(request.raw, reply.raw); } catch (err) {
        console.error(`[BARE HTTP] Error routing Bare request for ${request.url}:`, err);
        if (!reply.sent) { reply.code(500).send({ error: "Proxy server processing error." }); }
    }
});
console.log('[INIT - Welcome Page + Proxy] Registered Bare request handler OK.');


// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Welcome Page + Proxy] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) { /* ... error handling ... */ }
    console.log(`[INIT - Welcome Page + Proxy] Server successfully listening at ${address}`);
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function shutdown() { /* ... shutdown logic ... */ }
process.on('unhandledRejection', (reason, promise) => { /* ... */ });