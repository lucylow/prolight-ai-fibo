import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import mdx from "@mdx-js/rollup";
import { execSync } from "child_process";

// Get git commit hash for build identification
function getGitCommitHash() {
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    return "unknown";
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const commitHash = getGitCommitHash();
  const buildTime = new Date().toISOString();
  
  return {
    server: {
      host: "::",
      port: 8080,
    },
    build: {
      // Ensure fresh builds
      emptyOutDir: true,
      // Disable source maps in production for smaller builds
      sourcemap: mode === "development",
      // Add hash to filenames for better cache busting
      rollupOptions: {
        output: {
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
        },
      },
    },
    plugins: [
      mdx({
        // MDX plugin configuration
      }),
      react(), 
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      // Inject build timestamp for cache busting and verification
      __BUILD_TIME__: JSON.stringify(buildTime),
      __BUILD_VERSION__: JSON.stringify(process.env.npm_package_version || "dev"),
      __COMMIT_HASH__: JSON.stringify(commitHash),
    },
  };
});
