import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(async ({ command }) => {
  /* PORT is only required for dev/preview, not for production builds */
  const rawPort = process.env.PORT;
  const isBuild = command === "build";

  if (!rawPort && !isBuild) {
    throw new Error("PORT environment variable is required but was not provided.");
  }

  const port = rawPort ? Number(rawPort) : 3001;

  if (!isBuild && (Number.isNaN(port) || port <= 0)) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  const basePath = process.env.BASE_PATH ?? "/vendor";

  const devPlugins =
    process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            })
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : [];

  return {
    base: basePath,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      VitePWA({
        registerType: "autoUpdate",
        scope: basePath + "/",
        base: basePath + "/",
        manifest: {
          name: "AJKMart Vendor Portal",
          short_name: "Vendor",
          description: "AJKMart Vendor Portal — Manage your store, orders, products, and earnings",
          start_url: basePath + "/",
          scope: basePath + "/",
          display: "standalone",
          orientation: "portrait",
          background_color: "#1A56DB",
          theme_color: "#1A56DB",
          icons: [
            { src: basePath + "/favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
            { src: basePath + "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
            { src: basePath + "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
          ],
          categories: ["business"],
          lang: "en-PK",
          dir: "ltr",
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
          navigateFallback: basePath + "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          runtimeCaching: [
            {
              urlPattern: /^\/api\//,
              handler: "NetworkFirst",
              options: {
                cacheName: "vendor-api-cache",
                networkTimeoutSeconds: 3,
                expiration: { maxEntries: 50, maxAgeSeconds: 300 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "vendor-images-cache",
                expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
              handler: "CacheFirst",
              options: {
                cacheName: "vendor-fonts-cache",
                expiration: { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
      process.env.ANALYZE === "1" &&
        visualizer({ filename: "dist/bundle-stats.html", open: false, gzipSize: true }),
      ...devPlugins,
    ],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks: {
            "react-vendor": ["react", "react-dom"],
            router: ["wouter"],
            query: ["@tanstack/react-query"],
            "ui-icons": ["lucide-react"],
            charts: ["recharts"],
          },
        },
      },
      chunkSizeWarningLimit: 600,
    },
    server: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
      hmr: process.env.REPL_ID
        ? {
            clientPort: 443,
            protocol: "wss",
            host: process.env.REPLIT_DEV_DOMAIN,
          }
        : undefined,
      proxy: {
        "/api": {
          target:
            process.env.VITE_API_PROXY_TARGET ?? `http://127.0.0.1:${process.env.API_PORT ?? 8080}`,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
        deny: ["**/.*"],
      },
    },
    preview: {
      port,
      host: "0.0.0.0",
      allowedHosts: true,
    },
  };
});
