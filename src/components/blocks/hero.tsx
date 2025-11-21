import Link from "next/link";

import { ArrowRight, ArrowUpRight } from "lucide-react";

import { Chatbot } from "@/components/chatbot";
import DotGrid from "@/components/DotGrid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Hero = () => {
  return (
    <section className="relative">
      <div className="z-10 mx-auto flex min-h-screen max-w-(--breakpoint-xl) flex-col items-center gap-12 px-2 py-12 lg:flex-row">
        {/* HERO CONTENT */}
        <div className="bg-background/10 mt-18 h-fit rounded-xl border p-2 backdrop-blur-sm duration-300 sm:p-4">
          <Badge
            variant="secondary"
            className="border-border rounded-full py-1"
            asChild
          >
            <Link href="#">
              Just released v1.0.0 <ArrowUpRight className="ml-1 size-4" />
            </Link>
          </Badge>
          <h1 className="xl:text-[3.25rem mt-4 max-w-[17ch] text-3xl leading-[1.2]! font-semibold tracking-tighter duration-300 md:text-5xl lg:mt-6 lg:text-[2.75rem]">
            Customized AI Chatbot <br /> Shadcn UI/IO & Next.js
          </h1>
          <p className="text-foreground/80 mt-2 max-w-[60ch] duration-300 sm:mt-6 sm:text-lg">
            Try Out My Chatbot and see what it can do. Feel free to explore it —
            and use the buttons below to visit the GitHub repo or my profile.
          </p>
          <div className="mt-4 flex flex-col items-center gap-4 duration-300 lg:mt-12 lg:flex-row">
            <Button className="w-full lg:w-auto" asChild>
              <a
                target="_blank"
                href="https://github.com/Hundemit/Next.js-AI-Chatbot"
              >
                Github
                <ArrowRight className="stroke-3" />
              </a>
            </Button>
            <Button
              variant="ghost"
              className="from-background h-auto w-full gap-2 bg-linear-to-r to-transparent shadow-md duration-300 lg:w-auto"
              asChild
            >
              <a
                target="_blank"
                href="https://www.janhindemit.de"
                className="truncate text-start duration-300 md:max-w-none"
              >
                About Me
              </a>
            </Button>
          </div>
        </div>
        {/* CHATBOT */}
        <div className="flex h-[90svh] w-full max-w-[500px] flex-col items-center justify-center rounded-xl bg-stone-300 lg:h-[700px]">
          <Chatbot />
        </div>
      </div>

      <div className="absolute bottom-0 left-0 -z-10 h-full w-full mask-[radial-gradient(800px_circle_at_center,white,transparent)]">
        <DotGrid
          dotSize={5}
          gap={15}
          baseColor="#808080"
          activeColor="#5227FF"
          proximity={120}
          shockRadius={250}
          shockStrength={5}
          resistance={750}
          returnDuration={1.5}
        />
      </div>
    </section>
  );
};
