export default function manifest() {
  return {
    name: "Preoperacional A&A Comunicaciones",
    short_name: "Preoperacional",
    description: "Registro preoperacional, novedades de recorrido y panel operativo de A&A Comunicaciones.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f1f6fb",
    theme_color: "#0066b3",
    categories: ["business", "productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "Nuevo preoperacional",
        short_name: "Preoperacional",
        description: "Abrir el formulario preoperacional.",
        url: "/",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      },
      {
        name: "Panel administrativo",
        short_name: "Panel",
        description: "Abrir el panel administrativo.",
        url: "/panel",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }]
      }
    ]
  };
}
