export const roles = ["owner", "admin", "member"] as const;

export type Role = (typeof roles)[number];

export const permissionActions = [
  "invites.manage",
  "channels.manage",
  "events.manage",
  "resets.manage",
  "messages.create",
  "events.create",
  "rsvps.manage",
  "availability.manage"
] as const;

export type PermissionAction = (typeof permissionActions)[number];

export const rolePermissions: Record<Role, readonly PermissionAction[]> = {
  owner: permissionActions,
  admin: permissionActions,
  member: ["messages.create", "events.create", "rsvps.manage", "availability.manage"]
};

export function roleCan(role: Role, action: PermissionAction) {
  return rolePermissions[role].includes(action);
}
