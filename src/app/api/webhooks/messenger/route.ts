import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { processIncomingMessage } from "@/lib/services/booking-parser";

const MAX_MESSAGE_LENGTH = 500;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_MESSAGES = 5;
const PROCESSED_MID_CACHE_SIZE = 100;

const rateLimitMap = new Map<string, number[]>();
const processedMids = new Set<string>();
const processedMidOrder: string[] = [];

function verifySignature(body: string, signature: string, secret: string): boolean {
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function isRateLimited(psid: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(psid) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_MESSAGES) {
    rateLimitMap.set(psid, recent);
    return true;
  }
  recent.push(now);
  rateLimitMap.set(psid, recent);
  return false;
}

function isDuplicateMid(mid: string): boolean {
  if (processedMids.has(mid)) return true;
  processedMids.add(mid);
  processedMidOrder.push(mid);
  if (processedMidOrder.length > PROCESSED_MID_CACHE_SIZE) {
    const oldest = processedMidOrder.shift();
    if (oldest) processedMids.delete(oldest);
  }
  return false;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.MESSENGER_VERIFY_TOKEN;

  if (!verifyToken) {
    console.error("[Messenger Webhook] MESSENGER_VERIFY_TOKEN not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    console.log("[Messenger Webhook] Verification successful");
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("[Messenger Webhook] Verification failed — token mismatch");
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  const appSecret = process.env.MESSENGER_APP_SECRET;

  if (!appSecret) {
    console.error("[Messenger Webhook] MESSENGER_APP_SECRET not configured");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("x-hub-signature-256");

  if (!signature) {
    console.warn("[Messenger Webhook] Missing X-Hub-Signature-256 header");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!verifySignature(body, signature, appSecret)) {
    console.warn("[Messenger Webhook] Invalid signature");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    console.error("[Messenger Webhook] Failed to parse JSON body");
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const fbPayload = payload as { object?: string; entry?: unknown[] };

  if (fbPayload.object !== "page" || !Array.isArray(fbPayload.entry)) {
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }

  for (const entry of fbPayload.entry) {
    await processEntry(entry);
  }

  return NextResponse.json({ status: "ok" }, { status: 200 });
}

interface MessengerEntry {
  id?: string;
  time?: number;
  messaging?: unknown[];
}

interface MessengerEvent {
  sender?: { id?: string };
  recipient?: { id?: string };
  timestamp?: number;
  message?: { mid?: string; text?: string };
  postback?: { payload?: string };
  quick_reply?: { payload?: string };
}

async function processEntry(entry: unknown): Promise<void> {
  const typedEntry = entry as MessengerEntry;

  if (!typedEntry.messaging || !Array.isArray(typedEntry.messaging)) {
    return;
  }

  for (const event of typedEntry.messaging) {
    await processMessagingEvent(event as MessengerEvent);
  }
}

async function processMessagingEvent(event: MessengerEvent): Promise<void> {
  const senderId = event.sender?.id;

  if (!senderId) {
    return;
  }

  const messageMid = event.message?.mid;
  if (messageMid && isDuplicateMid(messageMid)) {
    console.warn(`[Messenger Webhook] Duplicate message mid ${messageMid} — skipping`);
    return;
  }

  if (isRateLimited(senderId)) {
    console.warn(`[Messenger Webhook] Rate limited PSID ${senderId} — skipping`);
    return;
  }

  const messageText = event.message?.text;
  const postbackPayload = event.postback?.payload;
  const quickReplyPayload = event.quick_reply?.payload;

  const content = messageText ?? postbackPayload ?? quickReplyPayload;

  if (!content) {
    return;
  }

  if (content.length > MAX_MESSAGE_LENGTH) {
    console.warn(`[Messenger Webhook] Message from PSID ${senderId} exceeds ${MAX_MESSAGE_LENGTH} chars — skipping`);
    return;
  }

  try {
    await processIncomingMessage(senderId, content);
    console.log(`[Messenger Webhook] Processed inbound message from PSID ${senderId}: "${content}"`);
  } catch (error) {
    console.error("[Messenger Webhook] Failed to process message:", error);
  }
}
