import { handleTariesApi } from '@/lib/server/tariesApi'

async function handle(request: Request): Promise<Response> {
  return handleTariesApi(request)
}

export async function GET(request: Request) {
  return handle(request)
}

export async function POST(request: Request) {
  return handle(request)
}

export async function PUT(request: Request) {
  return handle(request)
}

export async function PATCH(request: Request) {
  return handle(request)
}

export async function DELETE(request: Request) {
  return handle(request)
}

export async function OPTIONS(request: Request) {
  return handle(request)
}
