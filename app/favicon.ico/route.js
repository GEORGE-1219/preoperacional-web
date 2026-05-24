export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="12" fill="#0066b3"/>
    <path d="M14 38h36l-4-12H22l-8 12Z" fill="#fff"/>
    <path d="M24 26h20l-2-6H28l-4 6Z" fill="#2d7a3e"/>
    <circle cx="23" cy="42" r="5" fill="#12324a"/>
    <circle cx="45" cy="42" r="5" fill="#12324a"/>
  </svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400"
    }
  });
}
