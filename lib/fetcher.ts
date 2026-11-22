export class FetchError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

/** SWR fetcher that surfaces API error messages instead of returning them as data. */
export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url)
  const body = (await res.json().catch(() => null)) as (T & { error?: string }) | null
  if (!res.ok || !body) {
    throw new FetchError(body?.error || `Request failed (${res.status}).`, res.status)
  }
  return body
}
