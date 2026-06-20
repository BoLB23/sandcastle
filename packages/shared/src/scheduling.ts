export type SchedulingAvailabilityStatus =
  | "preferred"
  | "available"
  | "if_needed"
  | "unavailable";

export interface SchedulingUser {
  id: string;
  displayName?: string;
}

export interface AvailabilityWindow {
  userId: string;
  start: Date;
  end: Date;
  status: SchedulingAvailabilityStatus;
}

export interface SchedulingRequest {
  users: SchedulingUser[];
  windows: AvailabilityWindow[];
  rangeStart: Date;
  rangeEnd: Date;
  durationMinutes: number;
  stepMinutes?: number;
  minimumAttendees?: number;
  minimumCoverage?: number;
  maxResults?: number;
}

export interface WindowParticipantScore {
  userId: string;
  displayName?: string;
  coverage: number;
  weight: number;
  status: SchedulingAvailabilityStatus;
}

export interface SchedulingRecommendation {
  start: Date;
  end: Date;
  score: number;
  attendeeCount: number;
  preferredCount: number;
  availableCount: number;
  ifNeededCount: number;
  participants: WindowParticipantScore[];
  summary: string;
}

const STATUS_WEIGHT: Record<SchedulingAvailabilityStatus, number> = {
  preferred: 1,
  available: 0.8,
  if_needed: 0.45,
  unavailable: 0,
};

const STATUS_ORDER: SchedulingAvailabilityStatus[] = [
  "preferred",
  "available",
  "if_needed",
  "unavailable",
];

function toMilliseconds(minutes: number): number {
  return minutes * 60_000;
}

function clampDate(date: Date, start: Date, end: Date): Date {
  if (date < start) return start;
  if (date > end) return end;
  return date;
}

function overlapDurationMs(
  leftStart: Date,
  leftEnd: Date,
  rightStart: Date,
  rightEnd: Date,
): number {
  const start = Math.max(leftStart.getTime(), rightStart.getTime());
  const end = Math.min(leftEnd.getTime(), rightEnd.getTime());
  return Math.max(0, end - start);
}

function deriveUserWindowScore(
  user: SchedulingUser,
  windowStart: Date,
  windowEnd: Date,
  availability: AvailabilityWindow[],
  durationMs: number,
): WindowParticipantScore {
  const overlapping = availability.filter(
    (slot) => overlapDurationMs(windowStart, windowEnd, slot.start, slot.end) > 0,
  );
  if (overlapping.length === 0) {
    return {
      userId: user.id,
      displayName: user.displayName,
      coverage: 0,
      weight: 0,
      status: "unavailable",
    };
  }

  const boundaries = new Set<number>([
    windowStart.getTime(),
    windowEnd.getTime(),
  ]);
  for (const slot of overlapping) {
    boundaries.add(Math.max(windowStart.getTime(), slot.start.getTime()));
    boundaries.add(Math.min(windowEnd.getTime(), slot.end.getTime()));
  }

  const orderedBoundaries = [...boundaries].sort((left, right) => left - right);
  let coveredMs = 0;
  let weightedCoverage = 0;
  let inferredStatus: SchedulingAvailabilityStatus = "unavailable";

  for (let index = 0; index < orderedBoundaries.length - 1; index += 1) {
    const segmentStart = orderedBoundaries[index];
    const segmentEnd = orderedBoundaries[index + 1];
    const segmentDuration = segmentEnd - segmentStart;
    if (segmentDuration <= 0) {
      continue;
    }

    let segmentStatus: SchedulingAvailabilityStatus = "unavailable";
    for (const status of STATUS_ORDER) {
      const isCovered = overlapping.some(
        (slot) =>
          slot.status === status &&
          slot.start.getTime() <= segmentStart &&
          slot.end.getTime() >= segmentEnd,
      );
      if (isCovered) {
        segmentStatus = status;
        break;
      }
    }

    if (segmentStatus !== "unavailable") {
      coveredMs += segmentDuration;
      weightedCoverage += segmentDuration * STATUS_WEIGHT[segmentStatus];
      if (inferredStatus === "unavailable") {
        inferredStatus = segmentStatus;
      }
    }
  }

  return {
    userId: user.id,
    displayName: user.displayName,
    coverage: Math.min(1, coveredMs / durationMs),
    weight: Math.min(1, weightedCoverage / durationMs),
    status: inferredStatus,
  };
}

function summarizeRecommendation(
  preferredCount: number,
  availableCount: number,
  ifNeededCount: number,
  attendeeCount: number,
): string {
  const segments = [`${attendeeCount} attendees`];
  if (preferredCount > 0) segments.push(`${preferredCount} preferred`);
  if (availableCount > 0) segments.push(`${availableCount} available`);
  if (ifNeededCount > 0) segments.push(`${ifNeededCount} if-needed`);
  return segments.join(", ");
}

