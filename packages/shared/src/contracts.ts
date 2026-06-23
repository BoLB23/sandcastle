import { z } from "zod";

export const idSchema = z.string().cuid();
export const emailSchema = z.string().email().transform((value) => value.toLowerCase());
export const passwordSchema = z.string().min(12).max(128);
export const roleSchema = z.enum(["owner", "admin", "member"]);
export const defaultTimezone = "America/New_York" as const;
export const availabilityHours = ["19", "20", "21", "22"] as const;
export const availabilityDays = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday"
] as const;

export const authSessionUserSchema = z.object({
  id: idSchema,
  email: emailSchema,
  displayName: z.string().min(2).max(80),
  avatarUrl: z.string().url().nullable(),
  role: roleSchema
});

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema
});

export const createInviteSchema = z.object({
  email: emailSchema.optional(),
  expiresAt: z.string().datetime().optional()
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(16),
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().min(2).max(80)
});

export const createResetLinkSchema = z.object({
  userId: idSchema
});

export const acceptResetSchema = z.object({
  token: z.string().min(16),
  password: passwordSchema
});

export const inviteLookupResponseSchema = z.object({
  email: emailSchema.nullable(),
  expiresAt: z.string().datetime().nullable()
});

export const resetLinkResponseSchema = z.object({
  resetUrl: z.string().url()
});

export const profileSchema = z.object({
  displayName: z.string().min(2).max(80),
  avatarUrl: z.string().url().nullable().optional(),
  bio: z.string().max(280).nullable().optional()
});

export const channelSchema = z.object({
  id: idSchema,
  name: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/),
  topic: z.string().max(160).nullable(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createChannelSchema = z.object({
  name: z.string().min(2).max(48).regex(/^[a-z0-9-]+$/),
  topic: z.string().max(160).nullable().optional()
});

export const listMessagesQuerySchema = z.object({
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const channelMessageAuthorSchema = z.object({
  id: idSchema,
  displayName: z.string().min(2).max(80),
  avatarUrl: z.string().url().nullable()
});

export const messageSchema = z.object({
  id: idSchema,
  channelId: idSchema,
  authorId: idSchema,
  body: z.string().min(1).max(4000),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  editedAt: z.string().datetime().nullable(),
  deletedAt: z.string().datetime().nullable(),
  author: channelMessageAuthorSchema.optional()
});

export const createMessageSchema = z.object({
  channelId: idSchema,
  body: z.string().min(1).max(4000)
});

export const messagePageSchema = z.object({
  items: z.array(messageSchema),
  nextCursor: idSchema.nullable()
});

export const eventSchema = z.object({
  id: idSchema,
  organizerId: idSchema,
  title: z.string().min(3).max(160),
  description: z.string().max(2000).nullable(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(["scheduled", "cancelled"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(160),
  description: z.string().max(2000).nullable().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
}).refine((value) => new Date(value.endsAt) > new Date(value.startsAt), {
  message: "Event end must be after start"
});

const updateEventInputSchema = z.object({
  title: z.string().min(3).max(160).optional(),
  description: z.string().max(2000).nullable().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional(),
  status: z.enum(["scheduled", "cancelled"]).optional()
});

export const updateEventSchema = updateEventInputSchema.refine((value) => {
  if (!value.startsAt || !value.endsAt) return true;
  return new Date(value.endsAt) > new Date(value.startsAt);
}, {
  message: "Event end must be after start"
});

export const rsvpSchema = z.object({
  eventId: idSchema,
  status: z.enum(["going", "maybe", "not_going"]),
  note: z.string().max(400).nullable().optional()
});

export const availabilityDaySchema = z.enum(availabilityDays);
export const availabilityHourSchema = z.enum(availabilityHours);

export const availabilitySlotSchema = z.object({
  day: availabilityDaySchema,
  hour: availabilityHourSchema,
  available: z.boolean()
});

export const updateAvailabilitySchema = z.object({
  slots: z.array(availabilitySlotSchema).length(28)
});

export type AuthSessionUser = z.infer<typeof authSessionUserSchema>;
