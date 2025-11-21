import { FAQ } from "@/components/blocks/faq";
import { Features } from "@/components/blocks/features";
import { Hero } from "@/components/blocks/hero";

export default function Home() {
  return (
    <>
      {/* <Background className="via-muted to-muted/80"> */}
      <Hero />
      <Features />
      {/* </Background> */}
      {/* <Background variant="bottom"> */}
      <FAQ />
      {/* </Background> */}
    </>
  );
}
