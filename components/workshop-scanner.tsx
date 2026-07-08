"use client"

import { useState } from "react"
import { Loader2, Search, Package, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ModsTable } from "@/components/mods-table"
import type { Mod } from "@/app/api/mods/route"

type Result = {
  steamId: string
  count: number
  mods: Mod[]
}

export function WorkshopScanner() {
  const [steamId, setSteamId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)

  async function scan(e: React.FormEvent) {
    e.preventDefault()
    if (!steamId.trim() || loading) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/mods?steamid=${encodeURIComponent(steamId.trim())}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.")
        return
      }
      setResult(data as Result)
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={scan} className="flex flex-col gap-3">
        <Label htmlFor="steamid" className="text-sm font-medium">
          Steam ID, profile name, or profile URL
        </Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="steamid"
            value={steamId}
            onChange={(e) => setSteamId(e.target.value)}
            placeholder="76561198000000000 or steamcommunity.com/id/yourname"
            className="flex-1"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" disabled={loading || !steamId.trim()}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Scanning
              </>
            ) : (
              <>
                <Search className="size-4" />
                Scan workshop
              </>
            )}
          </Button>
        </div>
      </form>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {result.count} {result.count === 1 ? "mod" : "mods"} found
            </h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              SteamID {result.steamId}
            </span>
          </div>

          {result.count === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
              <Package className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-balance">
                No published Workshop items were found. Make sure the profile and its
                Workshop items are set to public.
              </p>
            </div>
          ) : (
            <ModsTable mods={result.mods} />
          )}
        </div>
      )}
    </div>
  )
}
