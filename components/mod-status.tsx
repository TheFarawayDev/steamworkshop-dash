import { MessageSquare, RefreshCw, Sparkles } from "lucide-react"
import type { ModStatus } from "@/hooks/use-workshop-state"
import { cn } from "@/lib/utils"

const pill = "inline-flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold leading-none"

/** Compact "new / updated / +N comments" indicators. */
export function ModStatusPills({ status, className }: { status: ModStatus; className?: string }) {
  if (!status.isNew && !status.isUpdated && status.newComments === 0) return null
  return (
    <span className={cn("flex flex-wrap gap-1", className)}>
      {status.isNew && (
        <span className={cn(pill, "bg-fresh/15 text-fresh")}>
          <Sparkles className="size-3" /> New
        </span>
      )}
      {status.isUpdated && (
        <span className={cn(pill, "bg-updated/15 text-updated")}>
          <RefreshCw className="size-3" /> Updated
        </span>
      )}
      {status.newComments > 0 && (
        <span className={cn(pill, "bg-chatter/15 text-chatter")}>
          <MessageSquare className="size-3" /> +{status.newComments}
        </span>
      )}
    </span>
  )
}
