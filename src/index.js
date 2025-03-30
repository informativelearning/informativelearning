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
// *** CHANGE BareMux Import AGAIN ***
// Import the default export directly, assuming IT IS the constructor
import BareMux from "@mercuryworkshop/bare-mux/node";
// We need baremuxPath for the static route, let's try importing it named separately
// If this causes an error, we'll need to find another way to get the path
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
// *** END CHANGE ***
import httpProxy from "http-proxy";

// --- Constants ---
console.log('[INIT - Fix Bare Constructor] Initializing BareMux...');
// Use the default import 'BareMux' directly with 'new'
const bare = new BareMux("/baremux/"); // Use the default import as the constructor
console.log('[INIT - Fix Bare Constructor] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - Fix Bare Constructor] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - Fix Bare Constructor] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // ... Keep serverFactory the same ...
        console.log('[INIT - Fix Bare Constructor] Server factory called.');
        const server = createServer((req, res) => { /* ... headers ... */ });
        server.on('upgrade', (req, socket, head) => { /* ... bare.shouldRoute / wisp routing ... */ });
        proxy.on('error', (err, req, res) => { /* ... error handling ... */ });
        return server;
    }
});
console.log('[INIT - Fix Bare Constructor] Fastify instance created.');

// --- Route Definitions ---
// ... (Keep ALL route definitions the same - UV assets at /, core assets at /uv/, /epoxy/, /baremux/, and the /service/* handler) ...

// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Fix Bare Constructor] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - Fix Bare Constructor] Registered / (UV Frontend & Assets) static handler OK.');

// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Fix Bare Constructor] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Constructor] Registered /uv/ static handler OK.');
console.log('[INIT - Fix Bare Constructor] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Constructor] Registered /epoxy/ static handler OK.');
console.log('[INIT - Fix Bare Constructor] Registering /baremux/ static handler (for API client)...');
// Use the separately imported baremuxPath here
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Fix Bare Constructor] Registered /baremux/ static handler OK.');


// 3. Bare Server Route - Handles the requests from the Service Worker
console.log('[INIT - Fix Bare Constructor] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => { /* ... keep bare.routeRequest logic ... */
    console.log(`[BARE HTTP] Routing Bare request: ${request.url}`);
    try {
        await bare.routeRequest(request.raw, reply.raw);
    } catch (err) { /* ... error handling ... */ }
});
console.log('[INIT - Fix Bare Constructor] Registered Bare request handler OK.');


// --- Server Start & Shutdown Logic ---
// ... (Keep the same listen and shutdown logic) ...
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Fix Bare Constructor] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function shutdown() { /* ... */ }
process.on('unhandledRejection', (reason, promise) => { /* ... */ });