import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'File payload is required' },
        { status: 400 },
      );
    }

    const extension = extractExtension(file.name);
    const pathname = `videos/${Date.now()}-${sanitizeFileName(file.name)}`;
    const blob = await put(pathname, file, {
      access: 'public',
      contentType: file.type || 'video/mp4',
    });

    return NextResponse.json({
      url: blob.url,
      pathname: blob.pathname ?? pathname,
      extension,
    });
  } catch (error) {
    console.error('Blob upload failed', error);
    return NextResponse.json(
      { error: 'Upload failed. Check blob credentials and quota.' },
      { status: 500 },
    );
  }
}

const sanitizeFileName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '-')
    .replace(/-+/g, '-');

const extractExtension = (name: string) => {
  const match = name.match(/\.[a-z0-9]+$/i);
  return match ? match[0] : '.mp4';
};

