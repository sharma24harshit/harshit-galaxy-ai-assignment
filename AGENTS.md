<!-- BEGIN:nextjs-agent-rules -->
**Project Overview**  
Develop an app called “Nextflow” that is a pixel-perfect UI/UX clone of [Krea.ai](http://Krea.ai) workflow builder, focused exclusively on LLM (Large language model) workflows. The application must use ReactFlow for the visual workflow canvas, integrate with Google’s Gemini API for LLM execution via Trigger.dev, and demonstrate engineering excellence with type-safe API’s, proper state management, authentication, and seamless user experience.

**Functional Requirements**

**Core workflow Interface(UI/UX)**

| Requirements | Description |
| :---- | :---- |
| **Pixel-perfect UI** | Match Krea’s UI exactly \- background, layout, spacing, fonts, node designs, animations, and scrolling behavior |
| **Left Sidebar** | Collapsible sidebar with search and a quick access section for node types |
| **Right Sidebar** | Workflow History Panel- shows a list of all workflow runs with timestamps |
| **Workflow Canvas** | Main area using React Flow with dot grid background, smooth panning/zooming, and MiniMap |
| **Responsive Design** | Full responsiveness with proper overflow handling |

 Node Types ( Sidebar Buttons)

The left sidebar must contain exactly 6 buttons under Quick Access

1. Text Node  
- Simple text input with a textarea  
- Output handle for text data

2. Upload Image Node  
- File upload via Transloadit  
- Accepts jpg, jpeg, png, webp, gif  
- Image preview after upload  
- Output handle for image URL

3. Upload video Node  
- File upload via Transloadit  
- Accepts mp4, mov, webp, m4v  
- Video player preview after upload  
- Output handle for video URL

4. Run any LLM Node  
- Model selector dropdown  
- Accepts system prompt, user message, and images( supports multiple) as inputs  
- Execute via Trigger.dev task

5. Crop Image Node  
- Accepts image as Input  
- Configurable crop parameters (x%, y%, width%, height%)  
- Execute via FFmpeg on Trigger.dev

6. Extract Frame from video Node  
- Accepts video URL input  
- Configurable timestamp parameter( second or percentage)  
- Extracts a single frame as an image  
- Execute via FFmpeg on Trigger.dev

**Authentication**

| Requirements | Description |
| :---- | :---- |
| **Auth Provider** | Clerk for all authentication |
| **Sign In/Sign Up**  | Clerk-hosted UI or embedded components |
| **Protected Routes**  | All workflow routes require authentication |
| **User Association** | Workflows and history must be scoped to the authenticated user  |

**LLM Integration (Google Gemini APi via Trigger.dev)**

| Requirements | Description |
| :---- | :---- |
| **API Provider** | Google Generative AI (Gemini) \- Free tier available via Google AI Studio |
| **Execution**  | All LLM calls MUST run as Trigger.dev tasks |
| **Supported Models** | https://ai.google.dev/gemini-api/docs/models |
| **Vision support** | Accept images for multimodal prompts |
| **System prompts** | Support optional system instructions per request |
| **Input Chaining** | Aggregate text/image inputs from connected nodes into the prompt |
| **Error handling** | Graceful error display with user-friendly messages |
| **Loading states** | Visual feedback during API calls (spinner, disabled button) |
| **Running Node Effect** | Nodes currently executing must have a pulsating glow effect to indicate active processing |

**LLM Node Specification**  
**Input handles (3):**

1. system\_prompt **\-** Accepts connection from text Node (optional)  
2. user\_message \- Accepts connection from Text Node (required)  
3. Images \- Acceptsd connection from image Node(s) (optional support multiple)

**Output handle (1):**

- output  \- text response from LLM


**Result Display:**

- **Results must be displayed directly on the LLm Node itself –** do NOT create a separate output node to show results. The LLM node should expand or show the response inline after execution.

**Crop Image Node Specification (FFmpeg on Trigger.dev)**

| Requirements | Description |
| :---- | :---- |
| **Provider** | Internal (FFmpeg via Trigger.dev task) |
| **Output** | Cropped image URL ( uploaded via Transloadit ) |

**Input handles (5):**

- image\_url \- Required, accepts image types (jpg, jpeg, png, webp, gif)  
- x\_percent \- Optional accepts text/number (0-100) default: 0   
- y\_percent \- Optional accepts text/number (0-100) default: 0   
- width\_percent \- Optional accepts text/number (0-100) default: 100   
- height\_percent \- Optional accepts text/number (0-100) default: 100 

**Output handle (1):**

- output – Cropped image URL  
  


---

**Extract Frame from Video Node Specification (FFmpeg on Trigger.dev)**

| Requirements | Description |
| :---- | :---- |
| **Provider** | Internal (FFmpeg via Trigger.dev task) |
| **Input Handles** | video\_url and timestamp |
| **Output** | Extracted frame image ( uploaded via Transloadit ) |

**Input handles (2):**

- video\_url \- Required, accepts video types (mp4, mov, webm, m4v)  
- timestamp- Optional accepts text/number (seconds or “50%” for percentage), default: 0

**Output handle (1):**

- output – Extracted frame image URL (jpg/png)  
    
  ---

    
  **Workflow History (Right Sidebar)**


| Requirements | Description |
| :---- | :---- |
| **History panel** | Right Sidebar showing a list of all workflow runs |
| **Execution Scope** | History tracks all execution types: full workflow runs, single node runs, and selected node group runs |
| **Run Entry** | Each entry shows: timestamp, status (success/failed/ partial), duration, and scope (full/partial/single)  |
| **Click to Expand** | Clicking a run shows node-level execution details |
| **Node-level history** | For each node: status, inputs used, outputs generated, execution time |
| **Partial Runs** | Show which nodes ran successfully, even if the workflow failed |
| **Visual Indicators** | Color-coded status badges (green=success, red=failed, yellow=running) |
| **Persistence** | All history must persist in the PostgreSQL database |


  **Node-level History View:**


  When clicking on  workflow run, display:

  Run \#123 \- Jan, 2026 3:45 PM (Full Workflow)


  |---- text Node (node-1) \- 0.1s

      |--- Output: “Generate a product description…”

  |---- Image Node (node-2) \- 2.3s

      |--- Output: [https://cdn.transloadit.com/](https://cdn.transloadit.com/)..

  |---- Crop Image (node-3) \- 1.8s

      |--- Output: [https://cdn.transloadit.com/](https://cdn.transloadit.com/)..

  |---- LLM Node (node-4): 4.2s

      |--- Output: “Introducing our premium..”

  |---- Extract Frame (node-5) \- failed

      |--- Error: “Invalid timestamp parameter.”


  **Selected Nodes Run Examples:**


  Run \#124 \- Jan 14, 2026 4:12 PM (2 nodes selected)


  |---- Crop Image (node-3) \- 1.5s

     |-- Output :  [https://cdn.transloadit.com/](https://cdn.transloadit.com/)..

  |---- LLM Node (node-4) \- 3.1s

     |-- Output: “Updated product copy..”


  **Single Node Run Example:**


  Run \#125 \- Jan 14, 2026 4:30 PM (Single Node)


  |---- LLM Node (node-4) \- 2.8s

     |-- Output: “Quick test response..”


  

  ---


  


  


| Feature | Description |
| :---- | :---- |
|  **drag and drop notes** |  Add notes from the sidebar to the canvas via click or drag |
|  **node connection** | connect output handles to input handles with animated edges |
|  **Configurable inputs** | All node parameters must be configurable via input handles or manual entry – e.g., Crop images x/y/width/height can be connected from other nodes or entered directly |
|  **connected input state** | When an input handle has a connection, disable the corresponding manual input field in the UI (greyed out) —  the value comes from the connected node |
| **Type-safe Connections** | Enforce type-safe connections, image nodes cannot connect to prompt/system prompt inputs, text outputs cannot connect to file inputs —- invalid connections must be visually disallowed |
|  **DAG  validation** | Workflows must be DAG ( directed acyclic graph ), circular loops/cycles should be allowed |
|  **Node Deletion** | Delete note via menu button or keyboard (delete / backspace ) |
|  **canvas navigation** | Pan ( drag background ), zoom (scroll wheel), fit view |
|  **MiniMap** |  Bottom-Right corner navigation minimap |
|  **undo/redo** |  Implement undo/redo for node operations |
|  **selective execution** |  Allow users to run a single node, select multiple nodes, or run the entire workflow – each creates a history entry |
|  **parallel execution** |  Independent branches in the workflow DAG must execute concurrently — nodes only wait for their direct dependencies, not unrelated nodes |
|  **workflow persistence** | Save/load workflows to PostgreSQL database |


   **Technical Specifications**


   **Project Stack (Required)**


  

|  technology |  purpose |
| :---- | :---- |
|  **Next.js** | React framework with App Router |
|  **typescript** | Type safety throughout the code base |
| **PostgresSQL** | Database (use Neon) |
|  **Prisma** | ORM for database access |
|  **Clerk** | Authentication |
|  **React Flow** | Visual workflow/node graph library |
|  **Trigger.dev** | ALL node execution MUST use Trigger.dev |
|  **Transloadit** | File upload and media processing |
| **FFmpeg** | Image/video processing (via Trigger.dev) |
| **Tailwind CSS** | Styling (match Krea’s theme exactly) |
| **Zustand** | State management |
| **Zod** | Schema validation |
| **Google Generative AI SDK** | @google/generative-ai package |
| **Lucide React** | Icon library |


  **Trigger.dev Requirements**


  **Every node execution MUST use Trigger.dev.** This is non-negotiable.


  

| Node type | Trigger.dev Task |
| :---- | :---- |
| **LLM Node** | Task that calls the Gemini API |
| **Crop Image** | Task that runs the FFmpeg crop operation |
| **Extract Frame** | Task that runs FFmpeg frame extraction |


   **Parallel task execution:**


-  Independent nodes (no dependencies between them) must be triggered concurrently  
-  Tasks should only await the completion of their direct upstream dependencies  
- Example: if Node A and Node B  have no connection, trigger both tasks simultaneously rather than sequentially

---

**Required Sample Workflow**

Your submission must include a prebuilt sample workflow that demonstrates all node types, parallel execution, and input chaining. This workflow will be used to verify that all features are working correctly.

**Sample Workflow: Product Marketing Kit Generator**  
This workflow demonstrates all 6 node types working together with parallel execution and a convergence point. Two independent branches run simultaneously, then merge at a final node that waits for both to complete

---

**Branch A: Image Processing \+ Product Description**

**Nodes Involved:** Upload Image, Crop Image, text (x2), LLM Node \#1

**Flow:**

1. **Upload image Node** – user uploads a product photo (jpg/png/webp)  
2. **Crop image Node** – Receives the uploaded image and crops it to focus on the product (e.g- center crop at 80% width/height)  
3. **Text Node \#1 (System Prompt)** – Contains: “*You are a professional marketing copywriter generator compelling one paragraph product description.*”  
4. **Text Node \#2 (product Details)** – Contains: ”*Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30- hour battery, foldable design.*”  
5. **LLM Node \#1** – Receives  
- systme\_prompt – text Node \#1  
- user\_message – Text Node \#2  
- images – Crop image Node (cropped product photo)  
- **Outputs**: AI-generated product description

---

**Branch B: Video Frame Extraction**

**Nodes Involved:** Upload video, Extract Frame from Video

**Flow:**

1.  **Upload video Node** – user uploads a product demo video (mp4/mov/webm)  
     
2. **Extract Frame from Video** – Receives  
- video\_url – upload video Node  
- timestamp – “50%” (extracts frame from middle of video)  
- **Outputs**: Extracted frame image URL

---

**Convergence Point: Final Marketing Summary**

**Node:** LLM Node \#2 (waits for BOTH branches to complete)

**Inputs**:

- system\_prompt – Text Node \#3: “*You are a social media manager, create a tweet-length marketing post based on the product image and video frame.*”  
- user\_message – **LLM Node \#1 output** ( product description from Branch A)  
- images – **Cropped product image** (BranchA) \+ **Extracted video frame** (Branch B)

**What it does:**  takes the product description from Branch A and visual content from both branches ( cropped product photo \+ video frame ). The LLM can now “see” and analyze both images to create a more informed, visually aware marketing post.

**Outputs**: Final marketing tweet/post displayed inline on the node

---

**Execution Timeline**

| Phase | Branch A | Branch B | Convergence |
| :---- | :---- | :---- | :---- |
| Phase 1 | Upload image \+ text nodes | Upload Video | – |
| Phase 2 | Crop Image Node | Extract Frame Node | – |
| Phase 3 | LLM Node \#1 (waits for crop \+ texts) | (complete) | – |
| Phase 4 | (complete) | (complete) | **LLM Node \#2** (waits for both) |

**Key Demonstration:**

- Branch A and Branch B run **in parallel** during Phases 1-3  
- The **convergence Node (LLM \#2)** only executes after **both** branches complete  
- If Branch B finishes first, it waits. If Branch A finishes first, it waits. The convergence node triggers only when all upstream dependencies are satisfied.

---

**Getting API Keys:**

1. **Google AI:** Go to [Google AI Studio](https://makersuite.google.com/app/apikey)  
2. **Clerk**: Sign up at [clerk.com](https://clerk.com)  
3. **Trigger.dev**: Sign up at [trigger.dev](https://trigger.dev)  
4. **Transloadit**: Sign up at [transloadit.com](https://transloadit.com)  
5. **PostgreSQL**:  Use [Neon](https://neon.tech)

---

 **Resources**

- [**Krea.ai**](https://www.krea.ai/nodes) \- Reference application  
- [React Flow Documentation](https://reactflow.dev/docs/introduction/)  
- [Trigger.dev documentation](https://trigger.dev/docs)  
- [Clerk Documentation](https://clerk.com/docs)  
- [Transloadit Documentation](https://transloadit.com/docs/)  
- [Prisma Documentation](https://www.prisma.io/docs)  
- [Google AI Studio](https://makersuite.google.com/) – Get API key  
- [Gemini API Documentation](https://ai.google.dev/docs)  
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)  
- [Zod Documentation](https://zod.dev/)  
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)

<!-- END:nextjs-agent-rules -->