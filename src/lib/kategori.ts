export interface KonteksKategori {
  label: string;
  icon: string;
  sub: string[];
}

export const KONTEKS_KATEGORI: KonteksKategori[] = [
  {
    label: "Masakan Tradisional",
    icon: "🏛️",
    sub: [
      "ayam", "sapi", "kambing", "ikan", "seafood", "sayur", "tahu", "tempe",
      "sambal", "soto", "gulai", "rendang", "opor", "lodeh", "pecel", "nasi", "mie",
      "bubur", "bakso", "siomay", "sate", "geprek", "penyet", "balado", "rica",
    ],
  },
  {
    label: "Masakan Modern",
    icon: "🍽️",
    sub: [
      "pasta", "western", "asian fusion", "korean", "japanese", "chinese",
      "italian", "mexican", "salad", "soup", "pizza", "burger", "sandwich",
      "risotto", "steak", "grill", "roast",
    ],
  },
  {
    label: "Dessert",
    icon: "🍰",
    sub: [
      "kue", "cake", "pudding", "eskrim", "pancake", "waffle", "brownies",
      "cheesecake", "pai", "manisan", "agar", "kolak", "bubur manis",
    ],
  },
  {
    label: "Minuman",
    icon: "🥤",
    sub: [
      "jus", "smoothie", "kopi", "teh", "mocktail", "sirup",
      "minuman tradisional", "wedang", "es", "milkshake",
    ],
  },
];

export function getKonteksForKategori(kategori: string[]): string {
  for (const k of kategori) {
    for (const ctx of KONTEKS_KATEGORI) {
      if (ctx.sub.includes(k.toLowerCase())) return ctx.label;
    }
  }
  return "";
}
