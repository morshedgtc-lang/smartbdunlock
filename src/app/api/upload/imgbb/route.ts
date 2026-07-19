import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'

const IMGBB_API_KEY = process.env.IMGBB_API_KEY
const IMGBB_URL = 'https://api.imgbb.com/1/upload'

export async function POST(request: Request) {
  try {
    await requireAuth()

    if (!IMGBB_API_KEY) {
      return NextResponse.json({ error: 'ImgBB API key not configured' }, { status: 500 })
    }

    const body = await request.json()
    const { image } = body as { image?: string }

    if (!image) {
      return NextResponse.json({ error: 'No image data provided' }, { status: 400 })
    }

    const base64Data = image.includes(',') ? image.split(',')[1] : image

    const formData = new URLSearchParams()
    formData.append('key', IMGBB_API_KEY)
    formData.append('image', base64Data)

    const res = await fetch(IMGBB_URL, {
      method: 'POST',
      body: formData,
    })

    const result = await res.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error?.message || 'Upload failed' }, { status: 500 })
    }

    return NextResponse.json({
      url: result.data.url,
      display_url: result.data.display_url,
      delete_url: result.data.delete_url,
    })
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('ImgBB upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
