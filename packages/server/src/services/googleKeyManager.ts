import { env } from "../config/env";
import pino from "pino";

const logger = pino({ name: "GoogleKeyManager" });

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface KeyHealth {
  index: number;
  available: boolean;
  masked: string;
  lastError?: string;
  failures: number;
  inCooldown: boolean;
}

export interface QuotaErrorDetails {
  isQuotaError: boolean;
  isRateLimit: boolean;
  isDailyQuota: boolean;
  message: string;
}

/**
 * Robust fallback manager for Google API keys.
 *
 * Handles both per-minute rate limits (5 RPM on free tier) and daily quotas
 * by retrying with exponential backoff before falling back to a secondary key.
 *
 * Note: Gemini quotas are project-level. Two keys from the *same* project share
 * the same RPM/RPD budget. Fallback only helps when keys belong to different
 * projects, or when one key has simply hit a transient per-minute burst.
 */
class GoogleKeyManager {
  private keys: string[];
  private activeIndex = 0;
  private keyFailures: number[];
  private keyLastError: (string | undefined)[];
  private keyCooldownUntil: number[];

  // Free-tier Gemini 3.6 Flash: 5 RPM. Backoff gives the limit window time to reset.
  private readonly maxRetriesPerKey = 2;
  private readonly baseDelayMs = 1500;
  private readonly cooldownMs = 60_000;

  constructor() {
    this.keys = [env.GOOGLE_API_KEY];
    if (env.GOOGLE_API_KEY2) {
      this.keys.push(env.GOOGLE_API_KEY2);
    }
    this.keyFailures = new Array(this.keys.length).fill(0);
    this.keyLastError = new Array(this.keys.length).fill(undefined);
    this.keyCooldownUntil = new Array(this.keys.length).fill(0);

    logger.info(
      { keyCount: this.keys.length, activeIndex: this.activeIndex },
      "Google API key manager initialized",
    );
  }

  get activeKey(): string {
    return this.keys[this.activeIndex];
  }

  get activeKeyIndex(): number {
    return this.activeIndex;
  }

  get hasFallback(): boolean {
    return this.keys.length > 1;
  }

  /**
   * Mask an API key for safe logging.
   */
  private maskKey(key: string): string {
    if (key.length <= 8) return "***";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  }

  /**
   * Classify an error as quota/rate-limit related and determine if it's
   * a per-minute rate limit or a daily quota exhaustion.
   */
  classifyError(error: unknown): QuotaErrorDetails {
    const message = (error as Error).message || String(error);
    const lower = message.toLowerCase();

    const isRateLimit =
      lower.includes("429") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests") ||
      lower.includes("per minute") ||
      lower.includes("rpm") ||
      lower.includes("resource has been exhausted");

    const isDailyQuota =
      lower.includes("quota") &&
      (lower.includes("daily") ||
        lower.includes("per day") ||
        lower.includes("rpd"));

    return {
      isQuotaError: isRateLimit || isDailyQuota || lower.includes("quota") || lower.includes("exceeded"),
      isRateLimit,
      isDailyQuota,
      message,
    };
  }

  /**
   * Mark a key as having failed. After repeated failures it enters a cooldown.
   */
  private recordFailure(index: number, errorMessage: string): void {
    this.keyFailures[index] += 1;
    this.keyLastError[index] = errorMessage;

    if (this.keyFailures[index] >= this.maxRetriesPerKey) {
      this.keyCooldownUntil[index] = Date.now() + this.cooldownMs;
      logger.warn(
        { index, maskedKey: this.maskKey(this.keys[index]) },
        "Key entered cooldown due to repeated failures",
      );
    }
  }

  /**
   * Mark a key as having succeeded, resetting its failure state.
   */
  private recordSuccess(index: number): void {
    if (this.keyFailures[index] > 0) {
      this.keyFailures[index] = 0;
      this.keyLastError[index] = undefined;
      this.keyCooldownUntil[index] = 0;
      logger.info(
        { index, maskedKey: this.maskKey(this.keys[index]) },
        "Key recovered and failure state reset",
      );
    }
  }

