// src/app/api/livekit-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AccessToken } from 'livekit-server-sdk';

export async function POST(req: NextRequest) {
  const { roomName, userId, displayName, canPublish } = await req.json() as {
    roomName: string;
    userId: string;
    displayName: string | null;
    canPublish: boolean;
  };

  if (!roomName || !userId) {
    return NextResponse.json({ error: 'roomName and userId required' }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Livekit not configured' }, { status: 500 });
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: displayName ?? userId,
    ttl: 3600, // 1 hour
  });

  at.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();
  return NextResponse.json({ token, url: process.env.LIVEKIT_URL });
}
