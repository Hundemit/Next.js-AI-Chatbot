import Image from "next/image";
import Link from "next/link";

import { ChevronRight } from "lucide-react";

import { DashedLine } from "../dashed-line";

import { Card, CardContent } from "@/components/ui/card";

const items = [
  {
    title: "Multiple Chat Models",
    image: "/features/chat-models.png",
  },
  {
    title: "Next Message Suggestions",
    image: "/features/suggestions.png",
  },
  {
    title: "Markdown Support for Better Formatting",
    image: "/features/markdown.png",
  },
  {
    title: "Build your Knowledge Base",
    image: "/features/knowledge-base.png",
  },
];

export const Features = () => {
  return (
    <section id="features" className="pb-28 lg:pb-32">
      <div className="container">
        {/* Top dashed line with text */}
        <div className="relative flex items-center justify-center">
          <DashedLine className="text-muted-foreground" />
          <span className="bg-muted text-muted-foreground absolute px-3 font-mono text-sm font-medium tracking-wide max-md:hidden">
            EASY TO USE, EASY TO CUSTOMIZE
          </span>
        </div>

        {/* Content */}
        <div className="mx-auto mt-10 grid max-w-4xl items-center gap-3 md:gap-0 lg:mt-24 lg:grid-cols-2">
          <h2 className="text-xl tracking-tight md:text-4xl lg:text-3xl">
            Smarter models. Smarter suggestions. Cleaner output.
          </h2>
          <p className="text-muted-foreground leading-snug">
            The latest AI models, intuitive suggestions for your next step, and
            a clear, appealing layout create a productive and enjoyable user
            experience.
          </p>
        </div>

        {/* Features Card */}
        <Card className="mx-auto mt-8 max-w-3xl rounded-3xl md:mt-12 lg:mt-20">
          <CardContent className="grid grid-cols-2 p-0 max-md:grid-cols-1">
            {items.map((item, i) => (
              <div key={i} className="flex flex-1 max-md:flex-col">
                <div className="flex-1 p-4 pe-0! md:p-6">
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={item.image}
                      alt={`${item.title} interface`}
                      fill
                      className="rounded-l-lg border object-cover"
                    />
                    <div className="from-card absolute inset-0 z-10 bg-linear-to-t via-transparent to-transparent" />
                  </div>

                  <Link
                    href="#"
                    className={
                      "group flex items-center justify-between gap-4 pe-4 pt-4 md:pe-6 md:pt-6"
                    }
                  >
                    <h3 className="font-display max-w-60 text-2xl leading-tight font-bold tracking-tight">
                      {item.title}
                    </h3>
                    <div className="rounded-full border p-2">
                      <ChevronRight className="size-6 transition-transform group-hover:translate-x-1 lg:size-9" />
                    </div>
                  </Link>
                </div>
                {i < items.length - 1 && (
                  <div className="relative hidden md:block">
                    <DashedLine orientation="vertical" />
                  </div>
                )}
                {i < items.length - 1 && (
                  <div className="relative block md:hidden">
                    <DashedLine orientation="horizontal" />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
