import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
  host: "0.0.0.0",
  port: 3000,
  allowedHosts: true,
},
  preview: {
    port: 3000,
    host: "0.0.0.0",
    allowedHosts: [
      "localhost",
      "127.0.0.1",
      "gtmreach.proplusdata.co",
      "www.gtmreach.proplusdata.co",
    ],
  },
});

