import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY_1;

const SYSTEM_PROMPT = `Kamu adalah ahli meal planning untuk keluarga Indonesia. 
Tugasmu adalah membuat rencana menu mingguan yang praktis, ekonomis, dan sesuai preferensi user.

RESPONSE FORMAT (HANYA JSON, tanpa teks lain):
{
  "menu": [
    {
      "day": 1,
      "sarapan": "nama masakan",
      "makanSiang": "nama masakan",
      "makanMalam": "nama masakan"
    }
  ],
  "shoppingList": [
    {
      "nama": "nama bahan",
      "jumlah": angka,
      "satuan": "kg/gram/butir/siung/...",
      "kategori": "Protein/Sayuran/Bumbu/Buah/Sembako/Lainnya"
    }
  ]
}

Aturan:
- Gunakan bahan-bahan yang umum di Indonesia
- Variasikan menu (jangan itu-itu saja)
- Perhatikan budget yang diberikan
- Sesuaikan porsi dengan jumlah orang
- Kategorikan shopping list dengan benar
- Jika budget pas-pasan, prioritaskan bahan murah namun bergizi
- Gunakan satuan yang umum di Indonesia (kg, gram, butir, siung, dll)
- Jumlah bahan di shopping list harus wajar untuk jumlah orang dan hari yang diminta`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { budget, orang, preferensi, days } = await req.json();

    if (!budget || !orang || !days) {
      return NextResponse.json(
        { error: "Budget, orang, dan days wajib diisi" },
        { status: 400 },
      );
    }

    const userPrompt = `Buatkan meal plan untuk ${days} hari.
Budget: Rp ${budget.toLocaleString("id-ID")} per minggu
Jumlah orang: ${orang} orang
Preferensi: ${preferensi || "Tidak ada preferensi khusus"}`;

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          response_format: { type: "json_object" },
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", errorText);
      return NextResponse.json(
        { error: "Gagal generate meal plan" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI tidak mengembalikan hasil" },
        { status: 502 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Gagal parse response AI" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      menu: parsed.menu || [],
      shoppingList: parsed.shoppingList || [],
    });
  } catch (error) {
    console.error("Meal plan error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
