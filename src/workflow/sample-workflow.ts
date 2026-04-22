import type { Edge } from "reactflow";
import type { NextflowNode } from "./types";

/**
 * UI-only sample workflow required by spec:
 * "Product Marketing Kit Generator" demonstrating:
 * - all 6 node types
 * - parallel branches + convergence on final LLM node
 */
export function createSampleWorkflow(): { nodes: NextflowNode[]; edges: Edge[] } {
  const nodes: NextflowNode[] = [
    {
      id: "text-system-1",
      type: "nextflowNode",
      position: { x: -300, y: -160 },
      data: {
        kind: "text",
        label: "System prompt",
        inputs: {
          text: "You are a professional marketing copywriter generator compelling one paragraph product description.",
        },
        connectedInputs: { text: false },
        outputs: { text: "" },
        status: "idle",
      },
    },
    {
      id: "text-user-1",
      type: "nextflowNode",
      position: { x: -300, y: -20 },
      data: {
        kind: "text",
        label: "Product details",
        inputs: {
          text: "Product: Wireless Bluetooth Headphones. Features: Noise cancellation, 30-hour battery, foldable design.",
        },
        connectedInputs: { text: false },
        outputs: { text: "" },
        status: "idle",
      },
    },
    {
      id: "upload-image",
      type: "nextflowNode",
      position: { x: -300, y: 140 },
      data: {
        kind: "upload_image",
        label: "Upload image",
        inputs: {},
        connectedInputs: {},
        outputs: { image_url: "" },
        status: "idle",
      },
    },
    {
      id: "crop-image",
      type: "nextflowNode",
      position: { x: 20, y: 140 },
      data: {
        kind: "crop_image",
        label: "Crop image",
        inputs: {
          image_url: "",
          x_percent: "0",
          y_percent: "0",
          width_percent: "80",
          height_percent: "80",
        },
        connectedInputs: {
          image_url: true,
          x_percent: false,
          y_percent: false,
          width_percent: false,
          height_percent: false,
        },
        outputs: { output: "" },
        status: "idle",
      },
    },
    {
      id: "llm-1",
      type: "nextflowNode",
      position: { x: 360, y: 0 },
      data: {
        kind: "llm",
        label: "LLM #1",
        inputs: {
          system_prompt: "",
          user_message: "",
          images: "",
        },
        connectedInputs: {
          system_prompt: true,
          user_message: true,
          images: true,
        },
        outputs: { output: "" },
        status: "idle",
      },
    },
    {
      id: "upload-video",
      type: "nextflowNode",
      position: { x: -300, y: 340 },
      data: {
        kind: "upload_video",
        label: "Upload video",
        inputs: {},
        connectedInputs: {},
        outputs: { video_url: "" },
        status: "idle",
      },
    },
    {
      id: "extract-frame",
      type: "nextflowNode",
      position: { x: 20, y: 340 },
      data: {
        kind: "extract_frame",
        label: "Extract frame",
        inputs: {
          video_url: "",
          timestamp: "50%",
        },
        connectedInputs: {
          video_url: true,
          timestamp: false,
        },
        outputs: { output: "" },
        status: "idle",
      },
    },
    {
      id: "text-system-2",
      type: "nextflowNode",
      position: { x: 360, y: 220 },
      data: {
        kind: "text",
        label: "System prompt 2",
        inputs: {
          text: "You are a social media manager, create a tweet-length marketing post based on the product image and video frame.",
        },
        connectedInputs: { text: false },
        outputs: { text: "" },
        status: "idle",
      },
    },
    {
      id: "llm-2",
      type: "nextflowNode",
      position: { x: 720, y: 120 },
      data: {
        kind: "llm",
        label: "LLM #2",
        inputs: {
          system_prompt: "",
          user_message: "",
          images: "",
        },
        connectedInputs: {
          system_prompt: true,
          user_message: true,
          images: true,
        },
        outputs: { output: "" },
        status: "idle",
      },
    },
  ];

  const edges: Edge[] = [
    // Branch A
    {
      id: "e1",
      source: "text-system-1",
      sourceHandle: "out:text",
      target: "llm-1",
      targetHandle: "in:system_prompt",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e2",
      source: "text-user-1",
      sourceHandle: "out:text",
      target: "llm-1",
      targetHandle: "in:user_message",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e3",
      source: "upload-image",
      sourceHandle: "out:image_url",
      target: "crop-image",
      targetHandle: "in:image_url",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e4",
      source: "crop-image",
      sourceHandle: "out:output",
      target: "llm-1",
      targetHandle: "in:images",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },

    // Branch B
    {
      id: "e5",
      source: "upload-video",
      sourceHandle: "out:video_url",
      target: "extract-frame",
      targetHandle: "in:video_url",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },

    // Convergence
    {
      id: "e6",
      source: "text-system-2",
      sourceHandle: "out:text",
      target: "llm-2",
      targetHandle: "in:system_prompt",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e7",
      source: "llm-1",
      sourceHandle: "out:output",
      target: "llm-2",
      targetHandle: "in:user_message",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e8",
      source: "crop-image",
      sourceHandle: "out:output",
      target: "llm-2",
      targetHandle: "in:images",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
    {
      id: "e9",
      source: "extract-frame",
      sourceHandle: "out:output",
      target: "llm-2",
      targetHandle: "in:images",
      animated: true,
      style: { stroke: "rgba(255,255,255,0.35)" },
    },
  ];

  return { nodes, edges };
}

