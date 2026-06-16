import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("resep")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("resep") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("resep", {
      userId: args.userId,
      name: args.name,
      bahan: args.bahan,
      langkah: args.langkah,
      tips: args.tips,
      foto: args.foto,
      youtubeUrl: args.youtubeUrl,
      durasi: args.durasi,
      tingkatKesulitan: args.tingkatKesulitan,
      porsi: args.porsi,
      kategori: args.kategori,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("resep"),
    name: v.optional(v.string()),
    bahan: v.optional(v.array(v.object({
      nama: v.string(),
      jumlah: v.number(),
      satuan: v.string(),
    }))),
    langkah: v.optional(v.array(v.string())),
    tips: v.optional(v.string()),
    foto: v.optional(v.string()),
    durasi: v.optional(v.number()),
    tingkatKesulitan: v.optional(v.string()),
    porsi: v.optional(v.number()),
    kategori: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("resep") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
