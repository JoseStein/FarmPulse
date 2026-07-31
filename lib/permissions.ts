export type AppRole = "ADMIN" | "OPERATOR";
export type ProtectedAction = "VIEW" | "LOG_ACTIVITY" | "COMPLETE_TASK" | "CREATE_EXPENSE" | "MANAGE_SETTINGS" | "DELETE_FINANCIAL";
export function can(role: AppRole, action: ProtectedAction) {
  if (role === "ADMIN") return true;
  return ["VIEW", "LOG_ACTIVITY", "COMPLETE_TASK"].includes(action);
}
export function assertPermission(role: AppRole, action: ProtectedAction) {
  if (!can(role, action)) throw new Error("You do not have permission to perform this action.");
}
