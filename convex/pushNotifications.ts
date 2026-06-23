"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import webpush from "web-push";

export const sendPush = action({
  args: {
    userId: v.string(),
    title: v.string(),
    body: v.string(),
    icon: v.optional(v.string()),
    url: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    webpush.setVapidDetails(
      "mailto:resepin@app.com",
      process.env.VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!,
    );

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
