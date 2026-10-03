import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { Services } from "@/components/services/Services";
import { StartingPoint } from "@/components/start/StartingPoint";
import { Transformation } from "@/components/transformation/Transformation";
import { Labs } from "@/components/labs/Labs";
import { IdeaToProduct } from "@/components/scenes/IdeaToProduct";
import { ProductRescue } from "@/components/rescue/ProductRescue";
import { AiSection } from "@/components/ai/AiSection";
import { Integrations } from "@/components/scenes/Integrations";
import { Work } from "@/components/work/Work";
import { UnderInterface } from "@/components/scenes/UnderInterface";
import { Process } from "@/components/process/Process";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { Trust } from "@/components/trust/Trust";
import { Builder } from "@/components/builder/Builder";
import { FinalCTA } from "@/components/site/FinalCTA";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <Services />
        <StartingPoint />
        <Transformation />
        <Labs />
        <IdeaToProduct />
        <ProductRescue />
        <AiSection />
        <Integrations />
        <Work />
        <UnderInterface />
        <Process />
        <Testimonials />
        <Trust />
        <Builder />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
