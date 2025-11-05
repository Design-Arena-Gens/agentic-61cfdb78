'use client';

import { useCallback, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { z } from 'zod';
import clsx from 'clsx';
import { generateStoryboard, storyboardGradients } from '@/lib/storyboard';
import type { GeneratedVideo, Scene, StoryBrief } from '@/types/storyboard';
import { useVideoGenerator } from '@/hooks/useVideoGenerator';

const toneOptions: { label: string; value: StoryBrief['tone'] }[] = [
  { label: 'Inspirational', value: 'inspirational' },
  { label: 'Educational', value: 'educational' },
  { label: 'Playful', value: 'playful' },
  { label: 'Direct', value: 'direct' },
];

const lengthOptions: { label: string; value: StoryBrief['length']; description: string }[] =
  [
    { label: 'Short (15s)', value: 'short', description: 'Hooks reels & teasers' },
    {
      label: 'Medium (25s)',
      value: 'medium',
      description: 'Standard reels & story exports',
    },
    {
      label: 'Long (45s)',
      value: 'long',
      description: 'Narrative content & mini explainers',
    },
  ];

type UploadState =
  | { status: 'idle' }
  | { status: 'uploading' }
  | { status: 'ready'; url: string; fileName: string }
  | { status: 'error'; message: string };

const publishSchema = z.object({
  caption: z.string().max(2200, 'Instagram captions must be 2200 characters or fewer'),
  videoUrl: z.string().url('Video upload URL is required before posting'),
  scheduledPublishTime: z
    .string()
    .optional()
    .refine(
      (value) => !value || !Number.isNaN(Date.parse(value)),
      'Scheduled publish time must be a valid date-time',
    ),
});

const defaultBrief: StoryBrief = {
  idea: 'AI-Powered Instagram Automation Launch',
  audience: 'busy solo creators and growth marketers',
  tone: 'direct',
  callToAction: 'Start your automation sprint today',
  length: 'medium',
};

export function HomePage() {
  const [brief, setBrief] = useState<StoryBrief>(defaultBrief);
  const [scenes, setScenes] = useState<Scene[]>(() => generateStoryboard(defaultBrief));
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [video, setVideo] = useState<GeneratedVideo | null>(null);
  const [upload, setUpload] = useState<UploadState>({ status: 'idle' });
  const [caption, setCaption] = useState(
    'AI video generated in minutes. Automated, on-brand, and ready to post. #aicontent #creatorworkflow',
  );
  const [scheduledPublishTime, setScheduledPublishTime] = useState<string>('');
  const [publishStatus, setPublishStatus] = useState<
    | { state: 'idle' }
    | { state: 'posting' }
    | { state: 'success'; id: string; scheduledAt?: string }
    | { state: 'error'; message: string }
  >({ state: 'idle' });

  const { isReady, isBusy, progress, generate } = useVideoGenerator();

  const totalDuration = useMemo(
    () => scenes.reduce((sum, scene) => sum + scene.duration, 0),
    [scenes],
  );

  const handleBriefChange = useCallback(
    <K extends keyof StoryBrief>(key: K, value: StoryBrief[K]) => {
      setBrief((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const regenerateStoryboard = useCallback(() => {
    const trimmedBrief = {
      ...brief,
      idea: brief.idea.trim() || defaultBrief.idea,
      callToAction: brief.callToAction.trim() || defaultBrief.callToAction,
      audience: brief.audience.trim() || defaultBrief.audience,
    };
    setScenes(generateStoryboard(trimmedBrief));
  }, [brief]);

  const updateScene = useCallback(
    (sceneId: string, updates: Partial<Scene>) => {
      setScenes((prev) =>
        prev.map((scene) =>
          scene.id === sceneId
            ? {
                ...scene,
                ...updates,
              }
            : scene,
        ),
      );
    },
    [],
  );

  const handleGenerateVideo = useCallback(async () => {
    if (!isReady) return;
    const asset = await generate({
      scenes,
      audioFile,
    });
    setVideo(asset);
    setUpload({ status: 'idle' });
  }, [audioFile, generate, isReady, scenes]);

  const handleUpload = useCallback(async () => {
    if (!video) return;
    setUpload({ status: 'uploading' });
    const formData = new FormData();
    formData.append('file', video.file);
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed (${response.status})`);
      }
      const data = (await response.json()) as { url: string; pathname: string };
      setUpload({ status: 'ready', url: data.url, fileName: video.fileName });
      setPublishStatus({ state: 'idle' });
    } catch (error) {
      console.error(error);
      setUpload({
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }, [video]);

  const handlePublish = useCallback(async () => {
    if (upload.status !== 'ready') return;
    setPublishStatus({ state: 'posting' });
    const payload = {
      caption,
      videoUrl: upload.url,
      scheduledPublishTime: scheduledPublishTime || undefined,
    };

    const parsed = publishSchema.safeParse(payload);
    if (!parsed.success) {
      setPublishStatus({
        state: 'error',
        message: parsed.error.issues[0]?.message ?? 'Invalid form',
      });
      return;
    }

    try {
      const response = await fetch('/api/instagram/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error ?? 'Instagram API error');
      }
      const data = await response.json();
      setPublishStatus({
        state: 'success',
        id: data.id ?? 'queued',
        scheduledAt: data.scheduledPublishTime,
      });
    } catch (error) {
      console.error(error);
      setPublishStatus({
        state: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to reach the Instagram API',
      });
    }
  }, [caption, scheduledPublishTime, upload]);

  return (
    <div className="relative flex min-h-screen flex-col items-stretch bg-transparent">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent" />
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 pt-16 pb-10 text-center md:text-left">
        <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-blue-500/40 bg-blue-500/10 px-4 py-1 text-sm text-blue-200 md:mx-0">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          Fully agentic Instagram automation pipeline
        </span>
        <h1 className="text-4xl font-semibold leading-tight text-slate-50 md:text-5xl">
          Generate AI-powered Instagram videos and auto-post on your schedule.
        </h1>
        <p className="text-lg text-slate-300 md:max-w-2xl">
          Turn campaign ideas into edited reels, upload them to secure blob storage,
          and publish directly to Instagram with optional scheduling—all inside one
          deploy-ready Next.js application.
        </p>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-24">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-blue-500/10 backdrop-blur">
          <div className="flex flex-col gap-8 p-8">
            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-slate-50">
                Strategy Blueprint
              </h2>
              <p className="text-sm text-slate-400">
                Define the creative pillars that guide the AI storyboard generator.
                These inputs are used to craft hooks, payoffs, and CTAs tailored to your audience.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-2 text-left text-sm font-medium text-slate-200">
                Campaign idea
                <textarea
                  rows={3}
                  className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                  value={brief.idea}
                  onChange={(event) => handleBriefChange('idea', event.target.value)}
                  placeholder="What are you launching or explaining?"
                />
              </label>

              <div className="grid gap-5 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-left text-sm font-medium text-slate-200">
                  Target audience
                  <input
                    className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    value={brief.audience}
                    onChange={(event) => handleBriefChange('audience', event.target.value)}
                    placeholder="e.g. bootstrapped SaaS founders"
                  />
                </label>
                <label className="flex flex-col gap-2 text-left text-sm font-medium text-slate-200">
                  Call to action
                  <input
                    className="rounded-2xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/40"
                    value={brief.callToAction}
                    onChange={(event) => handleBriefChange('callToAction', event.target.value)}
                    placeholder="Join the waitlist"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tone
                </span>
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
                  {toneOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleBriefChange('tone', option.value)}
                      className={clsx(
                        'group rounded-2xl border px-4 py-3 text-left transition hover:border-blue-500/60 hover:bg-blue-500/10',
                        brief.tone === option.value
                          ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                          : 'border-slate-700 text-slate-300',
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-400 group-hover:text-slate-300">
                        {option.value === 'inspirational' && 'Motivate action with high-energy copy.'}
                        {option.value === 'educational' && 'Break down topics with clarity.'}
                        {option.value === 'playful' && 'Keep pacing upbeat with high contrast overlays.'}
                        {option.value === 'direct' && 'High-impact messaging with growth-focused edits.'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Video length
                </span>
                <div className="grid gap-3 sm:grid-cols-3">
                  {lengthOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      onClick={() => handleBriefChange('length', option.value)}
                      className={clsx(
                        'rounded-2xl border px-4 py-3 text-left transition hover:border-blue-500/60 hover:bg-blue-500/10',
                        brief.length === option.value
                          ? 'border-blue-500 bg-blue-500/20 text-blue-100'
                          : 'border-slate-700 text-slate-300',
                      )}
                    >
                      <span className="text-sm font-medium">{option.label}</span>
                      <span className="mt-1 block text-xs text-slate-400">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-4 rounded-2xl border border-blue-500/50 bg-blue-500/10 p-6">
              <p className="text-sm text-slate-200">
                The storyboard generator orchestrates a hook → proof → payoff flow tuned to your tone.
                You can refine any scene below before rendering the final video.
              </p>
              <button
                type="button"
                onClick={regenerateStoryboard}
                className="rounded-full bg-blue-500 px-5 py-2 text-sm font-semibold text-slate-50 shadow-lg shadow-blue-500/25 transition hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
              >
                Regenerate storyboard
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/60 shadow-xl shadow-blue-500/10 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 px-8 py-6">
            <div>
              <h2 className="text-2xl font-semibold text-slate-50">Scene Designer</h2>
              <p className="text-sm text-slate-400">
                Edit pacing, narration, and backgrounds per scene. Total runtime:{' '}
                <span className="font-semibold text-blue-300">{Math.round(totalDuration)}s</span>
              </p>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-emerald-200">
              AI storyboard ready
            </span>
          </div>

          <div className="flex flex-col gap-6 p-8">
            {scenes.map((scene, index) => (
              <div
                key={scene.id}
                className="flex flex-col gap-6 rounded-3xl border border-slate-800 bg-slate-950/50 p-6 shadow-lg shadow-blue-500/5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-sm font-semibold text-blue-200">
                      {index + 1}
                    </span>
                    <div>
                      <input
                        value={scene.title}
                        className="w-full max-w-xs bg-transparent text-lg font-semibold text-slate-50 outline-none"
                        onChange={(event) =>
                          updateScene(scene.id, { title: event.target.value })
                        }
                      />
                      <span className="text-xs uppercase tracking-wide text-slate-500">
                        {scene.overlay === 'light' ? 'High Contrast Overlay' : 'Glass Light Overlay'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-400">
                      Duration
                      <input
                        type="number"
                        min={2}
                        max={12}
                        value={scene.duration}
                        onChange={(event) =>
                          updateScene(scene.id, {
                            duration: Number(event.target.value || 4),
                          })
                        }
                        className="w-16 rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-xs text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-400"
                      />
                      sec
                    </label>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Narration
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                      value={scene.narration}
                      onChange={(event) =>
                        updateScene(scene.id, { narration: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Supporting detail
                    <textarea
                      rows={3}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                      value={scene.supportingPoint}
                      onChange={(event) =>
                        updateScene(scene.id, {
                          supportingPoint: event.target.value,
                        })
                      }
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex flex-col gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Background style
                    </span>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {storyboardGradients.map((gradient) => (
                        <button
                          key={gradient.value}
                          type="button"
                          onClick={() =>
                            updateScene(scene.id, {
                              background: { kind: 'gradient', value: gradient.value },
                            })
                          }
                          className={clsx(
                            'group flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition',
                            scene.background.kind === 'gradient' &&
                              scene.background.value === gradient.value
                              ? 'border-blue-400 bg-blue-400/20 text-blue-50'
                              : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-blue-400/60 hover:bg-blue-500/10',
                          )}
                        >
                          <span className="text-sm font-medium">{gradient.name}</span>
                          <span
                            className="ml-2 h-8 w-8 rounded-full border border-slate-900"
                            style={{ background: gradient.value }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-2 text-sm text-slate-200">
                    Custom background image URL
                    <input
                      placeholder="https://images.unsplash.com/..."
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                      value={scene.background.kind === 'image' ? scene.background.value : ''}
                      onChange={(event) => {
                        const value = event.target.value.trim();
                        updateScene(scene.id, {
                          background: value
                            ? { kind: 'image', value }
                            : { kind: 'gradient', value: scene.background.value },
                        });
                      }}
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-2 text-sm text-slate-200">
                  Call to action override
                  <input
                    placeholder="Optional CTA to display in this scene"
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50"
                    value={scene.cta ?? ''}
                    onChange={(event) =>
                      updateScene(scene.id, {
                        cta: event.target.value || undefined,
                      })
                    }
                  />
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/70 shadow-xl shadow-blue-500/10 backdrop-blur">
          <div className="grid gap-10 p-8 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-2xl font-semibold text-slate-50">Render AI Video</h2>
                <p className="text-sm text-slate-400">
                  Video renders in-browser via ffmpeg.wasm so your assets stay private before uploading.
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Optional backing track
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
                  className="text-xs text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-blue-500 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-slate-50 hover:file:bg-blue-400"
                />
                {audioFile && (
                  <p className="text-xs text-blue-200">
                    {audioFile.name} • {(audioFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={!isReady || isBusy}
                className={clsx(
                  'flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-300',
                  !isReady
                    ? 'cursor-not-allowed bg-slate-700 text-slate-300'
                    : 'bg-blue-500 text-slate-50 hover:bg-blue-400',
                )}
              >
                {!isReady ? 'Preparing FFmpeg core…' : isBusy ? 'Rendering video…' : 'Generate video'}
              </button>

              {isBusy && (
                <div className="flex flex-col gap-2 rounded-2xl border border-blue-500/40 bg-blue-500/10 p-4">
                  <div className="flex items-center justify-between text-xs text-blue-100">
                    <span>Rendering scenes</span>
                    <span>{progress.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-blue-500/20">
                    <div
                      className="h-full rounded-full bg-blue-400"
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {video && (
                <div className="flex flex-col gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5">
                  <div className="flex items-center justify-between text-sm text-emerald-100">
                    <span>Video ready: {video.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setVideo(null)}
                      className="text-xs text-emerald-200 underline"
                    >
                      Clear
                    </button>
                  </div>
                  <video
                    src={video.url}
                    controls
                    className="w-full rounded-2xl border border-emerald-500/30"
                  />
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={upload.status === 'uploading'}
                    className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 transition hover:bg-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  >
                    {upload.status === 'uploading' ? 'Uploading to blob storage…' : 'Upload to Vercel Blob'}
                  </button>
                  {upload.status === 'ready' && (
                    <p className="text-xs text-emerald-100">
                      Uploaded successfully. Public URL:{' '}
                      <a
                        href={upload.url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline"
                      >
                        {upload.url}
                      </a>
                    </p>
                  )}
                  {upload.status === 'error' && (
                    <p className="text-xs text-red-300">Upload failed: {upload.message}</p>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
                <h3 className="text-lg font-semibold text-slate-100">
                  Instagram auto-post control
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Provide your caption, optional scheduled publish time, and hit auto-post.
                </p>

                <label className="mt-6 flex flex-col gap-2 text-sm text-slate-200">
                  Instagram caption
                  <textarea
                    rows={6}
                    value={caption}
                    onChange={(event) => setCaption(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-500">{caption.length} / 2200 characters</span>
                </label>

                <label className="mt-4 flex flex-col gap-2 text-sm text-slate-200">
                  Schedule publish time (optional)
                  <input
                    type="datetime-local"
                    value={scheduledPublishTime}
                    onChange={(event) => setScheduledPublishTime(event.target.value)}
                    className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40"
                  />
                  <span className="text-xs text-slate-500">
                    Instagram requires scheduled posts to be 20 minutes to 75 days in the future.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={upload.status !== 'ready' || publishStatus.state === 'posting'}
                  className={clsx(
                    'mt-6 flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-lg transition focus:outline-none focus:ring-2 focus:ring-purple-300',
                    upload.status === 'ready'
                      ? 'bg-purple-500 text-slate-50 hover:bg-purple-400'
                      : 'cursor-not-allowed bg-slate-700 text-slate-300',
                  )}
                >
                  {publishStatus.state === 'posting'
                    ? 'Sending to Instagram…'
                    : upload.status === 'ready'
                      ? 'Auto-post to Instagram'
                      : 'Upload a video first'}
                </button>

                {publishStatus.state === 'success' && (
                  <div className="mt-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <p>Post queued successfully.</p>
                    <p className="mt-1 text-xs text-emerald-200">
                      Creation ID: {publishStatus.id}
                      {publishStatus.scheduledAt &&
                        ` • Scheduled ${format(parseISO(publishStatus.scheduledAt), "MMM do, hh:mma")}`}
                    </p>
                  </div>
                )}

                {publishStatus.state === 'error' && (
                  <div className="mt-4 rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
                    Instagram error: {publishStatus.message}
                  </div>
                )}

                {upload.status !== 'ready' && (
                  <p className="mt-6 text-xs text-slate-500">
                    Tip: the Instagram Media API requires a publicly accessible HTTPS video URL. Upload via
                    the blob integration first to receive a shareable link.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default HomePage;
