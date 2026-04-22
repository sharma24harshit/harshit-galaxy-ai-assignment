import type { Node, Edge } from "reactflow";

export type NodeKind =
  | "text"
  | "upload_image"
  | "upload_video"
  | "llm"
  | "crop_image"
  | "extract_frame";

export type ValueType = "text" | "image_url" | "video_url" | "number" | "timestamp";

export type HandleSpec = {
  id: string;
  label: string;
  valueType: ValueType;
  required?: boolean;
  multiple?: boolean;
};

export type NodeSpec = {
  kind: NodeKind;
  title: string;
  inputs: HandleSpec[];
  outputs: HandleSpec[];
};

export const NODE_SPECS: Record<NodeKind, NodeSpec> = {
  text: {
    kind: "text",
    title: "Text",
    inputs: [],
    outputs: [{ id: "text", label: "text", valueType: "text" }],
  },
  upload_image: {
    kind: "upload_image",
    title: "Upload image",
    inputs: [],
    outputs: [{ id: "image_url", label: "image_url", valueType: "image_url" }],
  },
  upload_video: {
    kind: "upload_video",
    title: "Upload video",
    inputs: [],
    outputs: [{ id: "video_url", label: "video_url", valueType: "video_url" }],
  },
  llm: {
    kind: "llm",
    title: "Run any LLM",
    inputs: [
      { id: "system_prompt", label: "system_prompt", valueType: "text" },
      { id: "user_message", label: "user_message", valueType: "text", required: true },
      { id: "images", label: "images", valueType: "image_url", multiple: true },
    ],
    outputs: [{ id: "output", label: "output", valueType: "text" }],
  },
  crop_image: {
    kind: "crop_image",
    title: "Crop image",
    inputs: [
      { id: "image_url", label: "image_url", valueType: "image_url", required: true },
      { id: "x_percent", label: "x_percent", valueType: "number" },
      { id: "y_percent", label: "y_percent", valueType: "number" },
      { id: "width_percent", label: "width_percent", valueType: "number" },
      { id: "height_percent", label: "height_percent", valueType: "number" },
    ],
    outputs: [{ id: "output", label: "output", valueType: "image_url" }],
  },
  extract_frame: {
    kind: "extract_frame",
    title: "Extract frame",
    inputs: [
      { id: "video_url", label: "video_url", valueType: "video_url", required: true },
      { id: "timestamp", label: "timestamp", valueType: "timestamp" },
    ],
    outputs: [{ id: "output", label: "output", valueType: "image_url" }],
  },
};

export type NodeInputValues = Record<string, string>;

export type NodeOutputValues = Record<string, string>;

export type NextflowNodeData = {
  kind: NodeKind;
  label: string;
  inputs: NodeInputValues;
  connectedInputs: Record<string, boolean>;
  outputs: NodeOutputValues;
  status?: "idle" | "running" | "success" | "error";
  errorMessage?: string;
};

export type NextflowNode = Node<NextflowNodeData>;
export type NextflowEdge = Edge;

