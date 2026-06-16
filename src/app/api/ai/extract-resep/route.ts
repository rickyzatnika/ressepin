import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();
  if (!url) {
    return NextResponse.json({ error: "URL required" }, { status: 400 });
  }

  try {
    const videoId = extractVideoId(url);
    if (!videoId) {
      return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
    }

    let rawText: string;
    let description = "";

    try {
      const transcript = await fetchTranscript(videoId);
      rawText = transcript.rawText;
    } catch {
      rawText = await transcribeWithGroqFallback(url);
    }

    // Also fetch video description for structured recipe info
    try {
      description = await fetchVideoDescription(videoId);
    } catch {
      // description stays empty, not critical
    }

    const resep = await extractResepFromText(description, rawText);

    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    return NextResponse.json({ ...resep, foto: thumbnail, youtubeUrl: url });
  } catch (err: any) {
    console.error("[AI] Extract error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

async function fetchTranscript(videoId: string) {
  const errors: string[] = [];

  // Try youtube-transcript npm package (most reliable)
  try {
    const { YoutubeTranscript } = require("youtube-transcript");
    const data = await YoutubeTranscript.fetchTranscript(videoId);
    if (data && data.length > 0) {
      const segments = data.map((s: any) => ({
        start: s.offset / 1000,
        end: (s.offset + s.duration) / 1000,
        text: s.text,
      }));
      const rawText = segments.map((s: { text: string }) => s.text).join(" ");
      return { segments, rawText };
    }
    errors.push("youtube-transcript: empty");
  } catch (e: any) {
    errors.push(`youtube-transcript: ${e.message}`);
  }

  // Fallback: youtubetranscript.com
  try {
    const webRes = await fetch(
      `https://youtubetranscript.com/?v=${videoId}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (webRes.ok) {
      const contentType = webRes.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        const data = await webRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const segments = data.map((s: any) => ({
            start: s.offset,
            end: s.offset + s.duration,
            text: s.text,
          }));
          const rawText = segments.map((s: any) => s.text).join(" ");
          return { segments, rawText };
        }
      }
    }
    errors.push(`youtubetranscript: ${webRes.status}`);
  } catch (e: any) {
    errors.push(`youtubetranscript: ${e.message}`);
  }

  throw new Error(`No captions available: ${errors.join("; ")}`);
}

async function fetchVideoDescription(videoId: string): Promise<string> {
  // Try 1: YouTube Data API v3 (most reliable, needs API key)
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`,
        { signal: AbortSignal.timeout(5000) },
      );
      if (res.ok) {
        const data = await res.json();
        const desc = data?.items?.[0]?.snippet?.description || "";
        if (desc.length > 50) {
          console.log(`[AI] Description fetched via YouTube API: ${desc.length} chars`);
          return desc;
        }
      } else {
        const err = await res.text().catch(() => "");
        console.warn(`[AI] YouTube API error ${res.status}:`, err.slice(0, 200));
      }
    } catch (e: any) {
      console.warn("[AI] YouTube API fetch failed:", e.message);
    }
  }

  // Try 2: Invidious API (free, no API key)
  const invidiousInstances = [
    "https://inv.nadeko.net",
    "https://invidious.snopyta.org",
    "https://yewtu.be",
  ];
  for (const instance of invidiousInstances) {
    try {
      const res = await fetch(`${instance}/api/v1/videos/${videoId}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const desc = data.description || "";
        if (desc.length > 50) {
          console.log(`[AI] Description fetched from ${instance}: ${desc.length} chars`);
          return desc;
        }
      }
    } catch {
      // try next instance
    }
  }

  // Try 3: fetch YouTube page HTML
  try {
    const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
    if (res.ok) {
      const html = await res.text();
      const ldMatch = html.match(
        /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i,
      );
      if (ldMatch) {
        try {
          const parsed = JSON.parse(ldMatch[1]);
          const desc = parsed.description || "";
          if (desc.length > 50) return desc;
        } catch {}
      }
    }
  } catch {}

  console.warn("[AI] All description sources failed");
  return "";
}

async function transcribeWithGroqFallback(url: string): Promise<string> {
  console.log("[AI] Falling back to Groq Whisper transcription...");

  const { execFile } = require("child_process");
  const fs = require("fs");
  const path = require("path");
  const os = require("os");

  // Check if yt-dlp is available (local dev only)
  const YT_DLP = process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp";
  try {
    await new Promise((resolve, reject) => {
      execFile(YT_DLP, ["--version"], { timeout: 5000 }, (err: any, stdout: string) => {
        if (err) reject(err);
        else resolve(stdout);
      });
    });
  } catch {
    throw new Error(
      "Video tidak punya captions. Fitur transkripsi otomatis hanya tersedia di server dengan yt-dlp. " +
      "Coba video lain yang punya captions atau tambahkan captions manual."
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "resepin-"));
  try {
    const audioPath = path.join(tmpDir, "audio.mp3");
    await new Promise((resolve, reject) => {
      execFile(YT_DLP, [
        "-f", "bestaudio", "-x", "--audio-format", "mp3", "--audio-quality", "0",
        "-o", audioPath, "--no-playlist", "--no-warnings", url,
      ], { timeout: 300000 }, (err: any) => err ? reject(err) : resolve(undefined));
    });

    if (!fs.existsSync(audioPath)) throw new Error("Audio file not found");
    const audioBuf = fs.readFileSync(audioPath);
    const blob = new Blob([audioBuf], { type: "audio/mpeg" });

    const form = new FormData();
    form.append("file", blob, "audio.mp3");
    form.append("model", "whisper-large-v3");
    form.append("response_format", "verbose_json");
    form.append("language", "id");

    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(120000),
    });

    if (!res.ok) throw new Error(`Whisper API error: ${res.status}`);

    const data = await res.json();
    const segments = (data.segments || []).map((s: any) => s.text).filter(Boolean);
    return segments.join(" ") || data.text || "";
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

async function extractResepFromText(description: string, transcript: string) {
  const descSection = description
    ? `[DESKRIPSI VIDEO YOUTUBE (prioritas utama - ini sudah dalam Bahasa Indonesia, gunakan untuk bahan & jumlah)]\n${description}\n`
    : "";

  const prompt = `Extract resep masakan dari data berikut. Kembalikan JSON valid.

ATURAN:
- Output SEMUA dalam Bahasa Indonesia.
- PRIORITAS UTAMA: data dari "DESKRIPSI VIDEO" — biasanya berisi daftar bahan LENGKAP dengan jumlah persis (gram, sendok, butir, ml, dll).
- Gunakan transcript hanya sebagai referensi tambahan untuk langkah memasak.
- Untuk setiap bahan, extract jumlah dan satuan PERSIS seperti yang tertulis. Contoh: "2 sdm maizena" → {"nama": "maizena", "jumlah": 2, "satuan": "sdm"}
- Jika jumlah tidak disebut, set "jumlah": 0 dan "satuan": "".
- "durasi" = total waktu masak dalam menit.
- "tingkatKesulitan": "Mudah" | "Sedang" | "Sulit".
- "tips": tips masak dari video.
- TERJEMAHKAN semua bahan, langkah, dan nama resep ke Bahasa Indonesia, meskipun teks aslinya dalam bahasa asing (Jerman, Inggris, Albania, dll).
- JANGAN gunakan bahasa asing untuk nama bahan atau langkah — SEMUA harus Bahasa Indonesia.
  Contoh: "Kartoffeln" → "kentang", "Eier" → "telur", "Mehl" → "tepung"

KLASIFIKASI KATEGORI:
Tentukan kategori yang sesuai berdasarkan jenis masakan:
- "Masakan Tradisional" untuk masakan Indonesia tradisional, nusantara, atau kuliner lokal (sub: ayam, rendang, soto, gulai, sambal, nasi, mie, dll)
- "Masakan Modern" untuk masakan western, asian fusion, korean, japanese, italian, dll (sub: pasta, pizza, steak, salad, western, korean, japanese, chinese, dll)
- "Dessert" untuk makanan manis penutup (sub: cake, puding, eskrim, brownies, kolak, dll)
- "Minuman" untuk minuman (sub: jus, kopi, teh, smoothie, wedang, dll)

WAJIB: isi "kategori" dengan label konteks utama (salah satu dari 4 di atas) PLUS sub-kategori yang relevan dari daftar di atas. Contoh: ["Masakan Tradisional", "ayam", "gulai", "pedas"]

Kembalikan JSON SAJA:
{
  "name": "Nama Resep",
  "durasi": 0,
  "tingkatKesulitan": "Mudah",
  "bahan": [
    {"nama": "nama bahan", "jumlah": 0, "satuan": ""}
  ],
  "langkah": ["Langkah 1", "Langkah 2"],
  "tips": "Tips memasak",
  "kategori": ["Masakan Tradisional", "ayam", "gulai"]
}

${descSection}
[TRANSCRIPT VIDEO (gunakan untuk langkah memasak)]\n${transcript.slice(0, 6000)}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    console.error("[AI] Groq response error:", res.status, err.slice(0, 500));
    throw new Error(`Groq AI error: ${res.status}`);
  }

  const data = await res.json();

  let content = data.choices?.[0]?.message?.content;
  if (!content) {
    console.error("[AI] Groq empty response:", JSON.stringify(data).slice(0, 500));
    throw new Error("Empty response from Groq");
  }

  try {
    return JSON.parse(content);
  } catch {
    console.error("[AI] Groq invalid JSON response:", content.slice(0, 500));
    throw new Error("Invalid JSON from Groq");
  }
}
