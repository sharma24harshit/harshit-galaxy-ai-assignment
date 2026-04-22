"use client";

import { Handle, Position, type NodeProps } from "reactflow";
import { NODE_SPECS, type NextflowNodeData } from "../types";
import { useWorkflowStore } from "@/src/stores/workflow-store";

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 items-center">
      <div className="text-[11px] text-white/60">{props.label}</div>
      <div>{props.children}</div>
    </div>
  );
}

function Input(props: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
      placeholder={props.placeholder}
      className={[
        "h-8 w-full rounded-md bg-white/5 border border-white/10 px-2 text-xs outline-none",
        "placeholder:text-white/30",
        props.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/20 focus:border-white/30",
      ].join(" ")}
    />
  );
}

function Textarea(props: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <textarea
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
      placeholder={props.placeholder}
      className={[
        "min-h-20 w-full resize-y rounded-md bg-white/5 border border-white/10 p-2 text-xs outline-none",
        "placeholder:text-white/30",
        props.disabled ? "opacity-40 cursor-not-allowed" : "hover:border-white/20 focus:border-white/30",
      ].join(" ")}
    />
  );
}

export default function NextflowNode(props: NodeProps<NextflowNodeData>) {
  const { id, data, selected } = props;
  const spec = NODE_SPECS[data.kind];
  const updateNodeInput = useWorkflowStore((s) => s.updateNodeInput);

  const status = data.status ?? "idle";
  const statusColor =
    status === "running"
      ? "bg-yellow-500/20 text-yellow-200 border-yellow-500/30"
      : status === "success"
        ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/30"
        : status === "error"
          ? "bg-red-500/20 text-red-200 border-red-500/30"
          : "bg-white/5 text-white/60 border-white/10";

  return (
    <div
      className={[
        "w-[20rem] rounded-xl border bg-[#0b0d12] shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset]",
        selected ? "border-white/30" : "border-white/10",
        status === "running" ? "shadow-[0_0_24px_rgba(234,179,8,0.25)]" : "",
      ].join(" ")}
    >
      <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="text-sm font-medium">{spec.title}</div>
        <div className={["text-[11px] px-2 py-1 rounded border", statusColor].join(" ")}>
          {status}
        </div>
      </div>

      {/* Handles */}
      {spec.inputs.map((h, idx) => (
        <Handle
          key={h.id}
          type="target"
          position={Position.Left}
          id={`in:${h.id}`}
          style={{
            top: 52 + idx * 28,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(0,0,0,0.4)",
            width: 10,
            height: 10,
          }}
        />
      ))}
      {spec.outputs.map((h, idx) => (
        <Handle
          key={h.id}
          type="source"
          position={Position.Right}
          id={`out:${h.id}`}
          style={{
            top: 52 + idx * 28,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(0,0,0,0.4)",
            width: 10,
            height: 10,
          }}
        />
      ))}

      <div className="p-3 grid gap-2">
        {data.kind === "text" ? (
          <Textarea
            value={data.inputs["text"] ?? ""}
            onChange={(v) => updateNodeInput(id, "text", v)}
            placeholder="Write something…"
            disabled={false}
          />
        ) : null}

        {data.kind === "llm" ? (
          <div className="grid gap-2">
            <Row label="System">
              <Input
                value={data.inputs["system_prompt"] ?? ""}
                onChange={(v) => updateNodeInput(id, "system_prompt", v)}
                disabled={!!data.connectedInputs["system_prompt"]}
                placeholder="Optional system prompt"
              />
            </Row>
            <Row label="User">
              <Input
                value={data.inputs["user_message"] ?? ""}
                onChange={(v) => updateNodeInput(id, "user_message", v)}
                disabled={!!data.connectedInputs["user_message"]}
                placeholder="Required user message"
              />
            </Row>
            <Row label="Images">
              <div className="text-xs text-white/50">
                {data.connectedInputs["images"]
                  ? "Connected (one or more)"
                  : "Connect Upload/Crop outputs"}
              </div>
            </Row>
            {data.outputs["output"] ? (
              <div className="mt-2 rounded-md border border-white/10 bg-white/5 p-2 text-xs whitespace-pre-wrap">
                {data.outputs["output"]}
              </div>
            ) : null}
          </div>
        ) : null}

        {data.kind === "crop_image" ? (
          <div className="grid gap-2">
            <Row label="Image URL">
              <Input
                value={data.inputs["image_url"] ?? ""}
                onChange={(v) => updateNodeInput(id, "image_url", v)}
                disabled={!!data.connectedInputs["image_url"]}
                placeholder="Connect an image output"
              />
            </Row>
            <Row label="x%">
              <Input
                value={data.inputs["x_percent"] ?? "0"}
                onChange={(v) => updateNodeInput(id, "x_percent", v)}
                disabled={!!data.connectedInputs["x_percent"]}
              />
            </Row>
            <Row label="y%">
              <Input
                value={data.inputs["y_percent"] ?? "0"}
                onChange={(v) => updateNodeInput(id, "y_percent", v)}
                disabled={!!data.connectedInputs["y_percent"]}
              />
            </Row>
            <Row label="w%">
              <Input
                value={data.inputs["width_percent"] ?? "100"}
                onChange={(v) => updateNodeInput(id, "width_percent", v)}
                disabled={!!data.connectedInputs["width_percent"]}
              />
            </Row>
            <Row label="h%">
              <Input
                value={data.inputs["height_percent"] ?? "100"}
                onChange={(v) => updateNodeInput(id, "height_percent", v)}
                disabled={!!data.connectedInputs["height_percent"]}
              />
            </Row>
          </div>
        ) : null}

        {data.kind === "extract_frame" ? (
          <div className="grid gap-2">
            <Row label="Video URL">
              <Input
                value={data.inputs["video_url"] ?? ""}
                onChange={(v) => updateNodeInput(id, "video_url", v)}
                disabled={!!data.connectedInputs["video_url"]}
                placeholder="Connect a video output"
              />
            </Row>
            <Row label="Timestamp">
              <Input
                value={data.inputs["timestamp"] ?? "0"}
                onChange={(v) => updateNodeInput(id, "timestamp", v)}
                disabled={!!data.connectedInputs["timestamp"]}
                placeholder='Seconds or "50%"'
              />
            </Row>
          </div>
        ) : null}

        {data.kind === "upload_image" ? (
          <div className="text-xs text-white/60">
            Upload will be wired via Transloadit in Step 3.
          </div>
        ) : null}

        {data.kind === "upload_video" ? (
          <div className="text-xs text-white/60">
            Upload will be wired via Transloadit in Step 3.
          </div>
        ) : null}

        {data.errorMessage ? (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 text-red-100 text-xs p-2">
            {data.errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}

