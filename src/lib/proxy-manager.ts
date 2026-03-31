import { prisma } from "@/lib/prisma";
import { generateProxyList, buildWahaProxy } from "@/lib/iproyal";

const DEFAULT_BATCH_SIZE = 5;
const DEFAULT_COUNTRY = "gf";

/**
 * Find a proxy with available capacity (< maxSessions used).
 * If none available, generate a new batch via IPRoyal.
 * Returns the assigned proxy record.
 */
export async function assignProxyToSession(sessionName: string) {
  // 1. Find an active proxy with capacity
  const proxy = await prisma.proxy.findFirst({
    where: {
      active: true,
      sessions: { none: {} }, // Start with empty proxies first
    },
  });

  if (proxy) {
    return {
      proxy,
      wahaProxy: buildWahaProxy(proxy, sessionName),
    };
  }

  // 2. Try proxies with only 1 session (max 2 per proxy)
  const proxyWithCapacity = await prisma.proxy.findFirst({
    where: {
      active: true,
    },
    include: {
      _count: { select: { sessions: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (proxyWithCapacity && proxyWithCapacity._count.sessions < proxyWithCapacity.maxSessions) {
    return {
      proxy: proxyWithCapacity,
      wahaProxy: buildWahaProxy(proxyWithCapacity, sessionName),
    };
  }

  // 3. No available proxy — generate new batch via IPRoyal
  const newProxies = await generateNewBatch();
  if (newProxies.length === 0) {
    throw new Error("Failed to generate new proxies from IPRoyal");
  }

  const firstProxy = newProxies[0];
  return {
    proxy: firstProxy,
    wahaProxy: buildWahaProxy(firstProxy, sessionName),
  };
}

/**
 * Generate a batch of proxies from IPRoyal and save them to DB.
 */
export async function generateNewBatch(
  count: number = DEFAULT_BATCH_SIZE,
  country: string = DEFAULT_COUNTRY
) {
  try {
    const proxyList = await generateProxyList({
      count,
      country,
      rotation: "sticky",
    });

    const created = await prisma.$transaction(
      proxyList.map((p) =>
        prisma.proxy.create({
          data: {
            server: p.server,
            username: p.username,
            password: p.password,
            country: country.toUpperCase(),
            maxSessions: 2,
            active: true,
          },
        })
      )
    );

    console.log(`Generated ${created.length} new proxies from IPRoyal`);
    return created;
  } catch (error) {
    console.error("Failed to generate proxy batch:", error);
    throw error;
  }
}

/**
 * Get proxy pool stats.
 */
export async function getProxyStats() {
  const proxies = await prisma.proxy.findMany({
    include: {
      _count: { select: { sessions: true } },
      sessions: {
        select: { sessionName: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const total = proxies.length;
  const active = proxies.filter((p) => p.active).length;
  const full = proxies.filter((p) => p._count.sessions >= p.maxSessions).length;
  const available = proxies.filter(
    (p) => p.active && p._count.sessions < p.maxSessions
  ).length;

  return { proxies, total, active, full, available };
}
