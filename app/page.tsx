import Image from "next/image"
import { ModsDashboard } from "@/components/mods-dashboard"

export default function Page() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-4 py-12 sm:py-16">
      <header className="mb-10 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative flex size-14 items-center justify-center overflow-hidden rounded-xl border border-primary/20 bg-black/40 shadow-lg shadow-primary/20 backdrop-blur-md">
            <Image src="/logo.png" alt="Logo" fill className="object-cover" />
          </div>
          <div className="flex flex-col">
            <h1 className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
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
