import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("stok")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    nama: v.string(),
    jumlah: v.number(),
    satuan: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if item already exists for this user
    const existing = await ctx.db
      .query("stok")
      .withIndex("by_user_nama", (q) =>
        q.eq("userId", args.userId).eq("nama", args.nama)
      )
      .first();

    if (existing) {
      // Add to existing stock
      await ctx.db.patch(existing._id, {
        jumlah: existing.jumlah + args.jumlah,
      });
      return existing._id;
    }

    return await ctx.db.insert("stok", {
      userId: args.userId,
      nama: args.nama,
      jumlah: args.jumlah,
      satuan: args.satuan,
    });
  },
});

export const update = mutation({
  args: {
    id: v.id("stok"),
    jumlah: v.optional(v.number()),
    satuan: v.optional(v.string()),
    nama: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const remove = mutation({
  args: { id: v.id("stok") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

export const kurangi = mutation({
  args: {
    userId: v.string(),
    nama: v.string(),
    jumlah: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("stok")
      .withIndex("by_user_nama", (q) =>
        q.eq("userId", args.userId).eq("nama", args.nama)
      )
      .first();

    if (!existing) return null;

    const sisa = existing.jumlah - args.jumlah;
    if (sisa <= 0) {
      await ctx.db.delete(existing._id);
      return null;
    }

    await ctx.db.patch(existing._id, { jumlah: sisa });
    return { ...existing, jumlah: sisa };
  },
});
