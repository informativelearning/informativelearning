// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path"; // <<< Need for path calc
import { fileURLToPath } from 'node:url'; // <<< Need for path calc
import { hostname } from "node:os";
import fs from 'node:fs'; // <<< Need for file checks
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
import { publicPath as uvPublicPath } from "ultraviolet-static"; // Renamed for clarity below
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const localStaticPath = join(__dirname, "..", "static"); // Path to YOUR static folder
console.log(`[DEBUG] User static path: ${localStaticPath}`);

// --- Fastify Setup ---
console.log('[INIT - Add Welcome to Working Proxy] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // Keep the factory that worked for you
        console.log('[INIT - Add Welcome to Working Proxy] Server factory called.');
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
console.log('[INIT - Add Welcome to Working Proxy] Fastify instance created.');

// --- Route Definitions ---

// 1. Redirect ROOT '/' requests to '/welcome'
console.log('[INIT - Add Welcome to Working Proxy] Registering / redirect...');
fastify.get('/', (request, reply) => {
    console.log('[ROUTE] Redirecting / to /welcome');
    reply.code(302).redirect('/welcome');
});
console.log('[INIT - Add Welcome to Working Proxy] Registered / redirect OK.');

// 2. Serve YOUR educational page AND assets from the /welcome path prefix
console.log('[INIT - Add Welcome to Working Proxy] Registering /welcome static handler...');
fastify.register(fastifyStatic, {
    root: localStaticPath,      // Serve from your static folder
    prefix: '/welcome',         // Only match URLs starting with /welcome
    decorateReply: true,       // Decorate first time
    index: "index.html"         // Serve static/index.html for /welcome/
});
console.log('[INIT - Add Welcome to Working Proxy] Registered /welcome static handler OK.');

// 3. Serve standard UV Frontend & Assets from the ROOT path '/'
//    THIS IS THE ORIGINAL WORKING HANDLER - Keep it at '/' for now
console.log('[INIT - Add Welcome to Working Proxy] Registering / (UV Frontend) static handler...');
fastify.register(fastifyStatic, {
    root: uvPublicPath,
    prefix: '/',                // <<< Keep at root
    decorateReply: false,       // Decorated above
    index: "index.html",
    // Add allowedPath to prevent it overriding /welcome (maybe needed?)
     allowedPath: (pathname, root, opts) => {
        // Only serve files if they DON'T start with /welcome
        return !pathname.startsWith('/welcome');
     }
});
console.log('[INIT - Add Welcome to Working Proxy] Registered / (UV Frontend) static handler OK.');


// 4. Specific route for default UV config - KEEP as it was in working version
console.log('[INIT - Add Welcome to Working Proxy] Registering specific /uv/uv.config.js route...');
fastify.get("/uv/uv.config.js", (req, res) => {
    console.log('[ROUTE] Serving default /uv/uv.config.js');
	return res.sendFile("uv/uv.config.js", uvPublicPath); // Use uvPublicPath here
});
console.log('[INIT - Add Welcome to Working Proxy] Registered specific /uv/uv.config.js route OK.');


// 5. Serve Core UV/Bare/Epoxy engine assets from their ROOT paths (NO CHANGE)
console.log('[INIT - Add Welcome to Working Proxy] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false }); // Allow wildcard? Maybe not needed.
console.log('[INIT - Add Welcome to Working Proxy] Registered /uv/ static handler OK.');

console.log('[INIT - Add Welcome to Working Proxy] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
console.log('[INIT - Add Welcome to Working Proxy] Registered /epoxy/ static handler OK.');

console.log('[INIT - Add Welcome Proxy] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
console.log('[INIT - Add Welcome Proxy] Registered /baremux/ static handler OK.');


// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Add Welcome to Working Proxy] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) { /* ... error handling ... */ }
    console.log(`[INIT - Add Welcome to Working Proxy] Server successfully listening at ${address}`);
});
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
function shutdown() { /* ... shutdown logic ... */ }
process.on('unhandledRejection', (reason, promise) => { /* ... */ });