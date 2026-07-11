import { Wrench } from "lucide-react"
import { ModsDashboard } from "@/components/mods-dashboard"
import { NotificationManager } from "@/components/notification-manager"

export default function Page() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 sm:py-16">
      <header className="mb-8 sm:mb-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative flex size-12 sm:size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10 backdrop-blur-md">
            <Wrench className="size-6 sm:size-7 text-primary/80" />
          </div>
          <div className="flex min-w-0 flex-col">
            <h1 className="truncate bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-xl sm:text-3xl font-bold tracking-tight text-transparent">
              TheFarawayDev — Workshop
            </h1>
            <p className="truncate text-xs sm:text-sm text-muted-foreground">Your published mods & comments</p>
          </div>
        </div>
        <div className="flex items-center self-start sm:self-auto">
          <NotificationManager />
        </div>
      </header>

      <ModsDashboard />
    </main>
  )
}
