
import { verbose } from 'genkit';

const requestCounts = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 15; // Max 15 requests per minute per user

export function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(userId) || [];

  // Filter out requests that are outside the time window
  const recentRequests = userRequests.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW
  );

  if (recentRequests.length >= RATE_LIMIT_MAX_REQUESTS) {
    verbose(`[RATE LIMIT] User ${userId} has been rate-limited.`);
    return true;
  }

  // Add the current request timestamp
  recentRequests.push(now);
  requestCounts.set(userId, recentRequests);

  return false;
}
