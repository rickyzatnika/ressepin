import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const GROQ_API_KEY = process.env.GROQ_API_KEY_1;

const SYSTEM_PROMPT = `Kamu adalah AI Chef spesialis masakan Indonesia.
Tugasmu adalah membuat resep-resep lezat dari bahan-bahan yang diberikan user.

Aturan:
- Buat 3 resep berbeda dari bahan-bahan yang diberikan
- Setiap resep harus REALISTIS dengan bahan yang diberikan (boleh tambah bahan pelengkap umum seperti garam, minyak, air)
- Gunakan bahasa Indonesia
- Nama resep harus menarik dan deskriptif
- Setiap resep harus punya langkah yang jelas dan praktis

RESPONSE FORMAT (HANYA JSON, tanpa teks lain):
{
  "resep": [
    {
      "name": "Nama Resep",
      "bahan": [
        { "nama": "bahan", "jumlah": angka, "satuan": "satuan" }
      ],
      "langkah": ["langkah 1", "langkah 2", ...],
      "durasi": angka (menit),
      "tingkatKesulitan": "Mudah/Sedang/Sulit",
      "porsi": angka,
      "tips": "tips memasak",
      "kategori": ["Masakan Modern"]
    }
  ]
}

Kategori yang valid: "Masakan Tradisional", "Masakan Modern", "Dessert", "Minuman"
Gunakan satuan yang umum di Indonesia (gram, kg, butir, siung, sdm, sdt, ml, dll)
Jumlah bahan harus wajar untuk porsi yang diberikan.`;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { bahan } = await req.json();
    if (!bahan || !bahan.trim()) {
      return NextResponse.json(
        { error: "Tulis bahan dulu ya" },
        { status: 400 },
      );
    }

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
            {
              role: "user",
              content: `Buat 3 resep dari bahan-bahan ini: ${bahan}`,
            },
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
        { error: "Gagal generate resep" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "AI tidak ngasih hasil" },
        { status: 502 },
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json(
        { error: "Gagal baca response AI" },
        { status: 502 },
      );
    }

    return NextResponse.json({
      resep: parsed.resep || [],
    });
  } catch (error) {
    console.error("Quick resep error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
