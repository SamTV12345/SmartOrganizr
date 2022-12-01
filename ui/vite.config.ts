import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base:"/ui/",
  build:{
    outDir: '../api/target/classes/public/ui'
  },
  plugins: [react()]
})
