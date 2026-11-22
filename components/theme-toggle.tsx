"use client"

import { Monitor, Moon, Sun } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { useLocalStorage } from "@/hooks/use-local-storage"

type Theme = "system" | "light" | "dark"
const ORDER: Theme[] = ["system", "light", "dark"]
const isTheme = (v: unknown): v is Theme => typeof v === "string" && (ORDER as string[]).includes(v)

/** Applies the theme class; mirrored by the inline script in layout.tsx to avoid a flash. */
function apply(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#14171d" : "#f5f7fa")
}

export function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage<Theme>("theme", "system", isTheme)

  useEffect(() => {
    apply(theme)
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => apply("system")
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={`Theme: ${theme}. Switch to ${next}.`} title={`Theme: ${theme}`}>
      <Icon className="size-[18px]" />
    </Button>
  )
}
