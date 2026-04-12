import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Recipe Book",
    short_name: "Recipes",
    description: "Our family recipe collection",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fef7ee",
    theme_color: "#ed7519",
    orientation: "portrait",
    share_target: {
      action: "/recipes/new",
      method: "GET",
      params: {
        url: "share_url",
        title: "share_title",
        text: "share_text",
      },
    },
    icons: [
      {
        src: "/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
