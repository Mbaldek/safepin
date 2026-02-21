// src/app/api/verify/start/route.ts
// Creates a Persona inquiry and returns the inquiry ID + session token
// Required env: PERSONA_API_KEY, PERSONA_TEMPLATE_ID

import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { userId } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const apiKey = process.env.PERSONA_API_KEY;
  const templateId = process.env.PERSONA_TEMPLATE_ID;

  if (!apiKey || !templateId) {
    return NextResponse.json(
      { error: 'Persona not configured. Set PERSONA_API_KEY and PERSONA_TEMPLATE_ID in your environment variables.' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch('https://withpersona.com/api/v1/inquiries', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Persona-Version': '2023-01-05',
        'Key-Inflection': 'camel',
      },
      body: JSON.stringify({
        data: {
          attributes: {
            inquiryTemplateId: templateId,
            referenceId: userId,
          },
        },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[verify/start] Persona error:', res.status, body);
      return NextResponse.json({ error: 'Persona API error' }, { status: 502 });
    }

    const json = await res.json();
    const inquiryId: string = json.data?.id;
    const sessionToken: string = json.meta?.sessionToken ?? json.meta?.['session-token'];

    if (!inquiryId) {
      return NextResponse.json({ error: 'No inquiry ID returned' }, { status: 502 });
    }

    return NextResponse.json({ inquiryId, sessionToken });
  } catch (e) {
    console.error('[verify/start] Unexpected error:', e);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
