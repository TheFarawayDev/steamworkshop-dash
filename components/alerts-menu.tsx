"use client"

import { useState } from "react"
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import type { useAlerts } from "@/hooks/use-alerts"
import { formatRelative } from "@/lib/format"
import { cn } from "@/lib/utils"

type Alerts = ReturnType<typeof useAlerts>

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-lg px-1 py-1">
      <span className="flex flex-col">
        <span className="text-sm">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn("relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors", checked ? "bg-primary" : "bg-muted-foreground/30")}
      >
        <span className={cn("absolute left-0 top-0.5 size-4 rounded-full bg-background shadow transition-transform", checked ? "translate-x-4.5" : "translate-x-0.5")} />
      </button>
    </label>
  )
}

export function AlertsMenu({ alerts, watchedCount }: { alerts: Alerts; watchedCount: number }) {
  const { support, permission, state, background, enable, disable, setIncludeOwn } = alerts
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (support === "unknown" || support === "unsupported") return null

  const active = !!state?.enabled && permission === "granted"
  const Icon = active ? BellRing : permission === "denied" ? BellOff : Bell

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function test() {
    const reg = await navigator.serviceWorker.ready
    await reg.showNotification("Test notification", { body: "Alerts are working.", icon: "/icon-192.png", badge: "/badge-96.png", tag: "test" })
  }

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" aria-label={active ? "Alerts on" : "Alerts off"} className={cn("relative", active && "text-primary")} />}
      >
        <Icon className="size-[18px]" />
        {active && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-primary" />}
      </PopoverTrigger>
      <PopoverContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <PopoverTitle>Update alerts</PopoverTitle>
          <PopoverDescription>
            Get notified on this device when a watched mod is updated or gets new comments.
          </PopoverDescription>
        </div>

        {support === "needs-install" ? (
          <div className="flex gap-2 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
            <Smartphone className="mt-0.5 size-4 shrink-0" />
            On iPhone and iPad, add this site to your Home Screen (Share → Add to Home Screen) and open it from there.
          </div>
        ) : permission === "denied" ? (
          <p className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
            Notifications are blocked for this site. Allow them in your browser settings, then reload.
          </p>
        ) : active ? (
          <>
            <div className="flex flex-col gap-1 border-y py-2">
              <Toggle
                checked={!!state?.includeOwn}
                onChange={(v) => run(() => setIncludeOwn(v))}
                label="All my mods"
                hint={`Not just the ${watchedCount} watched`}
              />
            </div>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Checks</dt>
              <dd className="text-right">{background ? "Every ~30 min, even when closed" : "While the app is open"}</dd>
              <dt className="text-muted-foreground">Last check</dt>
              <dd className="text-right">{state?.lastCheck ? formatRelative(Math.floor(state.lastCheck / 1000)) : "—"}</dd>
            </dl>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => run(test)}>
                <Send /> Test
              </Button>
              <Button variant="ghost" size="sm" disabled={busy} onClick={() => run(disable)} className="text-muted-foreground">
                Turn off
              </Button>
            </div>
            {!background && (
              <p className="text-xs text-muted-foreground">
                Tip: install the app (Chrome or Edge on Android or desktop) to also get checks when it&apos;s closed.
              </p>
            )}
          </>
        ) : (
          <Button disabled={busy} onClick={() => run(enable)}>
            {busy ? <Loader2 className="animate-spin" /> : <Bell />} Turn on alerts
          </Button>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </PopoverContent>
    </Popover>
  )
}
