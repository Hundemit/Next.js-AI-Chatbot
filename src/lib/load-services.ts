import { clearTrackingCookies, type ConsentPreferences } from "@/lib/consent";

export interface LoadedServices {
  analytics: boolean;
  marketing: boolean;
}

export function loadServices(consent: ConsentPreferences | null): LoadedServices {
  if (!consent) {
    clearTrackingCookies();
    return {
      analytics: false,
      marketing: false,
    };
  }

  if (!consent.analytics) {
    clearTrackingCookies();
  }

  return {
    analytics: consent.analytics,
    marketing: consent.marketing,
  };
}