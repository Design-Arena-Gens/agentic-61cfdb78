import { Scene } from '@/types/storyboard';

type RenderOptions = {
  width?: number;
  height?: number;
  fontFamily?: string;
};

const defaultOptions: Required<RenderOptions> = {
  width: 1080,
  height: 1920,
  fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
};

const overlayColors = {
  light: {
    heading: '#F8FAFC',
    body: '#E2E8F0',
    accent: 'rgba(15, 23, 42, 0.55)',
  },
  dark: {
    heading: '#0F172A',
    body: '#1E293B',
    accent: 'rgba(248, 250, 252, 0.55)',
  },
};

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
) => {
  const words = text.split(' ');
  let line = '';
  const lines: string[] = [];

  words.forEach((word) => {
    const testLine = `${line}${word} `;
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = `${word} `;
    } else {
      line = testLine;
    }
  });

  if (line) {
    lines.push(line.trim());
  }

  return {
    lines,
    totalHeight: lines.length * lineHeight,
  };
};

const drawBackground = async (
  ctx: CanvasRenderingContext2D,
  scene: Scene,
  width: number,
  height: number,
) => {
  if (scene.background.kind === 'gradient') {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    const match = scene.background.value
      .replace('linear-gradient(', '')
      .replace(')', '')
      .split(',')
      .map((x) => x.trim());
    // fallback gradient stops
    const colors =
      match.length >= 3
        ? match.slice(1).map((token) => token.replace(/\d+%/, '').trim())
        : ['#0f172a', '#1e293b', '#3b82f6'];

    colors.forEach((color, index) => {
      gradient.addColorStop(index / Math.max(colors.length - 1, 1), color);
    });

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (scene.background.kind === 'color') {
    ctx.fillStyle = scene.background.value;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (scene.background.kind === 'image') {
    const image = await loadImage(scene.background.value);
    const ratio = Math.max(width / image.width, height / image.height);
    const targetWidth = image.width * ratio;
    const targetHeight = image.height * ratio;
    const offsetX = (targetWidth - width) / 2;
    const offsetY = (targetHeight - height) / 2;

    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = targetWidth;
    tmpCanvas.height = targetHeight;
    const tmpCtx = tmpCanvas.getContext('2d');
    if (!tmpCtx) {
      throw new Error('Cannot initialize canvas context for background image');
    }
    tmpCtx.drawImage(image, 0, 0, targetWidth, targetHeight);
    ctx.drawImage(
      tmpCanvas,
      offsetX,
      offsetY,
      width,
      height,
      0,
      0,
      width,
      height,
    );
    return;
  }
};

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load image ${src}`));
    image.src = src;
  });

export const renderSceneToFrame = async (
  scene: Scene,
  options: RenderOptions = {},
): Promise<Uint8Array> => {
  const { width, height, fontFamily } = { ...defaultOptions, ...options };

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Unable to create canvas context');
  }

  await drawBackground(ctx, scene, width, height);

  const colors = overlayColors[scene.overlay];
  const paddingX = width * 0.08;
  const paddingTop = height * 0.15;

  // overlay glass
  ctx.fillStyle = colors.accent;
  ctx.fillRect(paddingX, paddingTop - 40, width - paddingX * 2, height * 0.55);

  ctx.fillStyle = colors.heading;
  ctx.font = `700 ${Math.round(width * 0.06)}px ${fontFamily}`;
  ctx.textBaseline = 'top';

  const headingMetrics = wrapText(
    ctx,
    scene.title.toUpperCase(),
    width - paddingX * 2 - 80,
    Math.round(width * 0.07),
  );
  headingMetrics.lines.forEach((line, index) => {
    ctx.fillText(line, paddingX + 40, paddingTop + index * Math.round(width * 0.07));
  });

  const bodyTop =
    paddingTop + headingMetrics.totalHeight + height * 0.04;

  ctx.font = `500 ${Math.round(width * 0.045)}px ${fontFamily}`;
  ctx.fillStyle = colors.body;

  const narrationMetrics = wrapText(
    ctx,
    scene.narration,
    width - paddingX * 2 - 80,
    Math.round(width * 0.055),
  );

  narrationMetrics.lines.forEach((line, index) => {
    ctx.fillText(line, paddingX + 40, bodyTop + index * Math.round(width * 0.055));
  });

  ctx.font = `400 ${Math.round(width * 0.035)}px ${fontFamily}`;
  ctx.fillStyle = colors.heading;

  const supportingTop =
    bodyTop + narrationMetrics.totalHeight + height * 0.03;
  const supportingMetrics = wrapText(
    ctx,
    scene.supportingPoint,
    width - paddingX * 2 - 80,
    Math.round(width * 0.045),
  );

  supportingMetrics.lines.forEach((line, index) => {
    ctx.fillText(line, paddingX + 40, supportingTop + index * Math.round(width * 0.045));
  });

  if (scene.cta) {
    const ctaY = supportingTop + supportingMetrics.totalHeight + height * 0.05;
    const buttonWidth = width * 0.6;
    const buttonHeight = Math.round(height * 0.07);
    const buttonX = width / 2 - buttonWidth / 2;

    ctx.fillStyle =
      scene.overlay === 'light' ? 'rgba(15, 23, 42, 0.85)' : '#F8FAFC';
    ctx.fillRect(buttonX, ctaY, buttonWidth, buttonHeight);

    ctx.fillStyle = scene.overlay === 'light' ? '#F8FAFC' : '#0F172A';
    ctx.font = `700 ${Math.round(width * 0.04)}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(scene.cta, width / 2, ctaY + buttonHeight / 2);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const dataUrl = canvas.toDataURL('image/png');
  const response = await fetch(dataUrl);
  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
};

