import nextVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextVitals,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "index.html", "panel.html", "admin_ejemplo.html", "test-desbloqueo.html"]
  }
];

export default config;
