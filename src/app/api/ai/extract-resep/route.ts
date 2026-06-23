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

    if (videoId) {
      return await handleYouTube(videoId, url);
    }

    return await handleGeneralUrl(url);
  } catch (err: any) {
    console.error("[AI] Extract error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleYouTube(videoId: string, originalUrl: string) {
  let rawText: string;
  let description = "";

  try {
    const transcript = await fetchTranscript(videoId);
    rawText = transcript.rawText;
  } catch {
    rawText = "";
  }

  try {
    description = await fetchVideoDescription(videoId);
  } catch {
    // description stays empty, not critical
  }

  if (!rawText && !description) {
    throw new Error("Video tidak punya captions dan deskripsi tidak bisa diambil. Coba video lain atau tambahkan resep manual.");
  }

  const resep = await extractResepFromText(description, rawText, "youtube");

  // Try YouTube maxres thumbnail first, fallback to local image
  let thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  
  try {
    const thumbRes = await fetch(thumbnail, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    const contentLength = thumbRes.headers.get("content-length");
    const isPlaceholder = contentLength && parseInt(contentLength) < 5000;
    if (!thumbRes.ok || isPlaceholder) {
      thumbnail = "/my-resep.jpg";
    }
  } catch {
    thumbnail = "/my-resep.jpg";
  }

  return NextResponse.json({ ...resep, foto: thumbnail, youtubeUrl: originalUrl });
}

async function handleGeneralUrl(url: string) {
  let html: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
      },
    });
    if (!res.ok) {
      throw new Error(`Gagal mengakses halaman (HTTP ${res.status})`);
    }
    html = await res.text();
    if (!html || html.length < 100) {
      throw new Error("Halaman tidak memiliki konten yang cukup");
    }
  } catch (e: any) {
    if (e.message?.includes("Gagal")) throw e;
    throw new Error(`Tidak bisa mengakses halaman tersebut. Pastikan URL benar dan bisa diakses publik.`);
  }

  // Extract JSON-LD recipe data if available
  let jsonLdRecipe: any = null;
  const ldMatch = html.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (ldMatch) {
    for (const block of ldMatch) {
      try {
        const content = block.replace(/<\/?script[^>]*>/gi, "").trim();
        const parsed = JSON.parse(content);
        const recipes = findRecipeInJsonLd(parsed);
        if (recipes) {
          jsonLdRecipe = recipes;
          break;
        }
      } catch {}
    }
  }

  // Extract page text content (strip HTML)
  const pageText = extractPageText(html).slice(0, 8000);

  const resep = await extractResepFromText(jsonLdRecipe ? JSON.stringify(jsonLdRecipe) : "", pageText, "general");

  // Try to find an OG image
  let foto = "/my-resep.jpg";
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch) foto = ogMatch[1];

  return NextResponse.json({ ...resep, foto, youtubeUrl: undefined });
}

function findRecipeInJsonLd(data: any): any | null {
  if (!data) return null;

  // Direct @type: Recipe
  if (data["@type"] === "Recipe" || data["@type"]?.includes?.("Recipe")) {
    return data;
  }

  // @graph array
  if (data["@graph"] && Array.isArray(data["@graph"])) {
    for (const item of data["@graph"]) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  // itemListElement
  if (data.itemListElement && Array.isArray(data.itemListElement)) {
    for (const item of data.itemListElement) {
      const found = findRecipeInJsonLd(item);
      if (found) return found;
    }
  }

  // mainEntity
  if (data.mainEntity) {
    return findRecipeInJsonLd(data.mainEntity);
  }

  return null;
}

function extractPageText(html: string): string {
  // Remove script and style tags
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, " ");
  
  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, " ");
  
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  
  return text;
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

async function extractResepFromText(structured: string, rawText: string, source: "youtube" | "general") {
  const isYoutube = source === "youtube";

  const descSection = structured
    ? `[${isYoutube ? "DESKRIPSI VIDEO YOUTUBE (prioritas utama - gunakan untuk bahan & jumlah)" : "STRUKTUR DATA RESEP (JSON-LD / metadata dari halaman - prioritas utama untuk bahan & jumlah)"}]\n${structured}\n`
    : "";

  const textSection = rawText
    ? `[${isYoutube ? "TRANSCRIPT VIDEO (gunakan untuk langkah memasak)" : "KONTEN HALAMAN (teks dari halaman web - gunakan untuk langkah memasak & detail resep)"}]\n${rawText.slice(0, 6000)}`
    : `[${isYoutube ? "TRANSCRIPT VIDEO: tidak tersedia - gunakan deskripsi untuk langkah memasak juga" : "KONTEN HALAMAN: tidak tersedia - gunakan data terstruktur saja"}]\n`;

  const prompt = `Extract resep masakan dari data berikut. Kembalikan JSON valid.

ATURAN:
- Output SEMUA dalam Bahasa Indonesia.
- PRIORITAS UTAMA: data dari "STRUKTUR DATA" atau "DESKRIPSI VIDEO" — biasanya berisi daftar bahan LENGKAP dengan jumlah persis (gram, sendok, butir, ml, dll).
${isYoutube ? "- Gunakan TRANSCRIPT VIDEO untuk langkah memasak." : "- Gunakan KONTEN HALAMAN untuk langkah memasak dan menentukan judul resep."}
- Jika data utama tidak tersedia, ekstrak dari teks yang ada.
- Untuk setiap bahan, extract jumlah dan satuan PERSIS seperti yang tertulis. Contoh: "2 sdm maizena" → {"nama": "maizena", "jumlah": 2, "satuan": "sdm"}
- Jika jumlah tidak disebut, set "jumlah": 0 dan "satuan": "".
- "durasi" = total waktu masak dalam menit.
- "tingkatKesulitan": "Mudah" | "Sedang" | "Sulit".
- "tips": tips masak.
- TERJEMAHKAN semua bahan, langkah, dan nama resep ke Bahasa Indonesia, meskipun teks aslinya dalam bahasa asing.
- JANGAN gunakan bahasa asing untuk nama bahan atau langkah — SEMUA harus Bahasa Indonesia.

KLASIFIKASI KATEGORI:
Tentukan kategori yang sesuai berdasarkan jenis masakan:
- "Masakan Tradisional" untuk masakan Indonesia tradisional, nusantara, atau kuliner lokal
- "Masakan Modern" untuk masakan western, asian fusion, korean, japanese, italian, dll
- "Dessert" untuk makanan manis penutup
- "Minuman" untuk minuman

WAJIB: isi "kategori" dengan label konteks utama PLUS sub-kategori yang relevan.

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
  "kategori": ["Masakan Tradisional"]
}

${descSection}
${textSection}`;

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
