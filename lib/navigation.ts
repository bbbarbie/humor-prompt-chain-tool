export const STUDIO_APP_NAME = "Humor Flavor Studio";
export const STUDIO_HOME_PATH = "/";
export const STUDIO_AUTH_CALLBACK_PATH = "/auth/callback";
export const STUDIO_LOGIN_PATH = "/login";
export const STUDIO_UNAUTHORIZED_PATH = "/unauthorized";

export function buildStudioAuthCallbackUrl(origin: string) {
  return new URL(STUDIO_AUTH_CALLBACK_PATH, origin).toString();
}
