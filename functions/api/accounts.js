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

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json, text/plain, */*",
      "User-Agent": "Mozilla/5.0 (compatible; Cloudflare Pages Function proxy)",
    },
    cf: {
      cacheTtl: 300,
      cacheEverything: false,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rawText = await response.text();
  return JSON.parse(rawText);
}

export async function onRequestGet() {
  try {
    const data = await fetchJson(UPSTREAM_URL);

    return Response.json(
      data,
      {
        headers: corsHeaders({
          "Content-Type": "application/json; charset=UTF-8",
        }),
      }
    );
  } catch (error) {
    return Response.json(
      {
        error: "Proxy request failed",
        detail: error instanceof Error ? error.message : String(error),
      },
      {
        status: 502,
        headers: corsHeaders(),
      }
    );
  }
}

export function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}
