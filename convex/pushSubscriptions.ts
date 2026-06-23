import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:resepin@app.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const subscribe = mutation({
  args: {
    userId: v.string(),
    endpoint: v.string(),
    keys: v.object({
      p256dh: v.string(),
      auth: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        endpoint: args.endpoint,
        keys: args.keys,
      });
    } else {
      await ctx.db.insert("pushSubscriptions", {
        userId: args.userId,
        endpoint: args.endpoint,
        keys: args.keys,
      });
    }
  },
});

export const unsubscribe = mutation({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("pushSubscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const sendPush = action({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sub = await ctx.runQuery(api.pushSubscriptions.getByUserId, {
      userId: args.userId,
    });
    if (!sub) return;

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      icon: args.icon || "/icon-192.png",
      data: { url: args.url || "/" },
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await ctx.runMutation(api.pushSubscriptions.unsubscribe, {
          userId: args.userId,
        });
      }
    }
  },
});
