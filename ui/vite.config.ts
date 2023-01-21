import {defineConfig} from 'vite'
import * as path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      src: path.resolve('src/'),
    },
  },
  base:"/ui/",
  build:{
    outDir: '../api/target/classes/public/ui'
  },
})
