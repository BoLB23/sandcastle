"use client";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const REALTIME_URL = process.env.NEXT_PUBLIC_REALTIME_URL ?? "ws://localhost:4001/ws";

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new ApiError(response.status, body?.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export type SessionResponse = {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    role: "owner" | "admin" | "member";
  };
  profile: {
    bio?: string | null;
    timezone: string;
  } | null;
};

export type Channel = {
  id: string;
  name: string;
  topic: string | null;
  isDefault: boolean;
};

export type Message = {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  author?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
};

export type MessagePage = {
  items: Message[];
  nextCursor: string | null;
};

export type EventRecord = {
  id: string;
  organizerId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  status: "scheduled" | "cancelled";
  createdAt: string;
  updatedAt: string;
  organizer?: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
  };
  rsvps?: Array<{
    userId: string;
    status: "going" | "maybe" | "not_going";
    note: string | null;
    updatedAt: string;
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
  }>;
};

export type AvailabilityResponse = {
  timezone: "America/New_York";
  startHourEt: 19;
  slotMinutes: 60;
  slots: Array<{
    day: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
    hour: "19" | "20" | "21" | "22";
    available: boolean;
  }>;
};
