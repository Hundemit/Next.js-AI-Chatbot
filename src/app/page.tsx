import { Chatbot } from "@/components/chatbot";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex min-h-dvh w-full items-center justify-center p-2">
      <div className="flex h-[calc(100dvh-1rem)] w-full max-w-[1500px] flex-col items-center justify-center gap-2">
        <ThemeToggle className="sm:absolute top-2 right-1/2 sm:right-2 z-10 max-sm:w-full" />

        <Chatbot />
      </div>
    </main>
  );
}
