import { WorkshopDashboard } from "@/components/workshop-dashboard"
import { getWorkshop } from "@/lib/workshop"
import type { ModsResponse } from "@/lib/types"

// Prerender with live data and refresh in the background, so the first paint
// already has mods instead of a loading skeleton.
export const revalidate = 300

export default async function Page() {
  let initial: ModsResponse | null = null
  try {
    initial = await getWorkshop()
  } catch {
    // Missing key or Steam down: the client fetches and shows the error state.
  }
  return <WorkshopDashboard initial={initial} />
}
