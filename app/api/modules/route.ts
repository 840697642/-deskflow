import { NextRequest } from 'next/server'
import { jsonSuccess } from '@/lib/api/response'
import { getMockStore } from '@/lib/mock-store'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const modules = getMockStore().modules
  return jsonSuccess(request, modules, { total: modules.length })
}
