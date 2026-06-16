import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    googleId: v.string(),
  }).index("by_googleId", ["googleId"]),

  resep: defineTable({
    userId: v.string(),
    name: v.string(),
    bahan: v.array(v.object({
      nama: v.string(),
      jumlah: v.number(),
      satuan: v.string(),
    })),
    langkah: v.array(v.string()),
    tips: v.optional(v.string()),
    foto: v.optional(v.string()),
    youtubeUrl: v.optional(v.string()),
    durasi: v.optional(v.number()),
    tingkatKesulitan: v.optional(v.string()),
    porsi: v.optional(v.number()),
    kategori: v.array(v.string()),
  }).index("by_user", ["userId"]),

  stok: defineTable({
    userId: v.string(),
    nama: v.string(),
    jumlah: v.number(),
    satuan: v.string(),
  })
    .index("by_user", ["userId"])
    .index("by_user_nama", ["userId", "nama"]),

  conversations: defineTable({
    userId: v.string(),
    title: v.string(),
  })
    .index("by_user", ["userId"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    userId: v.string(),
    role: v.string(),
    content: v.string(),
    resep: v.optional(v.any()),
    searched: v.optional(v.boolean()),
  })
    .index("by_conversation", ["conversationId"]),
});
