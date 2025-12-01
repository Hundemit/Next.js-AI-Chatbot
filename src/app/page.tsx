import { Chatbot } from "@/components/chatbot";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="flex h-dvh w-screen items-center justify-center">
      <div className="w-full max-w-2xl sm:max-h-[800px] h-full p-2  flex flex-col items-center justify-center gap-2">
        <ThemeToggle className="sm:absolute top-2 right-1/2 sm:right-2 z-10 max-sm:w-full" />

        <Chatbot />
      </div>
    </main>
  );
}
