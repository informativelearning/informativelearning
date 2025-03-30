// --- Imports ---
import { createServer } from "node:http";
import { hostname } from "node:os";
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module'; // <<< Import createRequire
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";

// --- Use createRequire for bare-mux ---
console.log('[INIT - createRequire Bare Attempt 2] Attempting require...');
const require = createRequire(import.meta.url);
let BareMux, baremuxPath; // Declare variables
try {
    const bareServerModule = require("@mercuryworkshop/bare-mux/node");
    console.log('[INIT - createRequire Bare Attempt 2] require() success. Module type:', typeof bareServerModule);
    console.log('[INIT - createRequire Bare Attempt 2] Module keys:', bareServerModule ? Object.keys(bareServerModule) : 'null/undefined');

    // Check common ways CJS modules export classes
    if (bareServerModule && typeof bareServerModule.BareMux === 'function') {
        BareMux = bareServerModule.BareMux; // Try property access first
        console.log('[INIT - createRequire Bare Attempt 2] Found BareMux as property.');
    } else if (typeof bareServerModule === 'function') {
        // Sometimes the module.exports IS the constructor
        BareMux = bareServerModule;
        console.log('[INIT - createRequire Bare Attempt 2] Using default export as BareMux constructor.');
    } else {
         throw new Error("BareMux constructor not found via require(). Module structure is unexpected.");
    }

    // Get the path separately (might be a direct export or property)
    baremuxPath = bareServerModule.baremuxPath || bareServerModule; // Guess path location
    if(typeof baremuxPath !== 'string' && bareServerModule?.default?.baremuxPath) {
        baremuxPath = bareServerModule.default.baremuxPath; // Check default export property
    }
     if (!baremuxPath || typeof baremuxPath !== 'string') {
        console.error("[INIT - createRequire Bare Attempt 2] Could not find baremuxPath!");
        // Attempt to locate it manually (less reliable)
        try {
            baremuxPath = require.resolve("@mercuryworkshop/bare-mux/node").replace('index.js', ''); // Hacky fallback
            console.warn("[INIT - createRequire Bare Attempt 2] Using require.resolve hack for baremuxPath:", baremuxPath);
        } catch {
             throw new Error("baremuxPath could not be loaded or derived.");
        }
     } else {
        console.log('[INIT - createRequire Bare Attempt 2] Found baremuxPath:', baremuxPath);
     }

} catch (err) {
    console.error('[FATAL] Failed during require() or BareMux/baremuxPath resolution:', err);
    process.exit(1);
}
// --- End bare-mux require ---

import httpProxy from "http-proxy"; // Ensure this is imported

// --- Constants ---
console.log('[INIT - createRequire Bare Attempt 2] Initializing BareMux...');
const bare = new BareMux("/baremux/"); // Use the resolved BareMux
console.log('[INIT - createRequire Bare Attempt 2] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - createRequire Bare Attempt 2] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - createRequire Bare Attempt 2] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // ... Keep working serverFactory ...
         console.log('[INIT - createRequire Bare Attempt 2] Server factory called.');
         const server = createServer(/* ... */);
         server.on('upgrade', (req, socket, head) => { /* ... bare.shouldRoute / wisp ... */ });
         proxy.on('error', (err, req, res) => { /* ... error handling ... */ });
         return server;
     }
});
console.log('[INIT - createRequire Bare Attempt 2] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - createRequire Bare Attempt 2] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - createRequire Bare Attempt 2] Registered / (UV Frontend & Assets) static handler OK.');

// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - createRequire Bare Attempt 2] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare Attempt 2] Registered /uv/ static handler OK.');
console.log('[INIT - createRequire Bare Attempt 2] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare Attempt 2] Registered /epoxy/ static handler OK.');
console.log('[INIT - createRequire Bare Attempt 2] Registering /baremux/ static handler (for API client)...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare Attempt 2] Registered /baremux/ static handler OK.');

// 3. Bare Server Route - Handles the requests from the Service Worker (/service/*)
console.log('[INIT - createRequire Bare Attempt 2] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => {
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try { await bare.routeRequest(request.raw, reply.raw); } catch (err) { /* error handling */ }
});
console.log('[INIT - createRequire Bare Attempt 2] Registered Bare request handler OK.');

// --- Server Start & Shutdown Logic ---
// ... (Keep the same listen and shutdown logic) ...
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - createRequire Bare Attempt 2] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... shutdown and unhandledRejection logic ...