function toBase64Url(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const fixed = padded + "=".repeat((4 - (padded.length % 4 || 4)) % 4);
  const binary = atob(fixed);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function gzipBytes(inputBytes) {
  const stream = new Blob([inputBytes]).stream().pipeThrough(new CompressionStream("gzip"));
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function gunzipBytes(compressedBytes) {
  const stream = new Blob([compressedBytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  const arrayBuffer = await new Response(stream).arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

export async function encodeScenario(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream !== "undefined") {
    const compressed = await gzipBytes(bytes);
    return `gz:${toBase64Url(compressed)}`;
  }
  return `b64:${toBase64Url(bytes)}`;
}

export async function decodeScenario(payload) {
  if (!payload || typeof payload !== "string") {
    return "";
  }
  if (payload.startsWith("gz:")) {
    const compressed = fromBase64Url(payload.slice(3));
    const bytes = await gunzipBytes(compressed);
    return new TextDecoder().decode(bytes);
  }
  if (payload.startsWith("b64:")) {
    const bytes = fromBase64Url(payload.slice(4));
    return new TextDecoder().decode(bytes);
  }
  return "";
}
