// AI brain: generates drawing prompts and judges submitted drawings.
// Uses any OpenAI-compatible chat completions endpoint with vision support.
// Falls back to a built-in "mock judge" when no API key is configured, so the
// game is fully playable offline/keyless.

const API_KEY = process.env.OPENAI_API_KEY ?? process.env.AI_API_KEY ?? '';
const BASE_URL = process.env.AI_BASE_URL ?? 'https://api.openai.com/v1';
const TEXT_MODEL = process.env.AI_TEXT_MODEL ?? 'gpt-4o-mini';
const VISION_MODEL = process.env.AI_VISION_MODEL ?? 'gpt-4o-mini';

export const aiLive = API_KEY.length > 0;

interface ChatMessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: { url: string; detail?: string };
}

async function chat(model: string, messages: { role: string; content: string | ChatMessageContent[] }[], jsonMode = false): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 1.0,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`AI API error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content;
}

// ---------- Prompt generation ----------

const FALLBACK_PROMPTS = [
  'A giraffe stuck in a phone booth',
  'A robot learning to make pancakes',
  'A pirate afraid of water',
  'An octopus doing eight people\'s jobs at once',
  'A snail winning a marathon',
  'A vampire at the beach with too much sunscreen',
  'A dinosaur trying to use a smartphone',
  'A cat running a fancy restaurant',
  'An astronaut walking a space dog',
  'A wizard whose spells only summon sandwiches',
  'A penguin selling ice cream in the desert',
  'A dragon afraid of birthday candles',
  'A superhero whose power is extreme napping',
  'A shark at a dentist appointment',
  'A ghost trying to win a staring contest',
  'A llama driving a school bus',
  'An alien confused by an umbrella',
  'A banana giving a motivational speech',
  'A knight battling a giant rubber duck',
  'A sloth as a firefighter',
  'A mermaid stuck in traffic',
  'A bee with a tiny briefcase late for work',
  'Grandma winning an esports tournament',
  'A T-Rex trying to do push-ups',
  'A unicorn working at a car wash',
  'A potato becoming president',
  'A spider knitting itself a sweater',
  'A cloud that rains tacos',
  'A frog prince who refuses to be kissed',
  'A polar bear ordering a hot chocolate',
];

export async function generatePrompt(theme: string, used: string[]): Promise<string> {
  if (!aiLive) {
    const pool = FALLBACK_PROMPTS.filter((p) => !used.includes(p));
    const list = pool.length > 0 ? pool : FALLBACK_PROMPTS;
    return list[Math.floor(Math.random() * list.length)];
  }
  const sys =
    'You generate short, funny, highly drawable prompts for a multiplayer drawing game (like Gartic Phone). ' +
    'Rules: one single prompt, max 12 words, concrete and visual, absurd/funny is great, no abstract concepts, family friendly. ' +
    'Reply with ONLY the prompt text, no quotes, no punctuation at the end.';
  const userMsg =
    (theme ? `Theme/vibe requested by the host: "${theme}". ` : '') +
    (used.length ? `Do NOT repeat any of these already-used prompts: ${used.join(' | ')}. ` : '') +
    'Generate one new prompt now.';
  try {
    const out = await chat(TEXT_MODEL, [
      { role: 'system', content: sys },
      { role: 'user', content: userMsg },
    ]);
    return out.trim().replace(/^["']|["']$/g, '').slice(0, 120);
  } catch (err) {
    console.error('[ai] prompt generation failed, using fallback:', err);
    return FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];
  }
}

// ---------- Judging ----------

export interface JudgeInput {
  playerId: string;
  name: string;
  image: string; // data URL (png)
}

export interface JudgeOutput {
  intro: string;
  results: { playerId: string; score: number; comment: string }[];
}

const MOCK_COMMENTS = [
  'Bold lines, bolder choices. I respect the chaos.',
  'This is either a masterpiece or a cry for help. 9/10 either way.',
  'The perspective is wrong but the spirit is SO right.',
  'I gasped. Then I laughed. Then I gasped again.',
  'Picasso called. He wants lessons.',
  'Anatomically questionable, emotionally perfect.',
  'I can feel the time limit in every stroke.',
  'The bucket tool carried this one, and I salute it.',
  'Minimalist. Brave. Possibly unfinished. Iconic.',
  'This drawing has main character energy.',
  'I have seen things today. This is one of them.',
  'The confidence of these lines could power a small city.',
];

const MOCK_INTROS = [
  'The gallery is open and my circuits are tingling. Let us judge ART.',
  'I have analyzed every pixel with the seriousness it absolutely does not deserve.',
  'Behold! The results are in, and nobody is safe.',
  'My professional verdict, rendered with zero mercy and much love:',
];

export async function judgeDrawings(prompt: string, entries: JudgeInput[]): Promise<JudgeOutput> {
  if (!aiLive) {
    const comments = [...MOCK_COMMENTS].sort(() => Math.random() - 0.5);
    return {
      intro: MOCK_INTROS[Math.floor(Math.random() * MOCK_INTROS.length)],
      results: entries.map((e, i) => ({
        playerId: e.playerId,
        score: Math.floor(45 + Math.random() * 55),
        comment: comments[i % comments.length],
      })),
    };
  }

  const sys =
    'You are "Judge Pixel", the flamboyant, funny, kind-hearted AI art judge of a multiplayer drawing game. ' +
    'Players were all given the same prompt and drew it under time pressure. ' +
    'Score each drawing 0-100 based on (a) how well it matches the prompt and (b) creativity/humor. ' +
    'Comments must be short (max 25 words), witty, specific to what you actually see, and never mean-spirited. ' +
    'Avoid ties in scores. Respond in strict JSON: {"intro": string, "results": [{"index": number, "score": number, "comment": string}]} ' +
    'where index is the 0-based index of each drawing in the order given. "intro" is one funny sentence opening the verdict.';

  const content: ChatMessageContent[] = [
    { type: 'text', text: `The prompt everyone drew: "${prompt}". There are ${entries.length} drawings, in order:` },
  ];
  entries.forEach((e, i) => {
    content.push({ type: 'text', text: `Drawing #${i} by player "${e.name}":` });
    content.push({ type: 'image_url', image_url: { url: e.image, detail: 'low' } });
  });

  try {
    const raw = await chat(VISION_MODEL, [
      { role: 'system', content: sys },
      { role: 'user', content },
    ], true);
    const parsed = JSON.parse(raw) as { intro: string; results: { index: number; score: number; comment: string }[] };
    const results = entries.map((e, i) => {
      const r = parsed.results.find((x) => x.index === i);
      return {
        playerId: e.playerId,
        score: Math.max(0, Math.min(100, Math.round(r?.score ?? 50))),
        comment: r?.comment ?? 'My judging circuits blinked. Stunning work, probably.',
      };
    });
    return { intro: parsed.intro || 'The verdict is in!', results };
  } catch (err) {
    console.error('[ai] judging failed, using mock judge:', err);
    const comments = [...MOCK_COMMENTS].sort(() => Math.random() - 0.5);
    return {
      intro: 'My art-critic circuits overheated, so I am judging from the heart:',
      results: entries.map((e, i) => ({
        playerId: e.playerId,
        score: Math.floor(45 + Math.random() * 55),
        comment: comments[i % comments.length],
      })),
    };
  }
}
