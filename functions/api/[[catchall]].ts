// Cloudflare Pages Function: First-Party Edge Proxy for API routes
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
  context: EventContext<Env, "catchall", unknown>
): Promise<Response> {
  const backendBase = resolveBackend(context.env.BACKEND_URL)
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    backendBase
  )

  const requestHeaders = new Headers(context.request.headers)
  requestHeaders.set("Host", targetUrl.host)

  const requestInit: RequestInit = {
    method: context.request.method,
    headers: requestHeaders,
    body: ["GET", "HEAD"].includes(context.request.method.toUpperCase())
      ? undefined
      : context.request.body,
    redirect: "manual",
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), requestInit)
    const responseHeaders = new Headers()

    for (const [key, value] of upstreamResponse.headers.entries()) {
      if (key.toLowerCase() !== "set-cookie") {
        responseHeaders.set(key, value)
      }
    }

    // Rewrite Set-Cookie headers so cookies become first-party on pages.dev
    const getCookies = (upstreamResponse.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie
    const setCookies = typeof getCookies === "function"
      ? getCookies.call(upstreamResponse.headers)
      : (upstreamResponse.headers.get("Set-Cookie") ? [upstreamResponse.headers.get("Set-Cookie")!] : [])

    for (const rawCookie of setCookies) {
      // Strip foreign Domain attribute so cookie binds to pages.dev as host-only first party
      const cleanCookie = rawCookie.replace(/Domain=[^;]+;?\s*/gi, "")
      responseHeaders.append("Set-Cookie", cleanCookie)
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "Backend proxy unavailable",
        detail: err instanceof Error ? err.message : String(err),
      }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" },
      }
    )
  }
}
