import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const create = mutation({
  args: {
    googleId: v.string(),
    plan: v.string(),
    amount: v.number(),
    metode: v.string(),
    pengirim: v.string(),
    catatan: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_googleId", (q) => q.eq("googleId", args.googleId))
      .first();
    if (!user) throw new Error("User not found");

    await ctx.db.insert("paymentRequests", {
      userId: user._id,
      googleId: args.googleId,
      plan: args.plan,
      amount: args.amount,
      metode: args.metode,
      pengirim: args.pengirim,
      catatan: args.catatan ?? "",
      status: "pending",
      createdAt: Date.now(),
    });

    await ctx.db.patch(user._id, {
      isPremium: true,
      premiumSince: Date.now(),
    });
  },
});
