import { NextRequest, NextResponse } from 'next/server';

const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Server-side proxy to Gemini. Keeps the API key out of the browser
 * entirely (no client-side fetch to generativelanguage.googleapis.com,
 * so no CORS issue and no key visible in network requests).
 *
 * This route is the ONLY place the GenAI layer touches the app: it
 * receives a system instruction + user prompt built from real,
 * already-computed data (weather numbers, risk levels, alert severity,
 * travel decisions) and returns natural-language text. It never decides
 * risk levels, severities, or decisions itself.
 */
export async function POST(req: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Server is missing GEMINI_API_KEY. Set it in .env.local and restart the dev server.' },
      { status: 500 }
    );
  }

  let body: {
    systemInstruction?: string;
    userPrompt?: string;
    jsonMode?: boolean;
    messages?: { role: 'user' | 'model'; text: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { systemInstruction, userPrompt, jsonMode, messages } = body;
  if (!systemInstruction || (!userPrompt && !messages?.length)) {
    return NextResponse.json({ error: 'Missing systemInstruction or userPrompt/messages' }, { status: 400 });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  // messages carries a full conversation history for the chatbot; a plain
  // userPrompt is used for every single-turn call elsewhere in the app.
  const contents = messages?.length
    ? messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }))
    : [{ role: 'user', parts: [{ text: userPrompt }] }];
  const geminiBody: Record<string, unknown> = {
    contents,
    systemInstruction: { parts: [{ text: systemInstruction }] },
  };
  if (jsonMode) geminiBody.generationConfig = { responseMimeType: 'application/json' };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Gemini API error', res.status, errText);
      if (res.status === 400) {
        return NextResponse.json({ error: 'Invalid Gemini API key or request.' }, { status: 400 });
      }
      if (res.status === 429) {
        return NextResponse.json({ error: 'Rate limited by Gemini — wait a moment and try again.' }, { status: 429 });
      }
      return NextResponse.json({ error: `Gemini error ${res.status}: ${errText.slice(0, 300)}` }, { status: 502 });
    }

    const data = await res.json();
    const text = (data.candidates?.[0]?.content?.parts ?? [])
      .map((p: { text?: string }) => p.text ?? '')
      .join('');

    if (!text) {
      return NextResponse.json(
        { error: 'Gemini returned an empty response (may have been blocked by safety filters).' },
        { status: 502 }
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json({ error: 'Could not reach Gemini API.' }, { status: 502 });
  }
}
