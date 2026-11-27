export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/v1')) {
      const backendOrigin = (
        env.FABLE_BACKEND_ORIGIN || 'https://fable-api-eosin.vercel.app'
      ).replace(/\/+$/, '');
      const targetUrl = backendOrigin + url.pathname + url.search;
      const headers = new Headers(request.headers);
      headers.delete('host');
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers,
        body:
          request.method !== 'GET' && request.method !== 'HEAD'
            ? request.body
            : undefined,
      });
      const respHeaders = new Headers(upstream.headers);
      respHeaders.set('Access-Control-Allow-Origin', url.origin);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: respHeaders,
      });
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
