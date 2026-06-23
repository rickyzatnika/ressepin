import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getByGoogleId = query({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
  },
});

export const sync = mutation({
  args: {
    googleId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: args.name,
        email: args.email,
        image: args.image,
      });
      return existing._id;
    }

    return await ctx.db.insert("users", {
      googleId: args.googleId,
      name: args.name,
      email: args.email,
      image: args.image,
      isPremium: false,
      freeMealPlansUsed: 0,
    });
  },
});

export const getPremiumStatus = query({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
    if (!user) return { isPremium: false, premiumSince: null, freeMealPlansUsed: 0 };
    return {
      isPremium: user.isPremium ?? false,
      premiumSince: user.premiumSince ?? null,
      freeMealPlansUsed: user.freeMealPlansUsed ?? 0,
    };
  },
});

export const activatePremium = mutation({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
    if (!existing) throw new Error("User not found");
    await ctx.db.patch(existing._id, {
      isPremium: true,
      premiumSince: Date.now(),
    });
  },
});

export const deactivatePremium = mutation({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
    if (!existing) throw new Error("User not found");
    await ctx.db.patch(existing._id, {
      isPremium: false,
      premiumSince: undefined,
    });
  },
});

export const incrementFreeMealPlanUsage = mutation({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
    if (!existing) throw new Error("User not found");
    const current = existing.freeMealPlansUsed ?? 0;
    await ctx.db.patch(existing._id, {
      freeMealPlansUsed: current + 1,
    });
  },
});
