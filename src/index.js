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

// *** Import BareMux using the CJS compatibility hint ***
import bareServerDefault from "@mercuryworkshop/bare-mux/node"; // Import the default export
// Attempt to destructure *from* the default export object
const { baremuxPath, BareMux } = bareServerDefault;
// *** End BareMux Import ***

import httpProxy from "http-proxy";

// --- Add Immediate Check ---
console.log(`[DEBUG] Type of imported BareMux: ${typeof BareMux}`);
console.log(`[DEBUG] Value of imported baremuxPath: ${baremuxPath}`);
if (typeof BareMux !== 'function') {
    console.error("FATAL: Destructured BareMux is NOT a function/constructor!");
    // Let's see what the default export *actually* is
    console.log(`[DEBUG] Type of bareServerDefault: ${typeof bareServerDefault}`);
    console.log(`[DEBUG] Keys of bareServerDefault: ${Object.keys(bareServerDefault)}`);
    // If the default export itself is the constructor:
    // const BareMux = bareServerDefault; // Try this if the above fails? Needs careful testing.
    process.exit(1); // Exit if we definitely don't have a constructor
}
// --- End Immediate Check ---


// --- Constants ---
console.log('[INIT - Re-Add Bare] Initializing BareMux...');
const bare = new BareMux("/baremux/"); // Use the destructured BareMux
console.log('[INIT - Re-Add Bare] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - Re-Add Bare] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - Re-Add Bare] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // Use the working serverFactory
        console.log('[INIT - Re-Add Bare] Server factory called.');
        const server = createServer((req, res) => { /* headers */ });
        server.on('upgrade', (req, socket, head) => { /* bare.shouldRoute / wisp */ });
        proxy.on('error', (err, req, res) => { /* error handling */ });
        return server;
    }
});
console.log('[INIT - Re-Add Bare] Fastify instance created.');

// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Re-Add Bare] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - Re-Add Bare] Registered / (UV Frontend & Assets) static handler OK.');

// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Re-Add Bare] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Re-Add Bare] Registered /uv/ static handler OK.');
console.log('[INIT - Re-Add Bare] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Re-Add Bare] Registered /epoxy/ static handler OK.');
console.log('[INIT - Re-Add Bare] Registering /baremux/ static handler (for API client)...');
if (!baremuxPath) { console.error("FATAL: baremuxPath not loaded!"); process.exit(1); } // Check path
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Re-Add Bare] Registered /baremux/ static handler OK.');

// 3. Bare Server Route - Handles the requests from the Service Worker (/service/*)
console.log('[INIT - Re-Add Bare] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => {
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try { await bare.routeRequest(request.raw, reply.raw); } catch (err) { /* error handling */ }
});
console.log('[INIT - Re-Add Bare] Registered Bare request handler OK.');

// --- Server Start & Shutdown Logic ---
// ... (Keep the same listen and shutdown logic) ...
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Re-Add Bare] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... shutdown and unhandledRejection logic ...