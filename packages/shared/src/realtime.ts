import { z } from "zod";

export const realtimeTopicSchema = z.enum([
  "channel",
  "thread",
  "poll",
  "event",
  "availability",
  "notification",
  "presence"
]);

export const realtimeEnvelopeSchema = z.object({
  id: z.string(),
  topic: realtimeTopicSchema,
  action: z.string().min(1),
  resourceId: z.string(),
  actorId: z.string().optional(),
  occurredAt: z.string().datetime(),
  payload: z.unknown()
});

export type RealtimeTopic = z.infer<typeof realtimeTopicSchema>;
export type RealtimeEnvelope = z.infer<typeof realtimeEnvelopeSchema>;
