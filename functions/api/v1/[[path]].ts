/**
 * Cloudflare Pages Function (`functions/api/v1/[[path]].ts`):
 * Proxies same-origin `/api/v1/*` requests from the PWA to the shared Fable FastAPI backend
 * (`https://fable-api-cbo8.onrender.com/api/v1/*`).
 *
 * Benefits:
 * 1. Eliminates browser CORS failures even when `FABLE_CORS_ORIGINS` is unset on Render.
 * 2. Eliminates CORS preflight OPTIONS latency on mobile networks.
 */
export async function onRequest(context: {
  request: Request;
  env?: { FABLE_BACKEND_ORIGIN?: string };
}): Promise<Response> {
  const backendOrigin =
    context.env?.FABLE_BACKEND_ORIGIN?.replace(/\/+$/, '') ||
    'https://fable-api-cbo8.onrender.com';

  const incomingUrl = new URL(context.request.url);
  const targetUrl = `${backendOrigin}${incomingUrl.pathname}${incomingUrl.search}`;

  const headers = new Headers(context.request.headers);
  headers.delete('host');

  const upstreamResponse = await fetch(targetUrl, {
    method: context.request.method,
    headers,
    body:
      context.request.method !== 'GET' && context.request.method !== 'HEAD'
        ? context.request.body
        : undefined,
  });

  const responseHeaders = new Headers(upstreamResponse.headers);
  responseHeaders.set('Access-Control-Allow-Origin', incomingUrl.origin);

  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    statusText: upstreamResponse.statusText,
    headers: responseHeaders,
  });
}
