import Link from "next/link";

import { ArrowUpRight } from "lucide-react";

import { Button } from "@/components/ui/button";

export function Footer() {
  const navigation = [
    { name: "Product", href: "/#feature-modern-teams" },
    { name: "FAQ", href: "/faq" },
    { name: "Contact", href: "https://www.janhindemit.de", external: true },
  ];

  const social = [
    { name: "LinkedIn", href: "https://www.linkedin.com/in/jan-hindemit/" },
  ];

  const legal = [{ name: "Privacy Policy", href: "/privacy" }];

  return (
    <footer className="flex flex-col items-center gap-14 py-28 lg:py-32">
      <div className="container space-y-3 text-center">
        <h2 className="text-2xl tracking-tight md:text-4xl lg:text-5xl">
          Contact me
        </h2>
        <p className="text-muted-foreground mx-auto max-w-xl leading-snug text-balance">
          If you have any questions or feedback, please feel free to contact me.
        </p>
        <div>
          <Button size="lg" className="mt-4" asChild>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.janhindemit.de"
            >
              Contact me
            </a>
          </Button>
        </div>
      </div>

      <nav className="container flex flex-col items-center gap-4">
        <ul className="flex flex-wrap items-center justify-center gap-6">
          {navigation.map((item) => (
            <li key={item.name}>
              {item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-opacity hover:opacity-75"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  href={item.href}
                  className="font-medium transition-opacity hover:opacity-75"
                >
                  {item.name}
                </Link>
              )}
            </li>
          ))}
          {social.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                target="_blank"
                className="flex items-center gap-0.5 font-medium transition-opacity hover:opacity-75"
              >
                {item.name} <ArrowUpRight className="size-4" />
              </Link>
            </li>
          ))}
        </ul>
        <ul className="flex flex-wrap items-center justify-center gap-6">
          {legal.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="text-muted-foreground text-sm transition-opacity hover:opacity-75"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
