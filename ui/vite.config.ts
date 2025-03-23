import {defineConfig} from 'vite'
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve('src/'),
    }
  },
  build: {
    outDir: path.resolve(__dirname, '../api_go/ui/dist'),
    emptyOutDir: true
  },
  base:"/ui/",
})
