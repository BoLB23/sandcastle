import { z } from "zod";

export const idSchema = z.string().cuid();

export const inviteAcceptSchema = z.object({
  token: z.string().min(16),
  displayName: z.string().min(2).max(80)
});

export const profileSchema = z.object({
  displayName: z.string().min(2).max(80),
  avatarUrl: z.string().url().optional().nullable(),
  gamertag: z.string().max(64).optional().nullable(),
  favoriteGames: z.array(z.string().min(1).max(80)).max(20).default([]),
  typicalPlayTimes: z.string().max(240).optional().nullable()
});

export const createChannelSchema = z.object({
  name: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/),
  topic: z.string().max(160).optional().nullable()
});

export const createMessageSchema = z.object({
  channelId: idSchema,
  body: z.string().min(1).max(4000),
  parentMessageId: idSchema.optional().nullable(),
  attachmentIds: z.array(idSchema).default([])
});

export const createPollSchema = z.object({
  channelId: idSchema.optional().nullable(),
  eventId: idSchema.optional().nullable(),
  title: z.string().min(3).max(160),
  description: z.string().max(1000).optional().nullable(),
  type: z.enum(["single_choice", "multiple_choice", "ranked_choice"]),
  anonymous: z.boolean().default(false),
  deadline: z.string().datetime().optional().nullable(),
  options: z.array(z.string().min(1).max(120)).min(2).max(20)
});

export const voteSchema = z.object({
  pollId: idSchema,
  optionIds: z.array(idSchema).min(1),
  rankedOptionIds: z.array(idSchema).optional()
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).optional().nullable(),
  proposedTimes: z.array(z.object({
    startsAt: z.string().datetime(),
    endsAt: z.string().datetime()
  })).default([])
});

export const rsvpSchema = z.object({
  eventId: idSchema,
  status: z.enum(["going", "maybe", "not_going"]),
  note: z.string().max(400).optional().nullable()
});

export const createAvailabilityScheduleSchema = z.object({
  title: z.string().min(3).max(160),
  weekStartsOn: z.string().datetime(),
  slotMinutes: z.number().int().min(15).max(120).default(60),
  participantIds: z.array(idSchema).default([])
});

export const availabilityResponseSchema = z.object({
  scheduleId: idSchema,
  slotIds: z.array(idSchema)
});
