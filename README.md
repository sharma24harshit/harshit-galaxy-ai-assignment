import ReactFlow from "reactflow";  - old version

import ReactFlow from "@xyflow/react";  - new version
import "@xyflow/react/dist/style.css";


-----------


If you want the last bit of “exact parity”, the next improvement is implementing Upload Image/Video nodes so they actually upload to Transloadit from the UI and populate node.data.outputs.image_url/video_url (then the orchestrator can fully run the sample workflow end-to-end).

{
  "name": "galaxy_ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@clerk/nextjs": "^6.32.0",
    "@google/generative-ai": "^0.24.1",
    "@prisma/client": "^6.17.0",
    "@trigger.dev/sdk": "^4.4.4",
    "ffmpeg-static": "^5.2.0",
    "lucide-react": "^0.542.0",
    "next": "16.2.4",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "transloadit": "^1.3.0",
    "zustand": "^5.0.8",
    "zod": "^4.1.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "16.2.4",
    "prisma": "^6.17.0",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
