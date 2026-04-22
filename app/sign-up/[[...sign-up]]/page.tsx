import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <main className="min-h-screen grid place-items-center bg-neutral-950 text-neutral-50">
      <SignUp />
    </main>
  );
}

