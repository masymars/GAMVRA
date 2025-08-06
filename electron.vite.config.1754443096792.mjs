// electron.vite.config.mjs
import { resolve } from "path";
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var electron_vite_config_default = defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: [
          "onnxruntime-node",
          "canvas",
          "wavefile",
          /\.node$/
        ]
      },
      assets: [
        {
          from: "./resources/gemma.js",
          to: "gemma.js"
        }
      ]
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        external: [
          "onnxruntime-node",
          "canvas",
          "wavefile",
          /\.node$/
        ]
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src")
      }
    },
    plugins: [
      tailwindcss(),
      react({
        // Configure React Fast Refresh correctly
        fastRefresh: true,
        // Exclude node_modules to improve performance
        exclude: /node_modules/
      })
    ],
    optimizeDeps: {
      exclude: [
        "onnxruntime-node",
        "canvas",
        "wavefile"
      ]
    },
    // Add additional configuration for Fast Refresh
    server: {
      hmr: true
    }
  }
});
export {
  electron_vite_config_default as default
};
