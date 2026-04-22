import ReactFlow from "reactflow";  - old version

import ReactFlow from "@xyflow/react";  - new version
import "@xyflow/react/dist/style.css";


-----------


If you want the last bit of “exact parity”, the next improvement is implementing Upload Image/Video nodes so they actually upload to Transloadit from the UI and populate node.data.outputs.image_url/video_url (then the orchestrator can fully run the sample workflow end-to-end).