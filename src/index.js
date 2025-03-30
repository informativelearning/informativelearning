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
// *** NEW BareMux Import Attempt ***
import bareServerDefault, { baremuxPath } from "@mercuryworkshop/bare-mux/node";
// Attempt to access BareMux as a property of the default export
const BareMux = bareServerDefault.BareMux;
if (!BareMux) {
  // Fallback if it's not a property (unlikely based on CJS structure)
  console.warn("BareMux not found as property, trying default export itself as constructor");
  // BareMux = bareServerDefault; // This caused 'not a constructor' before
  // If both fail, the import mechanism for this package in ESM is unclear / broken
  throw new Error("Could not resolve BareMux constructor from @mercuryworkshop/bare-mux/node");
}
// *** END CHANGE ***
import httpProxy from "http-proxy";

// --- Constants ---
console.log('[INIT - Bare Import Attempt 4] Initializing BareMux...');
const bare = new BareMux("/baremux/"); // Use the potentially correct constructor
console.log('[INIT - Bare Import Attempt 4] Initializing http-proxy...');
const proxy = httpProxy.createProxy();
console.log('[INIT - Bare Import Attempt 4] Initialization complete.');


// --- Fastify Setup ---
console.log('[INIT - Bare Import Attempt 4] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { /* ... Wisp serverFactory ... */ }
});
console.log('[INIT - Bare Import Attempt 4] Fastify instance created.');

// --- Route Definitions ---
// 1. Serve standard UV Frontend & Assets from the ROOT path '/'
console.log('[INIT - Bare Import Attempt 4] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - Bare Import Attempt 4] Registered / (UV Frontend & Assets) static handler OK.');

// 2. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
console.log('[INIT - Bare Import Attempt 4] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
console.log('[INIT - Bare Import Attempt 4] Registered /uv/ static handler OK.');
console.log('[INIT - Bare Import Attempt 4] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
console.log('[INIT - Bare Import Attempt 4] Registered /epoxy/ static handler OK.');
console.log('[INIT - Bare Import Attempt 4] Registering /baremux/ static handler (for API client)...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Bare Import Attempt 4] Registered /baremux/ static handler OK.');

// 3. Bare Server Route - Handles the requests from the Service Worker
console.log('[INIT - Bare Import Attempt 4] Registering Bare request handler for /service/* ...');
fastify.all('/service/*', async (request, reply) => { /* ... bare.routeRequest logic ... */ });
console.log('[INIT - Bare Import Attempt 4] Registered Bare request handler OK.');

// --- Server Start & Shutdown Logic ---
// ... (Keep the same) ...
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Bare Import Attempt 4] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... shutdown and unhandledRejection logic ...