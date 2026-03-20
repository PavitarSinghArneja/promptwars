/**
 * Aegis Bridge — Google Drive File Search
 * GET /api/drive/search?q=filename&token=ACCESS_TOKEN
 * Searches the user's Drive for matching files.
 * Requires user to have linked Google account with drive.readonly scope.
 * The access token is passed from the client (obtained at link time via Firebase OAuth).
 */
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();

  if (!q) return NextResponse.json({ error: "q is required" }, { status: 400 });
  if (!token) return NextResponse.json({ error: "Drive access token required — link your Google account first" }, { status: 401 });

  const query = encodeURIComponent(
    `name contains '${q.replace(/'/g, "\\'")}' and trashed = false`
  );
  const fields = encodeURIComponent("files(id,name,mimeType,size,modifiedTime)");

  try {
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=10`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (res.status === 401) {
      return NextResponse.json({ error: "Drive token expired — re-link your Google account" }, { status: 401 });
    }
    if (!res.ok) {
      const err = await res.text();
      console.error("[Drive Search]", res.status, err);
      return NextResponse.json({ error: "Drive search failed" }, { status: 502 });
    }

    const data = await res.json() as { files: unknown[] };
    return NextResponse.json({ files: data.files ?? [] });
  } catch (err) {
    console.error("[Drive Search]", err);
    return NextResponse.json({ error: "Drive search error" }, { status: 500 });
  }
}
