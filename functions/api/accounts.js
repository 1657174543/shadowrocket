const PRIMARY_API_URL = "https://id.idunlock.cfd/shareapi/nyVwHPesct";
const SEEP_PROXY_BASE = "https://seep.eu.org/";
const DSOCKS_PROXY_BASE = "https://proxy.dsocks.uk/?url=";
const APPLC_SOURCE_URL = "https://applc.cc/h/888";
const EXTRA_API_URLS = [
  "https://idshare001.me/node/getid.php?getid=1",
  "https://idshare001.me/node/getid.php?getid=2",
];

function corsHeaders(extra = {}) {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=300",
    ...extra,
  };
}

function buildSeepProxyUrl(url) {
  return `${SEEP_PROXY_BASE}${encodeURIComponent(url)}`;
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

async function fetchApplcAccounts() {
  const response = await fetch(`${DSOCKS_PROXY_BASE}${encodeURIComponent(APPLC_SOURCE_URL)}`, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
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

  const html = await response.text();
  const match = html.match(/window\.accounts\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error("accounts data not found");
  }
  return JSON.parse(match[1]);
}

export async function onRequestGet() {
  try {
    const [primaryResult, ...otherResults] = await Promise.allSettled([
      fetchJson(PRIMARY_API_URL),
      ...EXTRA_API_URLS.map((url) => fetchJson(buildSeepProxyUrl(url))),
      fetchApplcAccounts(),
    ]);

    const accounts = [];

    if (primaryResult.status === "fulfilled" && Array.isArray(primaryResult.value?.accounts)) {
      accounts.push(
        ...primaryResult.value.accounts.slice(0, 3).map((item) => ({
          email: item.username || "",
          password: item.password || "",
          time: item.last_check || "",
          remark: item.region_display || "无备注",
          status: item.status ? "正常" : "异常",
        }))
      );
    }

    otherResults.slice(0, EXTRA_API_URLS.length).forEach((result) => {
      if (result.status === "fulfilled" && Array.isArray(result.value) && result.value[0]) {
        const item = result.value[0];
        accounts.push({
          email: item.username || "",
          password: item.password || "",
          time: item.time || "",
          remark: item.country || "无备注",
          status: item.status ? "正常" : "异常",
        });
      }
    });

    const applcResult = otherResults[EXTRA_API_URLS.length];
    if (applcResult?.status === "fulfilled" && Array.isArray(applcResult.value)) {
      accounts.push(
        ...applcResult.value.map((item) => ({
          email: item.username || "",
          password: item.password || "",
          time: item.last_check_time || "",
          remark: item.country_map?.label || "无备注",
          status: item.status_map?.label || "未知",
        }))
      );
    }

    return Response.json(
      { accounts },
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
