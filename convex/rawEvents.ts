import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const insertIfMissing = mutation({
  args: {
    source: v.string(),
    sourceId: v.string(),
    rawContent: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('rawEvents')
      .withIndex('by_source_sourceId', (q) =>
        q.eq('source', args.source).eq('sourceId', args.sourceId)
      )
      .first()

    if (existing) {
      return { inserted: false }
    }

    await ctx.db.insert('rawEvents', {
      source: args.source,
      sourceId: args.sourceId,
      rawContent: args.rawContent,
      createdAt: Date.now(),
    })

    return { inserted: true }
  },
})
