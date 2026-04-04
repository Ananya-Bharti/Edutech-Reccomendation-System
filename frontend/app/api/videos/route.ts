import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/videos
 * Reads videos_metadata.csv and returns all video records as JSON.
 */
export async function GET() {
  const csvPath = path.resolve(process.cwd(), "..", "Videos data", "videos_metadata.csv");

  if (!fs.existsSync(csvPath)) {
    return NextResponse.json({ error: "Metadata CSV not found" }, { status: 404 });
  }

  const raw = fs.readFileSync(csvPath, "utf-8");
  const lines = raw.trim().split(/\r?\n/);
  const headers = lines[0].split(",");

  // Parse CSV (handle quoted fields with commas inside)
  function parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const videos = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const vals = parseCsvLine(lines[i]);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      obj[h] = vals[idx] ?? "";
    });

    // Convert tags string to array
    obj.tags = typeof obj.tags === "string" ? (obj.tags as string).split(",").map((t: string) => t.trim()) : [];
    // Convert duration to number
    obj.duration = parseInt(obj.duration as string, 10) || 0;

    // Build a local video URL
    obj.video_url = `/api/video?id=${obj.video_id}&cat=${obj.category}`;

    // Add engagement counters (random for demo)
    obj.view_count = Math.floor(Math.random() * 8000) + 100;
    obj.like_count = Math.floor(Math.random() * 1200) + 20;
    obj.share_count = Math.floor(Math.random() * 400) + 5;
    obj.save_count = Math.floor(Math.random() * 500) + 10;
    obj.comment_count = Math.floor(Math.random() * 250) + 3;

    videos.push(obj);
  }

  return NextResponse.json({ videos, count: videos.length });
}
