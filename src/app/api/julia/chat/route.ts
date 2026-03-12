// src/app/api/julia/chat/route.ts — Julia AI chat SSE endpoint

export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase-admin';
import { buildSystemPrompt } from '@/lib/julia-system-prompt';
import type { JuliaContext } from '@/lib/julia-context';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

async function getAuthUser(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { conversationId, message, context } = (await req.json()) as {
    conversationId: string | null;
    message: string;
    context: JuliaContext;
  };

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Message required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const admin = createAdminClient();
  let convId = conversationId;

  // Create conversation if needed
  if (!convId) {
    const { data, error } = await admin
      .from('julia_conversations')
      .insert({ user_id: user.id })
      .select('id')
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: 'Failed to create conversation' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    convId = data.id;
  }

  // Save user message
  await admin.from('julia_messages').insert({
    conversation_id: convId,
    role: 'user',
    content: message.trim(),
  });

  // Fetch last 20 messages for context
  const { data: history } = await admin
    .from('julia_messages')
    .select('role, content')
    .eq('conversation_id', convId)
    .order('created_at', { ascending: true })
    .limit(20);

  const chatMessages: { role: 'user' | 'assistant'; content: string }[] =
    (history ?? []).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

  // Detect locale from context
  const locale = context.language || 'fr';
  const systemPrompt = buildSystemPrompt(context, locale);

  // Stream response
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Send conversation ID
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ conversationId: convId })}\n\n`),
      );

      let fullResponse = '';

      try {
        const anthropicStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: systemPrompt,
          messages: chatMessages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`),
            );
          }
        }

        // Save assistant message
        await admin.from('julia_messages').insert({
          conversation_id: convId,
          role: 'assistant',
          content: fullResponse,
        });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        console.error('[Julia] Stream error:', err);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: 'Stream error' })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
