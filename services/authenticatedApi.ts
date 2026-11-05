// HttpOnly same-origin cookies carry the session; JavaScript never receives it.
export const getAuthorizationHeaders = async (): Promise<Record<string, string>> => ({ 'Content-Type': 'application/json' });
