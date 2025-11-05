import { StoryBrief, Scene, BackgroundStyle } from '@/types/storyboard';

const gradients = [
  {
    name: 'Aurora',
    value:
      'linear-gradient(135deg, rgba(17,24,39,1) 0%, rgba(59,130,246,1) 50%, rgba(236,72,153,1) 100%)',
  },
  {
    name: 'Sunrise',
    value:
      'linear-gradient(135deg, rgba(248,113,113,1) 0%, rgba(253,186,116,1) 52%, rgba(163,230,53,1) 100%)',
  },
  {
    name: 'Neon Night',
    value:
      'linear-gradient(135deg, rgba(124,58,237,1) 0%, rgba(56,189,248,1) 45%, rgba(34,197,94,1) 100%)',
  },
  {
    name: 'Sunkissed',
    value:
      'linear-gradient(135deg, rgba(251,146,60,1) 0%, rgba(249,115,22,1) 45%, rgba(244,63,94,1) 100%)',
  },
  {
    name: 'Slate',
    value:
      'linear-gradient(135deg, rgba(15,23,42,1) 0%, rgba(71,85,105,1) 52%, rgba(148,163,184,1) 100%)',
  },
];

const toneProfiles = {
  inspirational: {
    hook: [
      'Imagine what happens when creativity meets automation.',
      'This is your sign to share your next big vision.',
      'Turn ideas into impact with the right momentum.',
    ],
    support: [
      'Show up consistently with content that energizes your audience.',
      'Pair your message with visuals that spark emotion.',
      'Deliver storytelling that keeps people watching to the very end.',
    ],
    close: [
      'Ready to go from idea to post in minutes?',
      'Let your brand speak with clarity every time you publish.',
      'It is your turn to lead the conversation on your niche.',
    ],
    overlay: 'light' as const,
  },
  educational: {
    hook: [
      'Here is how to simplify your content workflow.',
      'Let’s break down a smarter way to plan your videos.',
      'Stop guessing what to post—follow this framework.',
    ],
    support: [
      'Structure your message with concise talking points and visuals.',
      'Automated editing keeps your video polished and on-brand.',
      'Optimize watch time with pacing tuned per segment.',
    ],
    close: [
      'Put this playbook to work on your next post.',
      'Level-up your consistency without burning out.',
      'Teach, inspire, and convert with videos that land.',
    ],
    overlay: 'dark' as const,
  },
  playful: {
    hook: [
      'Let’s turn your bold ideas into scroll-stopping reels.',
      'Bring the fun back into posting with effortless automation.',
      'Your audience is ready—let’s surprise them today.',
    ],
    support: [
      'Auto-generated scenes keep the energy upbeat.',
      'Switch between hooks, payoffs, and CTAs seamlessly.',
      'Dynamic backgrounds do the heavy lifting for you.',
    ],
    close: [
      'It is time to drop your next viral moment.',
      'Press publish and own the spotlight.',
      'Stay playful, stay consistent, stay memorable.',
    ],
    overlay: 'light' as const,
  },
  direct: {
    hook: [
      'Stop losing time editing videos from scratch.',
      'Here is the automation stack your Instagram needs.',
      'Hit publish with confidence on every campaign.',
    ],
    support: [
      'AI-assisted scripts map directly to compelling visuals.',
      'Batch-create videos, then auto-schedule them on Instagram.',
      'Analytics-ready chapters let you track what resonates.',
    ],
    close: [
      'Plug this system into your workflow today.',
      'Scale your posting cadence without sacrificing quality.',
      'Own your niche with consistent, high-impact content.',
    ],
    overlay: 'dark' as const,
  },
};

const durationsByLength: Record<StoryBrief['length'], number[]> = {
  short: [4, 4, 5],
  medium: [4, 5, 6, 5],
  long: [4, 5, 6, 4, 6],
};

const supportingDetails = [
  (brief: StoryBrief) =>
    `Built specifically for ${brief.audience || 'modern creators'}, every scene focuses on ${brief.callToAction || 'your CTA'}.`,
  (brief: StoryBrief) =>
    `Optimized pacing keeps watch-time high even on ${brief.length === 'short' ? 'snackable' : 'longer'} clips.`,
  (_brief: StoryBrief) =>
    'Smart overlays auto-balance contrast so captions always stay readable.',
  (_brief: StoryBrief) =>
    'Export-ready for Instagram Reels, Stories, and carousel covers.',
  (brief: StoryBrief) =>
    `Fine-tuned tone to match a ${brief.tone} voice without extra revisions.`,
];

const pick = <T,>(items: T[]): T =>
  items[Math.floor(Math.random() * items.length)];

const pickGradient = (): BackgroundStyle => ({
  kind: 'gradient',
  value: pick(gradients).value,
});

export const storyboardGradients = gradients;

export function generateStoryboard(brief: StoryBrief): Scene[] {
  const toneProfile = toneProfiles[brief.tone];
  const durations = durationsByLength[brief.length];
  const baseIdSegment = crypto.randomUUID().split('-')[0];

  return durations.map((duration, index) => {
    const id = `${baseIdSegment}-${index}`;
    if (index === 0) {
      return {
        id,
        title: brief.idea || 'Idea Launchpad',
        narration: pick(toneProfile.hook),
        supportingPoint: supportingDetails[index % supportingDetails.length](brief),
        duration,
        background: pickGradient(),
        overlay: toneProfile.overlay,
      };
    }

    if (index === durations.length - 1) {
      return {
        id,
        title: 'Close & Convert',
        narration: pick(toneProfile.close),
        supportingPoint: brief.callToAction
          ? `Next step: ${brief.callToAction}`
          : 'Drop your CTA here before publishing.',
        duration,
        background: pickGradient(),
        overlay: toneProfile.overlay,
        cta: brief.callToAction,
      };
    }

    return {
      id,
      title: index === 1 ? 'Show The Payoff' : 'Keep The Energy',
      narration: pick(toneProfile.support),
      supportingPoint: supportingDetails[index % supportingDetails.length](brief),
      duration,
      background: pickGradient(),
      overlay: toneProfile.overlay,
    };
  });
}

