import { UserButton } from "@clerk/nextjs";
import WorkflowBuilder from "./workflow-builder";

export default function WorkflowPage() {
  return (
    <div className="min-h-screen bg-[#0b0d12] text-neutral-100">
      <header className="h-12 px-3 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded bg-white/10" />
          <span className="text-sm font-medium">Nextflow</span>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </header>
      <WorkflowBuilder />
    </div>
  );
}
