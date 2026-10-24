// Cloudflare Pages Function: Proxy /health to Oracle VM
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
  context: EventContext<Env, string, unknown>
): Promise<Response> {
  const backendBase =
    context.env.BACKEND_URL ||
    context.env.VITE_BACKEND_URL ||
    "http://161.118.186.25:8000"
  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL("/health" + incomingUrl.search, backendBase)

  try {
    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: context.request.method,
      headers: context.request.headers,
    })

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: upstreamResponse.headers,
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

