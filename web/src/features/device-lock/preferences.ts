export function deviceLockCookie(userId: number) {
  return `books.device-lock.${userId}`;
}
