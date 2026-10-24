// Cloudflare Pages Function: First-Party Edge Proxy for /health
interface Env {
  BACKEND_URL?: string
}

interface EventContext<Env, P extends string, Data> {
  request: Request
  functionPath: string
  waitUntil: (promise: Promise<unknown>) => void
  next: (input?: Request | string, init?: RequestInit) => Promise<Response>
  env: Env
  params: Record<P, string | string[]>
  data: Data
}

function resolveBackend(envUrl?: string): string {
  const fallback = "https://define-subscribers-attention-leon.trycloudflare.com"
  if (!envUrl) return fallback
  const trimmed = envUrl.trim().replace(/\/+$/, "")
  try {
    const parsed = new URL(trimmed)
    // Cloudflare Workers forbid raw IP destinations (Error 1003)
    if (/^\d+\.\d+\.\d+\.\d+$/.test(parsed.hostname)) {
      return fallback
    }
    return trimmed
  } catch {
    return fallback
  }
}

export async function onRequest(
  context: EventContext<Env, string, unknown>
): Promise<Response> {
  const backendBase = resolveBackend(context.env.BACKEND_URL)
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL("/health" + incomingUrl.search, backendBase)

  const requestHeaders = new Headers(context.request.headers)
  requestHeaders.set("Host", targetUrl.host)

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: context.request.method,
      headers: requestHeaders,
    })
    const responseHeaders = new Headers(upstreamResponse.headers)

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        status: "unhealthy",
        error: "Backend unreachable",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}

