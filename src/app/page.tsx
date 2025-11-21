import { Chatbot } from "@/components/chatbot";

export default function Home() {
  return (
    <main className="flex h-dvh w-screen items-center justify-center">
      <div className="w-full max-w-2xl sm:max-h-[800px] h-full p-2">
        <Chatbot />
      </div>
    </main>
  );
}
