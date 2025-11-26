import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

const categories = [
  {
    title: "General",
    questions: [
      {
        question: "How does the Nordi AI chatbot work technically?",
        answer:
          "Nordi AI is based on Next.js 16, React 19, and TypeScript. Communication with the AI models is handled via the Vercel AI SDK in combination with OpenRouter. Responses are streamed and displayed in real time.",
      },
      {
        question: "What prerequisites do I need for the installation?",
        answer:
          "You need Node.js 18+, a package manager like npm or pnpm, and an OpenRouter API key. After installation, you can start the project with 'npm run dev'.",
      },
      {
        question: "Is Nordi AI suitable for production environments?",
        answer:
          "Yes. The chatbot is modular, performant, and fully typed. With streaming, RAG, model selection, and a modern UI, it is well-suited for production deployments.",
      },
    ],
  },
  {
    title: "Models & AI",
    questions: [
      {
        question:
          "Which AI models are supported and how can I switch between them?",
        answer:
          "Supported models include Gemini 2.5 Flash, GPT-5 Nano, and Grok 4.1 Fast. You can switch the model easily using the dropdown in the chat. New models can be added to the MODELS configuration without additional code.",
      },
      {
        question: "How are responses streamed in the chat?",
        answer:
          "The Vercel AI SDK uses the 'streamText' function, which streams responses token by token. This ensures a smooth real-time experience.",
      },
      {
        question: "How are dynamic suggestions generated?",
        answer:
          "After each response, the '/api/suggestions' endpoint is called. Using a suggestion prompt and the chat history, it generates 3–5 follow-up questions as a JSON array.",
      },
    ],
  },
  {
    title: "Features & Functionality",
    questions: [
      {
        question:
          "Can the chatbot correctly render code, tables, and Markdown?",
        answer:
          "Yes. Thanks to react-markdown, Shiki, GFM support, and automatic formatting correction, tables, code blocks, and LaTeX are cleanly rendered and can be copied with a button.",
      },
      {
        question: "How does the RAG system for document integration work?",
        answer:
          "All files in the 'src/data/system-messages/documents/' folder are automatically loaded and passed to each model as context—completely without an external vector database.",
      },
      {
        question: "Can I add my own documents or prompts?",
        answer:
          "Yes. New .md or .txt files placed in the documents folder are automatically included. System prompts can also be easily adjusted or extended.",
      },
    ],
  },
  {
    title: "Integration & Development",
    questions: [
      {
        question: "How do I integrate the chatbot into my own project?",
        answer:
          "You can reuse the entire chatbot component or individual UI and logic modules. The architecture is modular and fully typed, which simplifies integration into any React/Next.js project.",
      },
    ],
  },
];

export const FAQ = ({
  headerTag = "h2",
  className,
  className2,
}: {
  headerTag?: "h1" | "h2";
  className?: string;
  className2?: string;
}) => {
  return (
    <section className={cn("py-28 lg:py-32", className)}>
      <div className="container max-w-5xl">
        <div className={cn("mx-auto grid gap-16 lg:grid-cols-2", className2)}>
          <div className="space-y-4">
            {headerTag === "h1" ? (
              <h1 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h1>
            ) : (
              <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
                Got Questions?
              </h2>
            )}
            <p className="text-muted-foreground max-w-md leading-snug lg:mx-auto">
              If you can't find what you're looking for,{" "}
              <a
                href="https://www.janhindemit.de"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-4"
              >
                get in touch
              </a>
              .
            </p>
          </div>

          <div className="grid gap-6 text-start">
            {categories.map((category, categoryIndex) => (
              <div key={category.title} className="">
                <h3 className="text-muted-foreground border-b py-4">
                  {category.title}
                </h3>
                <Accordion type="single" collapsible className="w-full">
                  {category.questions.map((item, i) => (
                    <AccordionItem key={i} value={`${categoryIndex}-${i}`}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
