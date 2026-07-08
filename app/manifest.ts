import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TheFarawayDev — Workshop",
    short_name: "Workshop",
    description:
      "Your published Steam Workshop mods, tagged by game, dated by post/update, with comments at a glance.",
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#141414",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-512.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
