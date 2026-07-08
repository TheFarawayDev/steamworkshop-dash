import { Wrench } from "lucide-react"
import { ModsDashboard } from "@/components/mods-dashboard"

export default function Page() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:py-16">
      <header className="mb-8 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-4.5" />
          </span>
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              TheFarawayDev — Workshop
            </h1>
            <p className="text-sm text-muted-foreground">Your published mods & comments</p>
          </div>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Every mod you&apos;ve published, tagged by game and dated by post and update.
          Filter by game and expand any mod to read its comments at a glance.
        </p>
      </header>

      <ModsDashboard />
    </main>
  )
}
