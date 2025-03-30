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
console.log(`[DEBUG] UV public path: ${uvPublicPath}`);

// --- Fastify Setup ---
console.log('[INIT - Combined Static] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { /* ... Keep working Wisp serverFactory ... */ }
});
console.log('[INIT - Combined Static] Fastify instance created.');

// --- Route Definitions ---

// 1. Redirect ROOT '/' requests to '/welcome'
console.log('[INIT - Combined Static] Registering / redirect...');
fastify.get('/', (request, reply) => {
    console.log('[ROUTE] Redirecting / to /welcome');
    reply.code(302).redirect('/welcome');
});
console.log('[INIT - Combined Static] Registered / redirect OK.');

// 2. Explicitly serve YOUR index.html for GET /welcome requests
console.log('[INIT - Combined Static] Registering GET /welcome handler...');
fastify.get('/welcome', (request, reply) => {
    console.log('[ROUTE] Serving static/index.html for GET /welcome');
    // Needs decorateReply:true on the static plugin below
    const indexPath = join(localStaticPath, 'index.html');
     if (fs.existsSync(indexPath)) {
        // Relying on decoration from the combined handler below
        return reply.sendFile('index.html', localStaticPath);
     } else {
        console.error(`[ERROR] Cannot find educational index.html at ${indexPath}`);
        reply.code(404).send('Educational page not found.');
     }
});
console.log('[INIT - Combined Static] Registered GET /welcome handler OK.');

// 3. Serve ALL OTHER static assets (yours AND UV's) from the root '/'
//    using multiple roots. The first root found with the file wins.
console.log('[INIT - Combined Static] Registering combined / static handler...');
fastify.register(fastifyStatic, {
    // Provide roots in order of priority
    root: [localStaticPath, uvPublicPath], // Check your 'static' first, then UV's public
    prefix: '/',
    decorateReply: true, // Decorate ONCE here
    // No index: "index.html" - handle / and /welcome explicitly above
    // Wildcard must be true (or default) to serve subdirectories like /css /js /img /lib
    wildcard: true,
    // Optional: Could add allowedPath here if needed, but multiple roots make it complex
});
console.log('[INIT - Combined Static] Registered combined / static handler OK.');

// 4. Serve Core UV/Bare/Epoxy engine assets from their specific root paths
//    These need to be separate as they come from different package directories
console.log('[INIT - Combined Static] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
console.log('[INIT - Combined Static] Registered /uv/ static handler OK.');
// ... register /epoxy/ and /baremux/ ...
console.log('[INIT - Combined Static] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
console.log('[INIT - Combined Static] Registered /epoxy/ static handler OK.');
console.log('[INIT - Combined Static] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
console.log('[INIT - Combined Static] Registered /baremux/ static handler OK.');


// --- Server Start & Shutdown Logic ---
// ... (Keep the same) ...
const port = parseInt(process.env.PORT || "8080");
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... (Keep shutdown logic) ...