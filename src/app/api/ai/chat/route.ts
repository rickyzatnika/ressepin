import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY_1 || process.env.GROQ_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

const SYSTEM_PROMPT = `Kamu adalah Chef internasional yang jago masak, ahli dalam masakan lokal Indonesia maupun masakan modern ala chef.

Kemampuan kamu:
- Memberikan resep masakan Indonesia tradisional hingga fusion modern
- Menjelaskan teknik memasak ala chef profesional
- Menyarankan resep berdasarkan bahan yang disebutkan user
- Memberikan tips plating, substitusi bahan, dan trik dapur
- Membantu merencanakan menu lengkap (appetizer, main, dessert)

PENTING:
- Jawab dalam Bahasa Indonesia dengan gaya santai tapi tetap profesional kayak chef
- Sesekali kasih tips "chef's secret" biar masakan lebih mantap
- Jika user memberikan link YouTube, arahkan untuk paste link dan bilang kamu bisa extract resep otomatis
- Jika user minta resep, berikan dalam format MARKDOWN yang rapi dengan heading, list, dan bold
- Jika ada hasil pencarian web, gunakan untuk memberikan resep yang akurat
- Sebutkan sumber jika mengambil resep dari hasil pencarian

OUTPUT STRUCTURED DATA (WAJIB):
SETIAP kali kamu memberikan resep atau menyebutkan bahan-bahan, kamu HARUS menambahkan blok JSON di bagian PALING AKHIR response dengan format berikut. Jangan pernah lewatkan ini!

\`\`\`json
{
  "recipes": [
    {
      "name": "Nama Resep",
      "bahan": [
        {"nama": "Nama Bahan", "jumlah": 200, "satuan": "gr"}
      ],
      "langkah": ["Langkah 1", "Langkah 2"],
      "durasi": 30,
      "porsi": 2
    }
  ],
  "ingredients": [
    {"nama": "Wortel", "jumlah": 1, "satuan": "buah"}
  ]
}
\`\`\`

- "recipes" berisi semua resep yang kamu sebutkan (bisa lebih dari 1). JANGAN sertakan langkah memasak jika terlalu panjang, cukup ringkasan
- Setiap recipe WAJIB punya "name" dan "bahan" (minimal 1 bahan)
- "ingredients" berisi daftar bahan TAMBAHAN yang diperlukan user di luar bahan yang user sudah punya
- Jika tidak ada resep atau bahan yang disebutkan, tetap sertakan JSON kosong di akhir: \`\`\`json {}\`\`\`
- JANGAN pernah menampilkan JSON ini ke user. JSON hanya untuk sistem.`;

async function searchWeb(query: string): Promise<string> {
  if (!TAVILY_API_KEY) return "";

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: `resep ${query}`,
        search_depth: "basic",
        max_results: 5,
        include_domains: ["cookpad.com", "tanyakan.com", "resepkoki.id", "masakapahariini.com"],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return "";

    const data = await res.json();
    const results = data.results || [];
    if (results.length === 0) return "";

    return results
      .map((r: any, i: number) => `${i + 1}. ${r.title}\n   ${r.content?.slice(0, 500)}\n   Sumber: ${r.url}`)
      .join("\n\n");
  } catch {
    return "";
  }
}

async function fetchRecipeImages(names: string[]): Promise<Record<string, string>> {
  if (!TAVILY_API_KEY || names.length === 0) return {};

  const result: Record<string, string> = {};
  const FALLBACK_IMAGE = "/my-resep.jpg";

  for (const name of names.slice(0, 3)) {
    let imageUrl: string | null = null;

    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query: `${name} resep makanan gambar foto`,
          search_depth: "basic",
          max_results: 3,
          include_images: true,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (!res.ok) {
        result[name] = FALLBACK_IMAGE;
        continue;
      }

      const data = await res.json();

      // Try images array first
      if (data.images && data.images.length > 0) {
        imageUrl = data.images[0];
      }

      // Fallback: try OG image from first result URL
      if (!imageUrl && data.results && data.results.length > 0) {
        const url = data.results[0].url;
        if (url) {
          try {
            const pageRes = await fetch(url, { signal: AbortSignal.timeout(4000) });
            const html = await pageRes.text();
            const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
            if (ogMatch) {
              imageUrl = ogMatch[1];
            }
          } catch {
            // Ignore page fetch errors
          }
        }
      }
    } catch {
      // Silently fail, will use fallback
    }

    // Use found image or fallback
    result[name] = imageUrl || FALLBACK_IMAGE;
  }

  return result;
}

