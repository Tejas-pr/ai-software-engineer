// Cloudflare Pages Function: Proxy /api/* to the backend on Oracle VM
// This eliminates mixed-content HTTPS -> HTTP browser blocks and proxies auth cookies cleanly.

interface Env {
  BACKEND_URL?: string
  VITE_BACKEND_URL?: string
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

export async function onRequest(
  context: EventContext<Env, "catchall", unknown>
): Promise<Response> {
  const backendBase =
    context.env.BACKEND_URL ||
    context.env.VITE_BACKEND_URL ||
    "http://161.118.186.25:8000"
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(
    incomingUrl.pathname + incomingUrl.search,
    backendBase
  )

  const requestInit: RequestInit = {
    method: context.request.method,
    headers: context.request.headers,
    body: ["GET", "HEAD"].includes(context.request.method.toUpperCase())
      ? undefined
      : context.request.body,
    redirect: "manual",
  }

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), requestInit)
    const responseHeaders = new Headers(upstreamResponse.headers)

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
