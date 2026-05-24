import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let logoBuffer;
let logoDataUri;

export function getBrandLogoBuffer() {
  if (logoBuffer) return logoBuffer;

  const logoPath = join(process.cwd(), "public", "logo-aya-header.png");
  if (!existsSync(logoPath)) return null;

  logoBuffer = readFileSync(logoPath);
  return logoBuffer;
}

export function getBrandLogoDataUri() {
  if (logoDataUri) return logoDataUri;

  const buffer = getBrandLogoBuffer();
  if (!buffer) return null;

  logoDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
  return logoDataUri;
}
