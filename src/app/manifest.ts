import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Recipe Book",
    short_name: "Recipes",
    description: "Our family recipe collection",
    start_url: "/",
    display: "standalone",
    background_color: "#fef7ee",
    theme_color: "#ed7519",
    orientation: "portrait",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
