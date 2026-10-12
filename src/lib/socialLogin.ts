// Which "continue with" buttons the sign-in page shows. The shop's Integrations page switches each provider on or off; the
// site-settings API reports the result (a provider is only on with its credentials filled in), built into the page and
// refreshed live. Nothing about the credentials ever reaches the browser.

export type SocialProvider = "google" | "facebook";

export interface SocialLoginState {
  google?: boolean;
  facebook?: boolean;
}

/** The providers that are on, in the order the buttons appear. An API that sends nothing means none are on. */
export function enabledProviders(state: SocialLoginState | null | undefined): SocialProvider[] {
  const providers: SocialProvider[] = [];

  if (state?.google === true) providers.push("google");
  if (state?.facebook === true) providers.push("facebook");

  return providers;
}

/** The "or" between the buttons and the form only makes sense when there is at least one button above it. */
export function showSocialDivider(state: SocialLoginState | null | undefined): boolean {
  return enabledProviders(state).length > 0;
}

/** What the sign-in page says when someone arrives from a provider that is switched off. */
export function unavailableMessage(provider: string | null): string {
  const name = provider === "google" ? "Google" : provider === "facebook" ? "Facebook" : "that service";

  return `Signing in with ${name} is not available just now. Please sign in with your email and password.`;
}
