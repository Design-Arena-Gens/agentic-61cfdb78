'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Scene, GeneratedVideo } from '@/types/storyboard';
import { renderSceneToFrame } from '@/lib/video';

type ProgressListener = (progress: number) => void;

type FFmpegInstance = ReturnType<
  typeof import('@ffmpeg/ffmpeg')['createFFmpeg']
>;

type GenerateOptions = {
  scenes: Scene[];
  onProgress?: ProgressListener;
  audioFile?: File | null;
  outputName?: string;
};

const CORE_PATH =
  'https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js';

export const useVideoGenerator = () => {
  const [isReady, setReady] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const ffmpegRef = useRef<FFmpegInstance | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { createFFmpeg } = await import('@ffmpeg/ffmpeg');
      const ffmpegInstance = createFFmpeg({
        log: false,
        corePath: CORE_PATH,
      });

      ffmpegRef.current = ffmpegInstance;
      ffmpegInstance.setProgress(({ ratio }) => {
        setProgress(Number((ratio * 100).toFixed(2)));
      });

      try {
        await ffmpegInstance.load();
        if (!cancelled) {
          setReady(true);
        }
      } catch (error) {
        console.error('Failed to load FFmpeg', error);
        if (!cancelled) {
          setReady(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const generate = useCallback(
    async ({
      scenes,
      audioFile,
      onProgress,
      outputName = `ai-video-${Date.now()}.mp4`,
    }: GenerateOptions): Promise<GeneratedVideo> => {
      if (!ffmpegRef.current) {
        throw new Error('FFmpeg is not ready yet');
      }
      if (!scenes.length) {
        throw new Error('No scenes to render');
      }

      setBusy(true);
      setProgress(0);
      if (onProgress) {
        onProgress(0);
      }

      const ffmpeg = ffmpegRef.current!;

      try {
        // clean fs
        const existing = ffmpeg.FS('readdir', '/');
        existing
          .filter((file) => file !== '.' && file !== '..')
          .forEach((file) => {
            try {
              ffmpeg.FS('unlink', `/${file}`);
            } catch (_) {
              // ignore when file does not exist
            }
          });

        const fileListLines: string[] = [];
        for (let index = 0; index < scenes.length; index += 1) {
          const scene = scenes[index];
          const image = await renderSceneToFrame(scene);
          const fileName = `frame-${String(index).padStart(2, '0')}.png`;
          ffmpeg.FS('writeFile', fileName, image);
          fileListLines.push(`file '${fileName}'`);
          fileListLines.push(`duration ${scene.duration.toFixed(2)}`);
          if (onProgress) {
            onProgress((index / scenes.length) * 50);
          }
        }

        // concat requires last file repeated without duration
        const lastFrame = `frame-${String(scenes.length - 1).padStart(2, '0')}.png`;
        fileListLines.push(`file '${lastFrame}'`);
        const encoder = new TextEncoder();
        ffmpeg.FS('writeFile', 'frames.txt', encoder.encode(fileListLines.join('\n')));

        if (audioFile) {
          const audioData = new Uint8Array(await audioFile.arrayBuffer());
          ffmpeg.FS('writeFile', `audio${getExtension(audioFile.name)}`, audioData);
        }

        if (audioFile) {
          const audioPath = `audio${getExtension(audioFile.name)}`;
          await ffmpeg.run(
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            'frames.txt',
            '-i',
            audioPath,
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            '-c:a',
            'aac',
            '-shortest',
            'output.mp4',
          );
        } else {
          await ffmpeg.run(
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            'frames.txt',
            '-c:v',
            'libx264',
            '-pix_fmt',
            'yuv420p',
            'output.mp4',
          );
        }

        const data = ffmpeg.FS('readFile', 'output.mp4');
        const videoBuffer = new ArrayBuffer(data.length);
        const transferView = new Uint8Array(videoBuffer);
        transferView.set(data);
        const blob = new Blob([videoBuffer], { type: 'video/mp4' });
        const file = new File([blob], outputName, { type: 'video/mp4' });
        const objectUrl = URL.createObjectURL(blob);

        if (onProgress) {
          onProgress(100);
        }
        setProgress(100);

        return {
          url: objectUrl,
          fileName: outputName,
          file,
        };
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  return useMemo(
    () => ({
      isReady,
      isBusy,
      progress,
      generate,
    }),
    [generate, isBusy, isReady, progress],
  );
};

const getExtension = (name: string) => {
  const match = name.match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0] : '.mp3';
};