export function rankSchedulingRecommendations(
  request: SchedulingRequest,
): SchedulingRecommendation[] {
  const stepMinutes = request.stepMinutes ?? 30;
  const minimumAttendees = request.minimumAttendees ?? Math.ceil(request.users.length * 0.6);
  const minimumCoverage = request.minimumCoverage ?? 0.75;
  const maxResults = request.maxResults ?? 5;
  const durationMs = toMilliseconds(request.durationMinutes);
  const stepMs = toMilliseconds(stepMinutes);

  if (request.users.length === 0) {
    return [];
  }

  if (request.rangeEnd <= request.rangeStart || durationMs <= 0 || stepMs <= 0) {
    return [];
  }

  const searchStart = request.rangeStart.getTime();
  const searchEnd = request.rangeEnd.getTime();
  if (searchEnd - searchStart < durationMs) {
    return [];
  }

  const windowsByUser = new Map<string, AvailabilityWindow[]>();
  for (const user of request.users) {
    windowsByUser.set(user.id, []);
  }

  for (const window of request.windows) {
    if (!windowsByUser.has(window.userId)) {
      continue;
    }

    const clampedStart = clampDate(window.start, request.rangeStart, request.rangeEnd);
    const clampedEnd = clampDate(window.end, request.rangeStart, request.rangeEnd);
    if (clampedEnd <= clampedStart) {
      continue;
    }

    windowsByUser.get(window.userId)?.push({
      ...window,
      start: clampedStart,
      end: clampedEnd,
    });
  }

  const ranked: SchedulingRecommendation[] = [];
  for (let cursor = searchStart; cursor + durationMs <= searchEnd; cursor += stepMs) {
    const start = new Date(cursor);
    const end = new Date(cursor + durationMs);
    const participants = request.users.map((user) =>
      deriveUserWindowScore(
        user,
        start,
        end,
        windowsByUser.get(user.id) ?? [],
        durationMs,
      ),
    );

    const accepted = participants.filter(
      (participant) => participant.coverage >= minimumCoverage && participant.weight > 0,
    );
    if (accepted.length < minimumAttendees) {
      continue;
    }

    const preferredCount = accepted.filter((participant) => participant.status === "preferred").length;
    const availableCount = accepted.filter((participant) => participant.status === "available").length;
    const ifNeededCount = accepted.filter((participant) => participant.status === "if_needed").length;
    const totalCoverage = accepted.reduce((sum, participant) => sum + participant.coverage, 0);
    const totalWeight = accepted.reduce((sum, participant) => sum + participant.weight, 0);
    const quorumScore = accepted.length / request.users.length;
    const coverageScore = totalCoverage / accepted.length;
    const preferenceScore = totalWeight / accepted.length;
    const score = Number(
      (
        quorumScore * 0.5 +
        coverageScore * 0.25 +
        preferenceScore * 0.25
      ).toFixed(6),
    );

    ranked.push({
      start,
      end,
      score,
      attendeeCount: accepted.length,
      preferredCount,
      availableCount,
      ifNeededCount,
      participants,
      summary: summarizeRecommendation(
        preferredCount,
        availableCount,
        ifNeededCount,
        accepted.length,
      ),
    });
  }

  ranked.sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.attendeeCount !== left.attendeeCount) {
      return right.attendeeCount - left.attendeeCount;
    }
    if (right.preferredCount !== left.preferredCount) {
      return right.preferredCount - left.preferredCount;
    }
    return left.start.getTime() - right.start.getTime();
  });

  return ranked.slice(0, maxResults);
}

export type AvailabilitySlot = {
  id: string;
  startsAt: Date;
  endsAt: Date;
};

export type AvailabilitySubmission = {
  userId: string;
  slotIds: string[];
};

export type RecommendedWindow = {
  slotIds: string[];
  startsAt: Date;
  endsAt: Date;
  availableUserIds: string[];
  missingUserIds: string[];
  score: number;
};

export function rankAvailabilityWindows(
  slots: AvailabilitySlot[],
  submissions: AvailabilitySubmission[],
  participantIds: string[],
  limit = 5,
): RecommendedWindow[] {
  const orderedSlots = [...slots].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  const usersBySlot = new Map<string, Set<string>>(orderedSlots.map((slot) => [slot.id, new Set<string>()]));

  for (const submission of submissions) {
    for (const slotId of submission.slotIds) {
      usersBySlot.get(slotId)?.add(submission.userId);
    }
  }

  const base = orderedSlots.map((slot) => {
    const availableUserIds = [...(usersBySlot.get(slot.id) ?? new Set<string>())];
    return {
      slotIds: [slot.id],
      startsAt: slot.startsAt,
      endsAt: slot.endsAt,
      availableUserIds,
      missingUserIds: participantIds.filter((id) => !availableUserIds.includes(id)),
      score: availableUserIds.length * 1000 + (slot.endsAt.getTime() - slot.startsAt.getTime()) / 60_000,
    };
  });

  const merged: RecommendedWindow[] = [];
  for (const window of base) {
    const previous = merged.at(-1);
    if (
      previous &&
      previous.endsAt.getTime() === window.startsAt.getTime() &&
      sameStringSet(previous.availableUserIds, window.availableUserIds)
    ) {
      previous.slotIds.push(...window.slotIds);
      previous.endsAt = window.endsAt;
      previous.score += (window.endsAt.getTime() - window.startsAt.getTime()) / 60_000;
    } else {
      merged.push({ ...window });
    }
  }

  return merged
    .filter((window) => window.availableUserIds.length > 0)
    .sort((a, b) => {
      if (b.availableUserIds.length !== a.availableUserIds.length) {
        return b.availableUserIds.length - a.availableUserIds.length;
      }
      const durationA = a.endsAt.getTime() - a.startsAt.getTime();
      const durationB = b.endsAt.getTime() - b.startsAt.getTime();
      if (durationB !== durationA) return durationB - durationA;
      return a.startsAt.getTime() - b.startsAt.getTime();
    })
    .slice(0, limit);
}

function sameStringSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}
