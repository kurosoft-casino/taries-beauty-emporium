import worker from '../../../api/src/index.js'
import { getCloudflareEnv } from '@/lib/server/cloudflare'

interface RouteContext {
  params: Promise<{ path?: string[] }>
}

async function handle(request: Request, context: RouteContext): Promise<Response> {
  const { path = [] } = await context.params
  const url = new URL(request.url)
  const pathname = path.length > 0 ? `/api/${path.join('/')}` : '/api'
  url.pathname = pathname

  return worker.fetch(new Request(url.toString(), request), ((await getCloudflareEnv()) ?? {}) as CloudflareEnv)
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}

export async function PUT(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}

export async function OPTIONS(request: Request, context: RouteContext): Promise<Response> {
  return handle(request, context)
}
