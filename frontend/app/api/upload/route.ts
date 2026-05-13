import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * POST /api/upload
 * Accepts multipart/form-data with:
 *   - video (File)
 *   - title (string)
 *   - description (string)
 *   - tags (string, comma-separated)
 *
 * Saves the video to "Videos data/counselor/" and appends metadata
 * to "Videos data/counselor_uploads.json".
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const title = (formData.get("title") as string) || "Untitled";
    const description = (formData.get("description") as string) || "";
    const tagsStr = (formData.get("tags") as string) || "";

    if (!videoFile) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Generate a unique video ID
    const timestamp = Date.now();
    const videoId = `counselor_${timestamp}`;

    // Resolve paths
    const videosRoot = path.resolve(process.cwd(), "..", "Videos data");
    const counselorDir = path.join(videosRoot, "counselor");
    const metadataPath = path.join(videosRoot, "counselor_uploads.json");

    // Ensure counselor directory exists
    if (!fs.existsSync(counselorDir)) {
      fs.mkdirSync(counselorDir, { recursive: true });
    }

    // Save the video file
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${videoId}.mp4`;
    const filePath = path.join(counselorDir, fileName);
    fs.writeFileSync(filePath, buffer);

    // Build video metadata
    // Support multiple input formats: comma-separated, space-separated, hashtag-style, or mixed
    // e.g. "#MBA #College #tips", "mba, finance, consulting", "mba finance consulting"
    const tags = tagsStr
      .replace(/#/g, "")                    // strip all # symbols
      .split(/[\s,]+/)                      // split on commas, spaces, or both
      .map((t) => t.trim().toLowerCase())   // normalize to lowercase
      .filter((t) => t.length > 0);

    const videoMeta = {
      video_id: videoId,
      title,
      description,
      tags,
      category: "mba",
      subcategory: "counselor",
      difficulty: "intermediate",
      target_audience: "mba_aspirant",
      creator_id: "counselor_001",
      creator_name: "Counselor",
      duration: 0,
      video_file: `counselor/${fileName}`,
      video_url: `/api/video?id=${videoId}&cat=counselor`,
      uploaded_at: new Date().toISOString(),
    };

    // Read existing uploads, append, and write back
    let uploads: Record<string, unknown>[] = [];
    if (fs.existsSync(metadataPath)) {
      try {
        uploads = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
      } catch {
        uploads = [];
      }
    }
    uploads.push(videoMeta);
    fs.writeFileSync(metadataPath, JSON.stringify(uploads, null, 2), "utf-8");

    return NextResponse.json({ success: true, video: videoMeta });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Upload failed: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/upload
 * Returns all counselor-uploaded videos from the JSON metadata file.
 */
export async function GET() {
  const videosRoot = path.resolve(process.cwd(), "..", "Videos data");
  const metadataPath = path.join(videosRoot, "counselor_uploads.json");

  let uploads: Record<string, unknown>[] = [];
  if (fs.existsSync(metadataPath)) {
    try {
      uploads = JSON.parse(fs.readFileSync(metadataPath, "utf-8"));
    } catch {
      uploads = [];
    }
  }

  return NextResponse.json({ videos: uploads, count: uploads.length });
}
