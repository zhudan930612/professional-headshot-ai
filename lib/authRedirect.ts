export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return '/';
  try {
    const url = new URL(value, 'https://return.invalid');
    return url.origin === 'https://return.invalid' ? `${url.pathname}${url.search}${url.hash}` : '/';
  } catch { return '/'; }
}
