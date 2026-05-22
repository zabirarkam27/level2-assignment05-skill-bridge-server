export function getHttpStatusFromMessage(message = "") {
  const normalized = message.toLowerCase();

  if (normalized.includes("unauthorized")) return 401;
  if (
    normalized.includes("forbidden") ||
    normalized.includes("permission") ||
    normalized.includes("pending admin approval") ||
    normalized.includes("suspended") ||
    normalized.includes("rejected")
  ) {
    return 403;
  }
  if (normalized.includes("not found")) return 404;
  if (
    normalized.includes("already exists") ||
    normalized.includes("already booked") ||
    normalized.includes("already reviewed")
  ) {
    return 409;
  }

  return 400;
}
