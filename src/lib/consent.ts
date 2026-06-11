export type ConsentCategory = "essential" | "analytics" | "marketing";

export interface ConsentPreferences {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
  expiresAt: number;
  version: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_TTL_DAYS = 180;
export const CONSENT_STORAGE_KEY = "cookie_consent";
export const CONSENT_COOKIE_NAME = "cookie_consent";
export const TRACKING_COOKIE_PREFIXES = ["_ga", "_gid", "_gat", "_fbp"];

const CONSENT_TTL_MS = CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000;

function now() {
  return Date.now();
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function createConsentPreferences(
  partial?: Pick<ConsentPreferences, "analytics" | "marketing">,
): ConsentPreferences {
  const timestamp = now();

  return {
    essential: true,
    analytics: partial?.analytics ?? false,
    marketing: partial?.marketing ?? false,
    timestamp,
    expiresAt: timestamp + CONSENT_TTL_MS,
    version: CONSENT_VERSION,
  };
}

export function isConsentExpired(consent: ConsentPreferences | null | undefined) {
  if (!consent) {
    return true;
  }

  return consent.version !== CONSENT_VERSION || consent.expiresAt <= now();
}

export function parseConsentValue(rawValue: string | null | undefined) {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(safeDecode(rawValue)) as Partial<ConsentPreferences>;

    if (
      parsed?.essential !== true ||
      typeof parsed.analytics !== "boolean" ||
      typeof parsed.marketing !== "boolean" ||
      typeof parsed.timestamp !== "number" ||
      typeof parsed.expiresAt !== "number" ||
      typeof parsed.version !== "number"
    ) {
      return null;
    }

    return parsed as ConsentPreferences;
  } catch {
    return null;
  }
}

export function readConsentFromStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return parseConsentValue(window.localStorage.getItem(CONSENT_STORAGE_KEY));
}

export function readConsentFromCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookieValue = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(`${CONSENT_COOKIE_NAME}=`))
    ?.split("=")
    .slice(1)
    .join("=");

  return parseConsentValue(cookieValue ?? null);
}

export function persistConsent(consent: ConsentPreferences) {
  if (typeof window === "undefined") {
    return;
  }

  const serialized = JSON.stringify(consent);
  window.localStorage.setItem(CONSENT_STORAGE_KEY, serialized);

  const maxAge = Math.floor((consent.expiresAt - consent.timestamp) / 1000);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";

  document.cookie = `${CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; Path=/; Max-Age=${Math.max(maxAge, 1)}; SameSite=Lax${secure}`;
}

export function clearConsentStorage() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  document.cookie = `${CONSENT_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  document.cookie = `${name}=; Path=/; Max-Age=0`;
}

export function clearTrackingCookies() {
  if (typeof document === "undefined") {
    return;
  }

  const cookieNames = document.cookie
    .split(";")
    .map((entry) => entry.split("=")[0]?.trim())
    .filter(Boolean) as string[];

  for (const cookieName of cookieNames) {
    if (
      TRACKING_COOKIE_PREFIXES.some(
        (prefix) => cookieName === prefix || cookieName.startsWith(`${prefix}_`),
      )
    ) {
      deleteCookie(cookieName);
    }
  }
}