import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("mealPlans")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getById = query({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    budget: v.number(),
    orang: v.number(),
    preferensi: v.string(),
    days: v.number(),
    menu: v.array(v.object({
      day: v.number(),
      sarapan: v.optional(v.string()),
      makanSiang: v.optional(v.string()),
      makanMalam: v.optional(v.string()),
    })),
    shoppingList: v.array(v.object({
      nama: v.string(),
      jumlah: v.number(),
      satuan: v.string(),
      kategori: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("mealPlans", {
      userId: args.userId,
      title: args.title,
      budget: args.budget,
      orang: args.orang,
      preferensi: args.preferensi,
      days: args.days,
      menu: args.menu,
      shoppingList: args.shoppingList,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("mealPlans") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
