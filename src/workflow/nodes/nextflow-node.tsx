"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useWorkflowStore } from "@/src/stores/workflow-store";
import { NODE_SPECS, type NextflowNode } from "../types";

const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/jpg,image/webp,image/gif";
const GEMINI_MODELS = [
  { label: "Gemini 2.5 Flash", value: "gemini-2.5-flash" },
  { label: "Gemini 2.5 Flash-Lite", value: "gemini-2.5-flash-lite" },
  { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
];

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6.25rem_1fr] items-start gap-2">
      <div className="pt-2 text-[11px] text-white/55">{props.label}</div>
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
        "h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs outline-none",
        "placeholder:text-white/30",
        props.disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-white/20 focus:border-white/30",
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
        "min-h-24 w-full resize-y rounded-xl border border-white/10 bg-white/5 p-3 text-xs outline-none",
        "placeholder:text-white/30",
        props.disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-white/20 focus:border-white/30",
      ].join(" ")}
    />
  );
}

function Select(props: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  disabled?: boolean;
}) {
  return (
    <select
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      disabled={props.disabled}
      className={[
        "h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-xs outline-none",
        props.disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:border-white/20 focus:border-white/30",
      ].join(" ")}
    >
      {props.options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function ActionButton(props: {
  onClick?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={[
        "inline-flex h-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white transition",
        props.disabled
          ? "cursor-not-allowed opacity-40"
          : "hover:bg-white/10 active:scale-[0.99]",
      ].join(" ")}
    >
      {props.children}
    </button>
  );
}

export default function NextflowNode(props: NodeProps<NextflowNode>) {
  const { id, data, selected } = props;
  const spec = NODE_SPECS[data.kind];
  const updateNodeInput = useWorkflowStore((state) => state.updateNodeInput);
  const uploadImageToNode = useWorkflowStore((state) => state.uploadImageToNode);
  const createRunOnServer = useWorkflowStore((state) => state.createRunOnServer);

  const status = data.status ?? "idle";
  const llmModel = GEMINI_MODELS.some((option) => option.value === data.inputs.model)
    ? data.inputs.model
    : "gemini-2.5-flash";
  const statusColor =
    status === "running"
      ? "border-yellow-500/30 bg-yellow-500/20 text-yellow-100"
      : status === "success"
        ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-100"
        : status === "error"
          ? "border-red-500/30 bg-red-500/20 text-red-100"
          : "border-white/10 bg-white/5 text-white/60";

  const llmCanRun =
    data.kind === "llm" &&
    (data.connectedInputs["user_message"] || (data.inputs["user_message"] ?? "").trim().length > 0);

  return (
    <div
      className={[
        "w-[21rem] rounded-[1.1rem] border bg-[#0b0d12] shadow-[0_0_0_1px_rgba(255,255,255,0.05)_inset]",
        selected ? "border-white/30" : "border-white/10",
        status === "running" ? "shadow-[0_0_28px_rgba(234,179,8,0.18)]" : "",
      ].join(" ")}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2.5">
        <div className="text-sm font-medium text-white">{spec.title}</div>
        <div className={["rounded-full border px-2 py-1 text-[11px]", statusColor].join(" ")}>
          {status}
        </div>
      </div>

      {spec.inputs.map((handle, index) => (
        <Handle
          key={handle.id}
          type="target"
          position={Position.Left}
          id={`in:${handle.id}`}
          style={{
            top: 56 + index * 30,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(0,0,0,0.4)",
            width: 10,
            height: 10,
          }}
        />
      ))}
      {spec.outputs.map((handle, index) => (
        <Handle
          key={handle.id}
          type="source"
          position={Position.Right}
          id={`out:${handle.id}`}
          style={{
            top: 56 + index * 30,
            background: "rgba(255,255,255,0.35)",
            border: "1px solid rgba(0,0,0,0.4)",
            width: 10,
            height: 10,
          }}
        />
      ))}

      <div className="grid gap-3 p-3">
        {data.kind === "text" ? (
          <Textarea
            value={data.inputs.text ?? ""}
            onChange={(value) => updateNodeInput(id, "text", value)}
            placeholder="Write the text this node should output..."
          />
        ) : null}

        {data.kind === "upload_image" ? (
          <div className="grid gap-3">
            <label className="group block cursor-pointer">
              <input
                type="file"
                accept={ACCEPTED_IMAGE_TYPES}
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  void uploadImageToNode(id, file);
                  event.target.value = "";
                }}
              />
              <div className="flex h-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-xs text-white transition group-hover:bg-white/10">
                {status === "running"
                  ? "Uploading image..."
                  : data.outputs.image_url
                    ? "Replace image"
                    : "Upload image"}
              </div>
            </label>

            <div className="text-[11px] text-white/38">
              Accepts JPG, JPEG, PNG, WEBP, and GIF. Upload returns a Transloadit CDN URL.
            </div>

            {data.outputs.image_url ? (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                <div className="aspect-[4/3] bg-black/30">
                  <img
                    src={data.outputs.image_url}
                    alt="Uploaded node asset"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="border-t border-white/10 px-3 py-2 text-[11px] text-white/55 break-all">
                  {data.outputs.image_url}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-white/42">
                Upload an image to produce an <span className="font-mono text-white/58">image_url</span> output.
              </div>
            )}
          </div>
        ) : null}

        {data.kind === "llm" ? (
          <div className="grid gap-3">
            <Row label="Model">
              <Select
                value={llmModel}
                onChange={(value) => updateNodeInput(id, "model", value)}
                options={GEMINI_MODELS}
              />
            </Row>

            <Row label="System">
              <Textarea
                value={data.inputs.system_prompt ?? ""}
                onChange={(value) => updateNodeInput(id, "system_prompt", value)}
                disabled={!!data.connectedInputs.system_prompt}
                placeholder="Optional system prompt"
              />
            </Row>

            <Row label="User">
              <Textarea
                value={data.inputs.user_message ?? ""}
                onChange={(value) => updateNodeInput(id, "user_message", value)}
                disabled={!!data.connectedInputs.user_message}
                placeholder="Required user message"
              />
            </Row>

            <Row label="Images">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/55">
                {data.connectedInputs.images
                  ? "Connected image outputs will be sent to Gemini automatically."
                  : "Optional. Connect one or more image outputs for vision context."}
              </div>
            </Row>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2">
              <div className="text-[11px] text-white/45">
                {status === "running"
                  ? "Trigger.dev is executing this node..."
                  : "Runs render the AI response inline on this node."}
              </div>
              <ActionButton
                onClick={() => void createRunOnServer({ scope: "SINGLE", nodeIds: [id] })}
                disabled={!llmCanRun || status === "running"}
              >
                Run node
              </ActionButton>
            </div>

            {status === "running" || data.outputs.output ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-white/35">
                  Response
                </div>
                <div className="whitespace-pre-wrap text-xs leading-6 text-white/82">
                  {status === "running" && !data.outputs.output
                    ? "Waiting for Gemini response..."
                    : data.outputs.output}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {data.kind === "crop_image" ? (
          <div className="grid gap-2">
            <Row label="Image URL">
              <Input
                value={data.inputs.image_url ?? ""}
                onChange={(value) => updateNodeInput(id, "image_url", value)}
                disabled={!!data.connectedInputs.image_url}
                placeholder="Connect an image output"
              />
            </Row>
            <Row label="x%">
              <Input
                value={data.inputs.x_percent ?? "0"}
                onChange={(value) => updateNodeInput(id, "x_percent", value)}
                disabled={!!data.connectedInputs.x_percent}
              />
            </Row>
            <Row label="y%">
              <Input
                value={data.inputs.y_percent ?? "0"}
                onChange={(value) => updateNodeInput(id, "y_percent", value)}
                disabled={!!data.connectedInputs.y_percent}
              />
            </Row>
            <Row label="w%">
              <Input
                value={data.inputs.width_percent ?? "100"}
                onChange={(value) => updateNodeInput(id, "width_percent", value)}
                disabled={!!data.connectedInputs.width_percent}
              />
            </Row>
            <Row label="h%">
              <Input
                value={data.inputs.height_percent ?? "100"}
                onChange={(value) => updateNodeInput(id, "height_percent", value)}
                disabled={!!data.connectedInputs.height_percent}
              />
            </Row>
          </div>
        ) : null}

        {data.kind === "extract_frame" ? (
          <div className="grid gap-2">
            <Row label="Video URL">
              <Input
                value={data.inputs.video_url ?? ""}
                onChange={(value) => updateNodeInput(id, "video_url", value)}
                disabled={!!data.connectedInputs.video_url}
                placeholder="Connect a video output"
              />
            </Row>
            <Row label="Timestamp">
              <Input
                value={data.inputs.timestamp ?? "0"}
                onChange={(value) => updateNodeInput(id, "timestamp", value)}
                disabled={!!data.connectedInputs.timestamp}
                placeholder='Seconds or "50%"'
              />
            </Row>
          </div>
        ) : null}

        {data.kind === "upload_video" ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-4 text-center text-xs text-white/42">
            Video upload is still pending. Image upload is live now.
          </div>
        ) : null}

        {data.errorMessage ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-100">
            {data.errorMessage}
          </div>
        ) : null}
      </div>
    </div>
  );
}
