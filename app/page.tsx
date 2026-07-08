import { Wrench } from "lucide-react"
import { WorkshopScanner } from "@/components/workshop-scanner"

export default function Page() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-12 sm:py-20">
      <header className="mb-10 flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wrench className="size-4.5" />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Workshop Mod Scanner
          </h1>
        </div>
        <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
          Enter your Steam ID to pull every mod you&apos;ve published to the Steam Workshop.
          Results are listed newest first, each tagged with the mod name and the game it&apos;s for.
        </p>
      </header>

      <WorkshopScanner />
    </main>
  )
}
