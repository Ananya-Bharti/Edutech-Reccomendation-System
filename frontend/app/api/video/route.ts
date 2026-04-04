import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

/**
 * GET /api/video?id=vid_001&cat=engineering
 * Streams a video file from the "Videos data" folder.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const cat = req.nextUrl.searchParams.get("cat");

  if (!id || !cat) {
    return NextResponse.json({ error: "id and cat required" }, { status: 400 });
  }

  // Videos data is at project root (two levels up from frontend/app/api/video/)
  const videosRoot = path.resolve(process.cwd(), "..", "Videos data");
  const filePath = path.join(videosRoot, cat, `${id}.mp4`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "Video not found" }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.get("range");

  if (range) {
    // Range request — needed for seeking in HTML5 video
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;

    const stream = fs.createReadStream(filePath, { start, end });
    const readable = new ReadableStream({
      start(controller) {
        stream.on("data", (chunk: Buffer | string) => controller.enqueue(new Uint8Array(typeof chunk === "string" ? Buffer.from(chunk) : chunk)));
        stream.on("end", () => controller.close());
        stream.on("error", (err) => controller.error(err));
      },
    });

    return new Response(readable, {
      status: 206,
      headers: {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": String(chunkSize),
        "Content-Type": "video/mp4",
      },
    });
  }

  // Full file request
  const stream = fs.createReadStream(filePath);
  const readable = new ReadableStream({
    start(controller) {
      stream.on("data", (chunk: Buffer | string) => controller.enqueue(new Uint8Array(typeof chunk === "string" ? Buffer.from(chunk) : chunk)));
      stream.on("end", () => controller.close());
      stream.on("error", (err) => controller.error(err));
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Length": String(fileSize),
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    },
  });
}
