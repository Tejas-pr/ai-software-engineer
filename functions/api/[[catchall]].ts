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

export async function onRequest(
  context: EventContext<Env, "catchall", unknown>
): Promise<Response> {
  const backendBase =
    context.env.BACKEND_URL ||
    "https://define-subscribers-attention-leon.trycloudflare.com"

  const incomingUrl = new URL(context.request.url)
  const targetUrl = new URL(incomingUrl.pathname + incomingUrl.search, backendBase)

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
