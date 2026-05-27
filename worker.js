const UPSTREAM_URL = "https://shadowrocket-46x.pages.dev/api/accounts-v2";

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300",
    ...extra,
  };
}

function jsonResponse(data, init = {}) {
  return Response.json(data, {
    ...init,
    headers: corsHeaders(init.headers || {}),
  });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (compatible; Cloudflare Worker proxy)",
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rawText = await response.text();
  return JSON.parse(rawText);
}

async function handleAccountsRequest() {
  const data = await fetchJson(UPSTREAM_URL);
  return jsonResponse(data);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS" && url.pathname === "/api/accounts") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    if (request.method === "GET" && url.pathname === "/api/accounts") {
      try {
        return await handleAccountsRequest();
      } catch (error) {
        return jsonResponse(
          {
            error: "Proxy request failed",
            detail: error instanceof Error ? error.message : String(error),
          },
          { status: 502 }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};
