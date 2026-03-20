/**
 * Aegis Bridge — Google Drive File Fetch
 * GET /api/drive/fetch?id=FILE_ID&token=ACCESS_TOKEN
 * Downloads a file from Drive and returns its base64 content + mimeType
 * for direct injection into the Gemini multimodal prompt.
 * Max file size: 10MB.
 */
import { NextRequest, NextResponse } from "next/server";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const id = (searchParams.get("id") ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Drive access token required" }, { status: 401 });

  try {
    // First get file metadata to check size and mimeType
    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?fields=id,name,mimeType,size`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (metaRes.status === 401) {
      return NextResponse.json({ error: "Drive token expired — re-link your Google account" }, { status: 401 });
    }
    if (!metaRes.ok) {
      return NextResponse.json({ error: "File not found or not accessible" }, { status: 404 });
    }

    const meta = await metaRes.json() as { id: string; name: string; mimeType: string; size?: string };
    const sizeBytes = parseInt(meta.size ?? "0", 10);
    if (sizeBytes > MAX_BYTES) {
      return NextResponse.json({ error: `File too large (${Math.round(sizeBytes / 1024 / 1024)}MB). Max 10MB.` }, { status: 413 });
    }

    // Download file content
    const dlRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${id}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!dlRes.ok) {
      return NextResponse.json({ error: "Download failed" }, { status: 502 });
    }

    const buffer = await dlRes.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    return NextResponse.json({
      id: meta.id,
      name: meta.name,
      mimeType: meta.mimeType,
      base64,
      sizeBytes: buffer.byteLength,
    });
  } catch (err) {
    console.error("[Drive Fetch]", err);
    return NextResponse.json({ error: "Drive fetch error" }, { status: 500 });
  }
}
