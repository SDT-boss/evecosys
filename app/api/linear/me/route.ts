import { NextResponse } from 'next/server'
import { LinearClient } from '@linear/sdk'

export async function GET() {
  const key = process.env.LINEAR_API_KEY
  if (!key) return NextResponse.json({ error: 'Missing LINEAR_API_KEY' }, { status: 400 })

  try {
    const client = new LinearClient({ apiKey: key })
    const viewer = await client.viewer()
    return NextResponse.json({ viewer })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
