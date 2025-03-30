// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path";
import { fileURLToPath } from 'node:url';
import { hostname } from "node:os";
import fs from 'node:fs';
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
import { publicPath as uvPublicPath } from "ultraviolet-static";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localStaticPath = join(__dirname, "..", "static");
console.log(`[DEBUG] User static path: ${localStaticPath}`);

// --- Fastify Setup ---
console.log('[INIT - Fix Welcome Route] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { /* ... Keep working Wisp serverFactory ... */ }
});
console.log('[INIT - Fix Welcome Route] Fastify instance created.');

// --- Route Definitions ---

// 1. Redirect ROOT '/' requests to '/welcome' (Keep this)
console.log('[INIT - Fix Welcome Route] Registering / redirect...');
fastify.get('/', (request, reply) => {
    console.log('[ROUTE] Redirecting / to /welcome');
    reply.code(302).redirect('/welcome');
});
console.log('[INIT - Fix Welcome Route] Registered / redirect OK.');

// 2. Explicitly serve YOUR index.html for GET /welcome requests
console.log('[INIT - Fix Welcome Route] Registering GET /welcome handler...');
fastify.get('/welcome', (request, reply) => {
    console.log('[ROUTE] Serving static/index.html for GET /welcome');
    // Use reply.sendFile, requires decorateReply:true on a static plugin instance
    // We'll use the /welcome static plugin instance below for this.
    // For now, just send the file path. Let the static handler manage sending.
     // This explicit route might not even be needed if the static index works correctly,
     // but let's add it for clarity and remove if redundant later.
     // We actually rely on the static handler below with index:true
     // This explicit route is likely NOT the fix. Let's remove it for now and focus on the static handler.
});
// console.log('[INIT - Fix Welcome Route] Registered GET /welcome handler OK.'); // Removed for now

// 3. Serve YOUR educational page assets AND index.html from the /welcome path prefix
console.log('[INIT - Fix Welcome Route] Registering /welcome static handler...');
fastify.register(fastifyStatic, {
    root: localStaticPath,      // Serve from your static folder
    prefix: '/welcome',         // Only match URLs starting with /welcome
    decorateReply: true,        // <<< ENABLE DECORATION
    index: "index.html",        // Serve static/index.html for /welcome/
    // Try explicitly setting serveDotFiles if favicon isn't served otherwise
    // dotfiles: 'allow',
});
console.log('[INIT - Fix Welcome Route] Registered /welcome static handler OK.');


// 4. Serve standard UV Frontend & Assets from /proxy/ (Keep this)
console.log('[INIT - Fix Welcome Route] Registering /proxy/ static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,
    prefix: '/proxy/',
    decorateReply: false, // Decoration done above
    index: "index.html",
});
console.log('[INIT - Fix Welcome Route] Registered /proxy/ static handler OK.');

// 5. Serve Core UV/Bare/Epoxy engine assets from their ROOT paths (Keep this)
console.log('[INIT - Fix Welcome Route] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
console.log('[INIT - Fix Welcome Route] Registered /uv/ static handler OK.');
// ... register /epoxy/ and /baremux/ ...
console.log('[INIT - Fix Welcome Route] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
console.log('[INIT - Fix Welcome Route] Registered /epoxy/ static handler OK.');
console.log('[INIT - Fix Welcome Route] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
console.log('[INIT - Fix Welcome Route] Registered /baremux/ static handler OK.');

// --- Server Start & Shutdown Logic ---
// ... (Keep the same) ...
const port = parseInt(process.env.PORT || "8080");
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... (Keep shutdown logic) ...