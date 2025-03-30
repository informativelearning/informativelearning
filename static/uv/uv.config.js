// This file overwrites the stock UV config.js

self.__uv$config = {
    // prefix: "/uv/service/",  // Comment out or delete this old line
    prefix: "/baremux/",      // <<< THIS IS THE CORRECTED LINE
    bare: "/baremux/",        // <<< ADD THIS LINE (or make sure it's there)
    encodeUrl: Ultraviolet.codec.xor.encode,
    decodeUrl: Ultraviolet.codec.xor.decode,
    handler: "/uv/uv.handler.js",
    client: "/uv/uv.client.js",
    bundle: "/uv/uv.bundle.js",
    config: "/uv/uv.config.js",
    sw: "/uv/uv.sw.js",
  };