  /**
   * Pick the best key index to try next: prefer keys not in cooldown,
   * starting from the active key.
   */
  private pickBestKeyIndex(): number {
    const now = Date.now();
    for (let offset = 0; offset < this.keys.length; offset += 1) {
      const idx = (this.activeIndex + offset) % this.keys.length;
      if (now >= this.keyCooldownUntil[idx]) {
        return idx;
      }
    }
    // All keys cooling down; fall back to active key anyway
    return this.activeIndex;
  }

  /**
   * Execute an operation with automatic fallback and exponential backoff.
   *
   * Strategy:
   * 1. Try the best available key.
   * 2. On rate-limit (429/RPM), wait with exponential backoff and retry the same key.
   * 3. After repeated failures on one key, rotate to the next non-cooled-down key.
   * 4. If all keys fail, throw a descriptive error.
   */
  async withFallback<T>(operation: (apiKey: string) => Promise<T>): Promise<T> {
    const visitedIndices = new Set<number>();

    while (visitedIndices.size < this.keys.length) {
      const keyIndex = this.pickBestKeyIndex();
      visitedIndices.add(keyIndex);
      this.activeIndex = keyIndex;

      const maskedKey = this.maskKey(this.keys[keyIndex]);
      logger.debug(
        { activeIndex: keyIndex, maskedKey },
        "Attempting Google API request",
      );

      for (let attempt = 0; attempt <= this.maxRetriesPerKey; attempt += 1) {
        try {
          const result = await operation(this.keys[keyIndex]);
          this.recordSuccess(keyIndex);
          return result;
        } catch (error) {
          const details = this.classifyError(error);

          if (details.isQuotaError) {
            this.recordFailure(keyIndex, details.message);

            const isLastAttemptForKey = attempt === this.maxRetriesPerKey;
            const isLastKey = visitedIndices.size === this.keys.length;

            if (isLastAttemptForKey) {
              logger.warn(
                {
                  activeIndex: keyIndex,
                  maskedKey,
                  error: details.message,
                  isRateLimit: details.isRateLimit,
                  isDailyQuota: details.isDailyQuota,
                },
                details.isRateLimit
                  ? "Google API rate-limit hit, rotating key"
                  : "Google API quota exhausted, rotating key",
              );
              break; // rotate to next key
            }

            const delay = this.baseDelayMs * 2 ** attempt + Math.random() * 500;
            logger.info(
              {
                activeIndex: keyIndex,
                maskedKey,
                attempt: attempt + 1,
                delayMs: Math.round(delay),
                error: details.message,
              },
              "Google API quota/rate-limit hit, backing off before retry",
            );
            await sleep(delay);
            continue;
          }

          // Non-quota error: log and throw immediately without rotating keys
          logger.error(
            { activeIndex: keyIndex, maskedKey, error: details.message },
            "Google API request failed with non-quota error",
          );
          throw error;
        }
      }
    }

    // All keys exhausted
    const summary = this.keys.map((k, i) => ({
      index: i,
      maskedKey: this.maskKey(k),
      failures: this.keyFailures[i],
      lastError: this.keyLastError[i],
    }));

    logger.error({ keys: summary }, "All Google API keys failed");
    throw new Error(
      "All configured Google API keys failed. " +
        "Likely causes: (1) both keys hit the free-tier daily limit, " +
        "(2) both keys belong to the same project and hit the per-minute rate limit, " +
        "or (3) the keys are invalid. Please verify your GOOGLE_API_KEY / GOOGLE_API_KEY2 " +
        "values, ensure they are from different projects if you want fallback to help, " +
        "or wait a few minutes and try again.",
    );
  }

  /**
   * Get a health snapshot of each configured key (safe to expose via API).
   */
  getKeyHealth(): KeyHealth[] {
    const now = Date.now();
    return this.keys.map((k, i) => ({
      index: i,
      available: now >= this.keyCooldownUntil[i],
      masked: this.maskKey(k),
      failures: this.keyFailures[i],
      inCooldown: now < this.keyCooldownUntil[i],
      lastError: this.keyLastError[i],
    }));
  }

  /**
   * Reset the active key back to the primary key and clear failure state.
   * Useful after a known quota reset.
   */
  resetToPrimary(): void {
    this.activeIndex = 0;
    this.keyFailures.fill(0);
    this.keyLastError.fill(undefined);
    this.keyCooldownUntil.fill(0);
    logger.info("Reset to primary Google API key and cleared failure state");
  }
}

export const googleKeyManager = new GoogleKeyManager();
