import { NextResponse } from 'next/server';

const INSTAGRAM_USER_ID = process.env.INSTAGRAM_USER_ID;
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;

type PublishPayload = {
  caption?: string;
  videoUrl: string;
  scheduledPublishTime?: string;
  coverUrl?: string;
  shareToFeed?: boolean;
};

export async function POST(request: Request) {
  if (!INSTAGRAM_USER_ID || !INSTAGRAM_ACCESS_TOKEN) {
    return NextResponse.json(
      {
        error:
          'Missing INSTAGRAM_USER_ID or INSTAGRAM_ACCESS_TOKEN environment variables.',
      },
      { status: 500 },
    );
  }

  let payload: PublishPayload;
  try {
    payload = (await request.json()) as PublishPayload;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  if (!payload.videoUrl) {
    return NextResponse.json(
      { error: 'videoUrl is required to publish to Instagram.' },
      { status: 400 },
    );
  }

  try {
    const creation = await createMediaContainer(payload);
    const publication = await publishMedia(creation.id, payload.scheduledPublishTime);

    return NextResponse.json({
      id: publication.id ?? creation.id,
      creationId: creation.id,
      scheduledPublishTime: publication.scheduled_publish_time
        ? new Date(publication.scheduled_publish_time * 1000).toISOString()
        : undefined,
      status: publication.success ? 'scheduled' : 'published',
    });
  } catch (error) {
    console.error('Instagram publish failed', error);
    if (error instanceof InstagramAPIError) {
      return NextResponse.json({ error: error.message, details: error.details }, { status: 400 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unknown error while publishing to Instagram.',
      },
      { status: 500 },
    );
  }
}

const createMediaContainer = async (payload: PublishPayload) => {
  const params = new URLSearchParams({
    access_token: INSTAGRAM_ACCESS_TOKEN!,
    media_type: 'VIDEO',
    video_url: payload.videoUrl,
  });

  if (payload.caption) {
    params.append('caption', payload.caption);
  }
  if (payload.coverUrl) {
    params.append('cover_url', payload.coverUrl);
  }
  if (payload.shareToFeed) {
    params.append('share_to_feed', 'true');
  }

  const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}/media`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new InstagramAPIError(data.error?.message ?? 'Failed to create media container', data);
  }

  return data as { id: string; status_code?: string };
};

const publishMedia = async (creationId: string, scheduled?: string) => {
  const params = new URLSearchParams({
    access_token: INSTAGRAM_ACCESS_TOKEN!,
    creation_id: creationId,
  });

  if (scheduled) {
    const timestamp = Math.floor(new Date(scheduled).getTime() / 1000);
    params.append('scheduled_publish_time', String(timestamp));
    params.append('published', 'false');
  }

  const url = `https://graph.facebook.com/v18.0/${INSTAGRAM_USER_ID}/media_publish`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  const data = await response.json();

  if (!response.ok) {
    throw new InstagramAPIError(data.error?.message ?? 'Failed to publish media', data);
  }

  return data as {
    id?: string;
    success?: boolean;
    scheduled_publish_time?: number;
  };
};

class InstagramAPIError extends Error {
  details: unknown;
  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'InstagramAPIError';
    this.details = details;
  }
}

