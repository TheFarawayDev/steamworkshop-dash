import { Wrench } from "lucide-react"
import { ModsDashboard } from "@/components/mods-dashboard"
import { NotificationManager } from "@/components/notification-manager"

export default function Page() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 sm:py-16">
      <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 shadow-lg shadow-primary/10 backdrop-blur-md">
            <Wrench className="size-7 text-primary/80" />
          </div>
          <div className="flex flex-col">
            <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              TheFarawayDev — Workshop
            </h1>
            <p className="text-sm text-muted-foreground">Your published mods & comments</p>
          </div>
        </div>
        <div className="flex items-center">
          <NotificationManager />
        </div>
      </header>

      <ModsDashboard />
    </main>
  )
}
