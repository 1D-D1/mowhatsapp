// IPRoyal API Client — Mo'WhatsApp
// Proxy generation and management

const IPROYAL_BASE = "https://resi-api.iproyal.com/v1";

const ipRoyalFetch = async <T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(`${IPROYAL_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.API_IPROYAL}`,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`IPRoyal ${res.status}: ${body}`);
  }
  return res.json();
};

// ---- Types ----

export interface EntryNode {
  dns: string;
  port: number;
}

export interface ParsedProxy {
  server: string;
  username: string;
  password: string;
}

export interface GenerateProxyListParams {
  count: number;
  country?: string;
  rotation?: "sticky" | "rotating";
  sessionPrefix?: string;
}

// ---- Endpoints ----

export async function getEntryNodes() {
  return ipRoyalFetch<EntryNode[]>("/access/entry-nodes");
}

export async function generateProxyList(
  params: GenerateProxyListParams
): Promise<ParsedProxy[]> {
  const country = params.country ?? "gf";
  const rotation = params.rotation ?? "sticky";

  const data = await ipRoyalFetch<string>("/access/generate-proxy-list", {
    method: "POST",
    body: JSON.stringify({
      format: "{hostname}:{port}:{username}:{password}",
      hostname: "geo.iproyal.com",
      port: "12321",
      rotation,
      location: `_country-${country}`,
      proxy_count: params.count,
    }),
  });

  // IPRoyal returns newline-separated proxy strings
  const lines = typeof data === "string" ? data.trim().split("\n") : [];

  return lines.map((line) => {
    const parts = line.trim().split(":");
    // Format: hostname:port:username:password
    // Username and password may contain colons in IPRoyal format
    const server = `${parts[0]}:${parts[1]}`;
    const username = parts[2];
    const password = parts.slice(3).join(":");

    return { server, username, password };
  });
}

/**
 * Build a WAHA-compatible proxy config with sticky session.
 * Appends _session-{sessionName} to the username for IP stickiness.
 */
export function buildWahaProxy(
  proxy: ParsedProxy,
  sessionName: string
): { server: string; username: string; password: string } {
  return {
    server: proxy.server,
    username: `${proxy.username}_session-${sessionName}`,
    password: proxy.password,
  };
}
