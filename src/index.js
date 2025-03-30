// --- Imports ---
import { createServer } from "node:http";
import { hostname } from "node:os";
import { fileURLToPath } from 'node:url'; // Needed for createRequire
import { createRequire } from 'node:module'; // <<< Import createRequire
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
// --- Use createRequire for bare-mux ---
const require = createRequire(import.meta.url); // Create a require function relative to this file
const bareServerModule = require("@mercuryworkshop/bare-mux/node"); // Use require
const BareMux = bareServerModule.BareMux; // Access the class constructor as a property
const baremuxPath = bareServerModule.baremuxPath; // Access the path as a property
// --- End bare-mux require ---
import httpProxy from "http-proxy"; // Ensure this is imported

// --- Constants ---
console.log('[INIT - createRequire Bare] Initializing BareMux...');
if (!BareMux || typeof BareMux !== 'function') {
     // Add a check to ensure BareMux was loaded correctly
    console.error("FATAL: Failed to load BareMux constructor using createRequire.");
    process.exit(1); // Exit if we couldn't load it
}
const bare = new BareMux("/baremux/");
console.log('[INIT - createRequire Bare] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - createRequire Bare] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - createRequire Bare] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // ... Keep working serverFactory ...
         console.log('[INIT - createRequire Bare] Server factory called.');
         const server = createServer(/* ... */);
         server.on('upgrade', (req, socket, head) => { /* ... bare.shouldRoute / wisp ... */ });
         proxy.on('error', (err, req, res) => { /* ... error handling ... */ });
         return server;
     }
});
console.log('[INIT - createRequire Bare] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - createRequire Bare] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - createRequire Bare] Registered / (UV Frontend & Assets) static handler OK.');


// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - createRequire Bare] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare] Registered /uv/ static handler OK.');
console.log('[INIT - createRequire Bare] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare] Registered /epoxy/ static handler OK.');
console.log('[INIT - createRequire Bare] Registering /baremux/ static handler (for API client)...');
if (!baremuxPath) { console.error("FATAL: baremuxPath not loaded!"); process.exit(1); } // Check path
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - createRequire Bare] Registered /baremux/ static handler OK.');


// 3. Bare Server Route - Handles the requests from the Service Worker
console.log('[INIT - createRequire Bare] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => {
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try {
        await bare.routeRequest(request.raw, reply.raw);
    } catch (err) { /* ... error handling ... */ }
});
console.log('[INIT - createRequire Bare] Registered Bare request handler OK.');


// --- Server Start & Shutdown Logic ---
// ... (Keep the same) ...
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - createRequire Bare] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... shutdown and unhandledRejection logic ...