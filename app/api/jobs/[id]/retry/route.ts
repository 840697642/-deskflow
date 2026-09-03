import { NextRequest } from 'next/server'
import { handleJobAction } from '@/lib/api/job-actions'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return handleJobAction(request, id, 'retry')
}
