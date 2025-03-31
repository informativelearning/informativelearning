// --- Imports ---
import { createServer } from "node:http";
import { join, dirname } from "node:path"; // <<< Need path utils
import { fileURLToPath } from 'node:url'; // <<< Need path utils
import { hostname } from "node:os";
import fs from 'node:fs'; // <<< Need fs for checking file
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import wisp from "wisp-server-node";
// UV Core Imports
import { publicPath as uvPublicPath } from "ultraviolet-static"; // Renamed for clarity
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url); // <<< Need
const __dirname = dirname(__filename);             // <<< Need
// Path to YOUR static folder containing homepage.html + assets
const localStaticPath = join(__dirname, "..", "static"); // <<< Need
console.log(`[DEBUG] User static path: ${localStaticPath}`);

// --- Fastify Setup ---
console.log('[INIT - Add Homepage Route v2] Creating Fastify instance...');
const fastify = Fastify({
	logger: true, // Good practice
	serverFactory: (handler) => { // Keep the factory that worked for you
        console.log('[INIT - Add Homepage Route v2] Server factory called.');
		return createServer()
			.on("request", (req, res) => { /* headers */
                res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
				res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
				handler(req, res);
            })
			.on("upgrade", (req, socket, head) => { /* wisp */
                if (req.url?.endsWith("/wisp/")) { // Optional chaining
                     console.log('[WISP] Routing Wisp request');
                     wisp.routeRequest(req, socket, head);
                 } else {
                     console.log('[WISP] Closing non-Wisp upgrade request');
                     socket.end();
                 }
            });
	},
});
console.log('[INIT - Add Homepage Route v2] Fastify instance created.');


// --- Route Definitions ---

// 1. Serve standard UV Frontend & Assets from the ROOT path '/' (Keep this working!)
console.log('[INIT - Add Homepage Route v2] Registering / (UV Frontend) static handler...');
fastify.register(fastifyStatic, {
	root: uvPublicPath,
	prefix: '/',
	decorateReply: true, // Decorate once here
	index: "index.html",
});
console.log('[INIT - Add Homepage Route v2] Registered / (UV Frontend) static handler OK.');


// 2. Explicitly serve YOUR homepage.html for GET /homepage.html requests
console.log('[INIT - Add Homepage Route v2] Registering GET /homepage.html handler...');
fastify.get('/homepage.html', (request, reply) => {
	console.log('[ROUTE] Serving static/homepage.html for GET /homepage.html');
	const pagePath = join(localStaticPath, 'homepage.html');
	if (fs.existsSync(pagePath)) {
		// Use sendFile (decoration provided by plugin registered above)
		return reply.sendFile('homepage.html', localStaticPath);
	} else {
		console.error(`[ERROR] Cannot find homepage.html at ${pagePath}`);
		reply.code(404).send({ error: 'Homepage not found.' });
	}
});
console.log('[INIT - Add Homepage Route v2] Registered GET /homepage.html handler OK.');


// 3. Serve YOUR static assets (css, js, img, lib) needed by homepage.html
//    Mount this at the root '/' but register it AFTER the UV handler.
//    This allows requests like /css/style.css to be served from static/css/style.css
//    if they weren't already served by the uvPublicPath handler.
console.log('[INIT - Add Homepage Route v2] Registering / (Local Assets) static handler...');
fastify.register(fastifyStatic, {
	root: localStaticPath,      // Serve from your static folder
	prefix: '/',               // Serve AT the root
	decorateReply: false,      // Decorated above
	// DO NOT serve index.html here (handled by UV handler above)
    // Serve files like /css/style.css, /js/main.js, /favicon.ico etc.
});
console.log('[INIT - Add Homepage Route v2] Registered / (Local Assets) static handler OK.');


// 4. Specific route for default UV config - KEEP as it was in working version
console.log('[INIT - Add Homepage Route v2] Registering specific /uv/uv.config.js route...');
fastify.get("/uv/uv.config.js", (req, res) => {
	console.log('[ROUTE] Serving default /uv/uv.config.js');
	return res.sendFile("uv/uv.config.js", uvPublicPath);
});
console.log('[INIT - Add Homepage Route v2] Registered specific /uv/uv.config.js route OK.');


// 5. Serve Core UV/Bare/Epoxy engine assets from their ROOT paths (Unchanged)
console.log('[INIT - Add Homepage Route v2] Registering /uv/ static handler...');
fastify.register(fastifyStatic, { root: uvPath, prefix: "/uv/", decorateReply: false });
console.log('[INIT - Add Homepage Route v2] Registered /uv/ static handler OK.');
// ... register /epoxy/ and /baremux/ ...
console.log('[INIT - Add Homepage Route v2] Registering /epoxy/ static handler...');
fastify.register(fastifyStatic, { root: epoxyPath, prefix: "/epoxy/", decorateReply: false });
console.log('[INIT - Add Homepage Route v2] Registered /epoxy/ static handler OK.');
console.log('[INIT - Add Homepage Route v2] Registering /baremux/ static handler...');
fastify.register(fastifyStatic, { root: baremuxPath, prefix: "/baremux/", decorateReply: false });
console.log('[INIT - Add Homepage Route v2] Registered /baremux/ static handler OK.');

// --- Server Start & Shutdown Logic ---
const port = parseInt(process.env.PORT || "8080");
console.log(`[INIT - Add Homepage Route v2] Attempting to listen on 0.0.0.0:${port}...`);
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) { /* error handling */ }
    console.log(`[INIT - Add Homepage Route v2] Server successfully listening at ${address}`);
});
// ... shutdown logic ...
process.on('unhandledRejection', (reason, promise) => { /* ... */ });