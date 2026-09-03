import { NextRequest } from 'next/server'
import { handleModuleReconnect } from '@/lib/api/module-actions'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return handleModuleReconnect(request, id)
}
