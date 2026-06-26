# Next Phase Feature Plan

This plan starts after the June 26 UX polish pass. The current MVP remains invite-only auth, realtime channels, RSVP events, and fixed evening availability.

## UX Comparison Notes

Reference products reviewed: Discord public product pages, WhatsApp public product pages, and common current messaging patterns from Messenger, iMessage, and Google Messages.

- Modern social and messaging apps make the primary social object obvious. Discord centers persistent group spaces and channel context; Sandcastle should make the friend group, active channel, and current plan state visible without feeling like an admin dashboard.
- Friendly messaging products rely on message bubbles, compact author identity, clear active conversations, and low-friction compose areas. Sandcastle channels should keep moving away from email-like message cards.
- Consumer chat apps use soft but deliberate status cues: presence, unread state, reactions, RSVP chips, and pinned items. Sandcastle should use these cues for plans and availability before adding broad feature surface.
- WhatsApp and iMessage keep group actions simple and immediate. Sandcastle should avoid complex management screens until there is a clear daily workflow for chat, events, and availability.
- The visual direction should stay warm, private, and app-like: mixed dark surfaces, amber action cues, cyan/emerald social accents, stable cards, and touch-friendly controls.

Reference links:

- https://discord.com/
- https://www.whatsapp.com/
- https://www.messenger.com/

## Phase 1: Make The Existing MVP Feel Social

Goal: turn the current functional MVP into a chat-native private group room.

- Add message reactions with a small fixed set first: yes, maybe, laugh, and heart.
- Add per-channel unread and last-message preview state in the channel list.
- Add optimistic message send state and clearer failure recovery in the compose area.
- Add lightweight member identity: avatar initials, profile color, and member directory.
- Add event cards that surface date, RSVP totals, and the user's current RSVP without opening details.

Suggested delegation:

- Mini task: avatar initial/profile color helpers and presentational reuse.
- Medium task: message reaction schema, API routes, and channel UI integration.
- Medium task: unread/last-message read model and channel list UX.

## Phase 2: Availability Becomes Group Planning

Goal: make availability useful for deciding what to do next, not just saving a personal grid.

- Add group availability heatmap by week.
- Add one-off week overrides while preserving the recurring default grid.
- Add "best windows" suggestions on event creation.
- Show who is available in a selected slot.
- Let event organizers propose a time from availability and convert it into an event.

Suggested delegation:

- Mini task: heatmap visual states and empty/loading/error styling.
- Medium task: week override schema and API.
- Hard task: best-window computation and event creation integration.

## Phase 3: Event Lifecycle

Goal: make events feel like living group plans.

- Add comments or a linked event discussion stream.
- Add RSVP notes and guest count summaries.
- Add event edit history or visible last-updated metadata.
- Add calendar export per member.
- Add reminders through email first, then consider push or PWA notifications.

Suggested delegation:

- Mini task: RSVP summary chips and event card polish.
- Medium task: RSVP notes end to end.
- Medium task: ICS feed/token model.

## Phase 4: Onboarding And Admin

Goal: reduce owner/admin manual work without expanding public access.

- Build owner/admin invite management UI.
- Build password reset management UI.
- Add member role management with guardrails.
- Add first-run seed/admin verification in deployment docs.
- Add clear empty states when a group has no channels, events, or availability yet.

Suggested delegation:

- Mini task: empty-state components and admin list styling.
- Medium task: invite management UI over existing API.
- Medium task: reset-link management UI over existing API.

## Phase 5: Reliability And Deployment Confidence

Goal: keep UX work from regressing core flows.

- Add served-app browser smoke coverage for login, channel post, event create/RSVP, and availability save.
- Add a lightweight live smoke script that uses the deployed tag metadata endpoint.
- Keep immutable image tags and expose the deployed tag in the app shell.
- Track manual smoke cleanup for test messages and test events.
- Add visual regression snapshots once the UI stabilizes.

Suggested delegation:

- Mini task: smoke-test README and fixture cleanup checklist.
- Medium task: Playwright or equivalent served-app smoke coverage.
- Medium task: live smoke script wired to `/meta` and health endpoints.

## Current Priority Order

1. Message reactions and unread channel cues.
2. Group availability heatmap with week overrides.
3. Event card summaries plus RSVP notes.
4. Owner/admin invite and reset management screens.
5. Served-app browser smoke tests.
