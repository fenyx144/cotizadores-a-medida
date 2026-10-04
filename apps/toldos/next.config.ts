import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El paquete compartido se publica como TypeScript: Next lo compila.
  transpilePackages: ["@portafolio/core"],
  // Las fotos se suben vía FormData: subimos el límite del cuerpo de las acciones.
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
};

export default nextConfig;
