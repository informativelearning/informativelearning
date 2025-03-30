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
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
// TODO: Add imports for verification later (sqlite3, basic-auth, path, fs)

// --- Fastify Setup ---
console.log('[INIT - Stable + Verify Prep] Creating Fastify instance...');
const fastify = Fastify({
    logger: true,
    serverFactory: (handler, opts) => { // Keep the working factory
        console.log('[INIT - Stable + Verify Prep] Server factory called.');
        const server = createServer((req, res) => { /* headers */ });
        server.on('upgrade', (req, socket, head) => { /* wisp */ });
        return server;
    }
});
console.log('[INIT - Stable + Verify Prep] Fastify instance created.');

// --- Route Definitions ---

// TODO: Add Verification API Routes (/is-verified, /verify-device, /admin.html etc.) later

// Serve standard UV Frontend & Assets (including verify.js if it's part of uvPublicPath)
console.log('[INIT - Stable + Verify Prep] Registering / (UV Frontend & Assets) static handler...');
fastify.register(fastifyStatic, { root: uvPublicPath, prefix: '/', decorateReply: true, index: "index.html" });
console.log('[INIT - Stable + Verify Prep] Registered / (UV Frontend & Assets) static handler OK.');

// Serve Core UV/Bare/Epoxy engine assets
console.log('[INIT - Stable + Verify Prep] Registering core script handlers...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false, wildcard: false });
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false, wildcard: false });
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false, wildcard: false });
console.log('[INIT - Stable + Verify Prep] Registered core script handlers OK.');

// --- Server Start & Shutdown Logic ---
// ... (Keep the same) ...
const port = parseInt(process.env.PORT || "8080");
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => { /* ... */ });
// ... (Keep shutdown logic) ...