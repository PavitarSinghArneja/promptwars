/**
 * Aegis Bridge — Emergency SMS Notification
 * POST { triageLevel, summary, name, location? }
 * Uses Twilio if TWILIO_SID + TWILIO_AUTH_TOKEN are set.
 * Otherwise logs and returns a mock success (demo mode).
 */
import { NextRequest, NextResponse } from "next/server";

const ALERT_NUMBER = "+919340869471";

interface NotifyBody {
  triageLevel?: string;
  summary?: string;
  name?: string;
  location?: string;
}

export async function POST(req: NextRequest) {
  let body: NotifyBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { triageLevel = "UNKNOWN", summary = "", name = "Unknown", location = "" } = body;

  const message =
    `🚨 AEGIS BRIDGE ALERT\n` +
    `Patient: ${name}\n` +
    `Triage: ${triageLevel}\n` +
    `${summary.slice(0, 120)}\n` +
    (location ? `Location: ${location}\n` : "") +
    `Time: ${new Date().toLocaleString()}`;

  const sid = process.env.TWILIO_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (sid && token && from) {
    // Real Twilio send
    try {
      const credentials = Buffer.from(`${sid}:${token}`).toString("base64");
      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${credentials}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: ALERT_NUMBER, From: from, Body: message }),
        }
      );
      if (!res.ok) {
        const err = await res.text();
        console.error("[Twilio]", err);
        return NextResponse.json({ error: "SMS failed" }, { status: 502 });
      }
      const data = await res.json();
      return NextResponse.json({ ok: true, sid: data.sid, mode: "twilio" });
    } catch (err) {
      console.error("[Twilio]", err);
      return NextResponse.json({ error: "SMS error" }, { status: 500 });
    }
  }

  // Demo mode — log and return success
  console.log("[Emergency Notify — DEMO MODE]", message);
  return NextResponse.json({
    ok: true,
    mode: "demo",
    message,
    to: ALERT_NUMBER,
  });
}
