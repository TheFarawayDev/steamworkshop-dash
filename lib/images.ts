/**
 * Workshop previews can be multi-megabyte PNGs/GIFs. Steam's UGC image CDN can
 * resize on the fly, so request roughly the size we display.
 */
export function steamImage(url: string | null, width: number, height = Math.round((width * 9) / 16)): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (!/steamusercontent\.com$|steamuserimages-a\.akamaihd\.net$/.test(u.hostname) || u.search) return url
    u.searchParams.set("imw", String(width))
    u.searchParams.set("imh", String(height))
    u.searchParams.set("ima", "fit")
    u.searchParams.set("impolicy", "Letterbox")
    u.searchParams.set("imcolor", "#000000")
    u.searchParams.set("letterbox", "false")
    return u.toString()
  } catch {
    return url
  }
}
