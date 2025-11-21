import { Chatbot } from "@/components/chatbot";

export default function Home() {
  return (
    <main className="flex h-screen w-screen items-center justify-center">
      <div className="w-full max-w-2xl h-[800px]">
        <Chatbot />
      </div>
    </main>
  );
}
