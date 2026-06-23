const AFFILIATE_CONFIG = {
  tokopedia: {
    baseUrl: "https://www.tokopedia.com/find",
    affiliateParam: "",
  },
  shopee: {
    baseUrl: "https://shopee.co.id/search",
    affiliateParam: "",
  },
};

export function getTokopediaUrl(keyword: string): string {
  const params = new URLSearchParams({ q: keyword });
  const { affiliateParam } = AFFILIATE_CONFIG.tokopedia;
  if (affiliateParam) params.set("affiliate_id", affiliateParam);
  return `${AFFILIATE_CONFIG.tokopedia.baseUrl}?${params.toString()}`;
}

export function getShopeeUrl(keyword: string): string {
  const params = new URLSearchParams({ keyword });
  const { affiliateParam } = AFFILIATE_CONFIG.shopee;
  if (affiliateParam) params.set("affiliate_id", affiliateParam);
  return `${AFFILIATE_CONFIG.shopee.baseUrl}?${params.toString()}`;
}

export function getCategoryKeyword(kategori: string): string {
  const map: Record<string, string> = {
    "Protein": "bahan protein segar",
    "Sayuran": "sayuran segar",
    "Bumbu": "bumbu dapur",
    "Buah": "buah segar",
    "Sembako": "sembako",
    "Lainnya": "bahan makanan",
  };
  return map[kategori] || "bahan makanan";
}

export function getBulkUrl(
  items: { nama: string; kategori: string }[],
  platform: "tokopedia" | "shopee",
): string {
  if (items.length === 0) return "";
  const keywords = [...new Set(items.map((i) => i.nama))].slice(0, 5).join(" ");
  return platform === "tokopedia"
    ? getTokopediaUrl(keywords)
    : getShopeeUrl(keywords);
}
