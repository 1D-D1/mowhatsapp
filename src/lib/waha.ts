// WAHA API Client — Mo'WhatsApp
// All WhatsApp operations via WAHA GOWS engine

const wahaFetch = async <T = unknown>(
  path: string,
  options?: RequestInit
): Promise<T> => {
  const res = await fetch(`${process.env.WAHA_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": process.env.WAHA_API_KEY!,
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WAHA ${res.status}: ${body}`);
  }
  return res.json();
};

// ---- Types ----

export interface WahaSessionConfig {
  metadata?: Record<string, string>;
  proxy?: {
    server: string;
    username: string;
    password: string;
  };
  webhooks?: Array<{
    url: string;
    events: string[];
  }>;
}

export interface WahaSessionInfo {
  name: string;
  status: string;
  config: WahaSessionConfig;
  me?: {
    id: string;
    pushName?: string;
  };
}

export interface CreateSessionParams {
  name: string;
  brands: string[];
  phone?: string;
  proxy?: {
    server: string;
    username: string;
    password: string;
  };
  webhookUrl: string;
}

// ---- Sessions ----

export async function createSession(params: CreateSessionParams) {
  return wahaFetch<WahaSessionInfo>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      name: params.name,
      start: true,
      config: {
        metadata: {
          brands: params.brands.join(","),
          phone: params.phone ?? "",
          managedBy: "mowhatsapp",
        },
        proxy: params.proxy,
        webhooks: [
          {
            url: params.webhookUrl,
            events: ["session.status"],
          },
        ],
      },
    }),
  });
}

export async function listSessions() {
  return wahaFetch<WahaSessionInfo[]>("/api/sessions?all=true");
}

export async function getSession(sessionName: string) {
  return wahaFetch<WahaSessionInfo>(`/api/sessions/${sessionName}`);
}

export async function updateSession(
  sessionName: string,
  config: Partial<WahaSessionConfig>
) {
  return wahaFetch(`/api/sessions/${sessionName}`, {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
}

export async function deleteSession(sessionName: string) {
  return wahaFetch(`/api/sessions/${sessionName}`, {
    method: "DELETE",
  });
}

export async function stopSession(sessionName: string) {
  return wahaFetch(`/api/sessions/${sessionName}/stop`, {
    method: "POST",
  });
}

export async function startSession(sessionName: string) {
  return wahaFetch(`/api/sessions/${sessionName}/start`, {
    method: "POST",
  });
}

// ---- QR Code ----

export async function getQrCode(sessionName: string): Promise<Buffer> {
  const res = await fetch(
    `${process.env.WAHA_API_URL}/api/${sessionName}/auth/qr`,
    {
      headers: {
        "X-Api-Key": process.env.WAHA_API_KEY!,
        Accept: "image/png",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`WAHA QR ${res.status}: ${await res.text()}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function getQrCodeRaw(sessionName: string): Promise<string> {
  const res = await fetch(
    `${process.env.WAHA_API_URL}/api/${sessionName}/auth/qr?format=raw`,
    {
      headers: {
        "X-Api-Key": process.env.WAHA_API_KEY!,
      },
    }
  );
  if (!res.ok) {
    throw new Error(`WAHA QR ${res.status}: ${await res.text()}`);
  }
  const data = await res.json();
  return data.value;
}

// ---- Status/Stories Publishing ----

export async function publishStatusText(
  sessionName: string,
  text: string,
  options?: { backgroundColor?: string; font?: number }
) {
  return wahaFetch(`/api/${sessionName}/status/text`, {
    method: "POST",
    body: JSON.stringify({
      text,
      backgroundColor: options?.backgroundColor ?? "#1a1a2e",
      font: options?.font ?? 2,
    }),
  });
}

export async function publishStatusImage(
  sessionName: string,
  file: { url: string; mimetype: string } | { data: string; mimetype: string },
  caption?: string
) {
  return wahaFetch(`/api/${sessionName}/status/image`, {
    method: "POST",
    body: JSON.stringify({
      file,
      caption,
    }),
  });
}

export async function publishStatusVideo(
  sessionName: string,
  file: { url: string; mimetype: string } | { data: string; mimetype: string },
  caption?: string
) {
  return wahaFetch(`/api/${sessionName}/status/video`, {
    method: "POST",
    body: JSON.stringify({
      file,
      convert: true,
      caption,
    }),
  });
}

export async function deleteStatus(sessionName: string, statusId: string) {
  return wahaFetch(`/api/${sessionName}/status/delete`, {
    method: "POST",
    body: JSON.stringify({ id: statusId }),
  });
}
