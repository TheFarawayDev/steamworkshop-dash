"use client"

import { useMemo, useState } from "react"
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { Mod } from "@/app/api/mods/route"

function formatDate(unix: number | null) {
  if (!unix) return "—"
  return new Date(unix * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

type SortDir = "asc" | "desc"

export function ModsTable({ mods }: { mods: Mod[] }) {
  const [dir, setDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => {
    const copy = [...mods]
    copy.sort((a, b) => {
      const av = a.createdAt ?? 0
      const bv = b.createdAt ?? 0
      return dir === "desc" ? bv - av : av - bv
    })
    return copy
  }, [mods, dir])

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[140px]">
              <button
                type="button"
                onClick={() => setDir((d) => (d === "desc" ? "asc" : "desc"))}
                className="flex items-center gap-1 font-medium text-foreground transition-colors hover:text-primary"
              >
                Date posted
                {dir === "desc" ? (
                  <ArrowDown className="size-3.5" />
                ) : (
                  <ArrowUp className="size-3.5" />
                )}
              </button>
            </TableHead>
            <TableHead>Mod</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Subscribers</TableHead>
            <TableHead className="w-[52px] text-right">Link</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((mod) => (
            <TableRow key={mod.id}>
              <TableCell className="align-top text-sm text-muted-foreground tabular-nums">
                {formatDate(mod.createdAt)}
              </TableCell>
              <TableCell className="align-top">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium leading-snug text-foreground text-pretty">
                    {mod.title}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="font-normal">
                      {mod.game}
                    </Badge>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-right align-top text-sm text-muted-foreground tabular-nums sm:table-cell">
                {mod.subscriptions.toLocaleString()}
              </TableCell>
              <TableCell className="text-right align-top">
                <a
                  href={mod.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Open ${mod.title} on Steam Workshop`}
                >
                  <ExternalLink className="size-4" />
                </a>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
