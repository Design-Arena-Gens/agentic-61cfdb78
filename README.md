## Agentic Instagram Automation

This project delivers an end-to-end Instagram automation dashboard:

- Generate AI-assisted storyboards tuned to your audience, tone, and goals.
- Render polished vertical videos in the browser with `ffmpeg.wasm`.
- Upload finished assets to Vercel Blob storage for public delivery.
- Auto-post videos to Instagram (or schedule them) using the Graph API.

Built with **Next.js App Router**, **TypeScript**, and **Tailwind CSS** — deploy ready for Vercel.

## Quick Start

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the automation workspace.

## Environment Variables

Duplicate `.env.example` into `.env.local` and populate the values:

- `INSTAGRAM_ACCESS_TOKEN` – long-lived Instagram Graph API access token.
- `INSTAGRAM_USER_ID` – numeric IG Business or Creator user ID.
- `BLOB_READ_WRITE_TOKEN` – Vercel Blob RW token for uploads.

## Production Build

```bash
npm run build
npm start
```

## Deployment

The repository is Vercel-ready. Set the environment variables above in the Vercel dashboard, then deploy:

```bash
vercel deploy --prod --yes --token $VERCEL_TOKEN --name agentic-61cfdb78
```

After deployment, verify the production URL: `https://agentic-61cfdb78.vercel.app`.