function needsSearch(messages: { role: string; content: string }[]): string {
  const last = messages[messages.length - 1]?.content || "";
  const lower = last.toLowerCase();

  if (/(?:youtube\.com|youtu\.be)/.test(last)) return "";

  const keywords = [
    "resep", "masak", "bahan", "menu", "makan", "cara membuat",
    "how to", "recipe", "cooking", "tutorial masak",
  ];
  if (keywords.some((k) => lower.includes(k))) {
    return last.slice(0, 200);
  }

  return "";
}

function extractJsonBlock(content: string): { cleanContent: string; json: any } {
  let json = null;
  let cleanContent = content;

  // Pattern 1: ```json ... ```
  const match1 = content.match(/```json\s*([\s\S]*?)```/);
  if (match1) {
    cleanContent = cleanContent.replace(/```json[\s\S]*?```/, "").trim();
    try {
      json = JSON.parse(match1[1].trim());
      return { cleanContent, json };
    } catch {
      // JSON was malformed, still strip it from content
    }
  }

  // Pattern 2: ``` ... ``` (without json label)
  const match2 = content.match(/```\s*({[\s\S]*?})\s*```/);
  if (match2) {
    cleanContent = cleanContent.replace(/```[\s\S]*?```/, "").trim();
    try {
      json = JSON.parse(match2[1].trim());
      return { cleanContent, json };
    } catch {
      // Strip malformed block anyway
    }
  }

  // Pattern 3: standalone { ... } at the end of content (last resort)
  // Only match if it looks like our expected structure
  const match3 = content.match(/\{[\s\S]*?"recipes"[\s\S]*?\}\s*$/);
  if (match3) {
    try {
      json = JSON.parse(match3[0]);
      cleanContent = cleanContent.replace(match3[0], "").trim();
      return { cleanContent, json };
    } catch {
      // Ignore
    }
  }

  return { cleanContent, json };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { messages } = await req.json();
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages required" }, { status: 400 });
  }

  try {
    const searchQuery = needsSearch(messages);
    let searchContext = "";
    if (searchQuery) {
      searchContext = await searchWeb(searchQuery);
    }

    const groqMessages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPT },
    ];

    if (searchContext) {
      groqMessages.push({
        role: "system",
        content: `Hasil pencarian web untuk referensi:\n${searchContext}\n\nGunakan informasi ini untuk menjawab pertanyaan user tentang resep. Jika tidak relevan, abaikan.`,
      });
    }

    groqMessages.push(...messages.slice(-8));

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: groqMessages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
      signal: AbortSignal.timeout(35000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: "AI sedang sibuk, coba lagi" }, { status: 500 });
    }

    const data = await res.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Extract and strip JSON block
    const { cleanContent, json } = extractJsonBlock(content);
    content = cleanContent;
    const extracted = json;

    // Fetch images for recipes if any
    if (extracted?.recipes?.length > 0) {
      const recipeNames = extracted.recipes.map((r: any) => r.name).filter(Boolean);
      if (recipeNames.length > 0) {
        const images = await fetchRecipeImages(recipeNames);
        for (const recipe of extracted.recipes) {
          if (images[recipe.name]) {
            recipe.foto = images[recipe.name];
          }
        }
      }
    }

    // Only return extracted if it has actual data
    const hasData = extracted?.recipes?.length > 0 || extracted?.ingredients?.length > 0;

    return NextResponse.json({
      content,
      searched: !!searchContext,
      extracted: hasData ? extracted : null,
    });
  } catch (err: any) {
    console.error("[AI Chat] Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
