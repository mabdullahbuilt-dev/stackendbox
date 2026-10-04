import { ChapterRuntime } from "@/components/site/ChapterRuntime";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { BusinessSoftware } from "@/components/business/BusinessSoftware";
import { Specialized } from "@/components/specialized/Specialized";
import { Services } from "@/components/services/Services";
import { StartingPoint } from "@/components/start/StartingPoint";
import { Transformation } from "@/components/transformation/Transformation";
import { WorkGallery } from "@/components/work/Work";
import { ProofSection } from "@/components/proof/ProofSection";
import { IdeaToProduct } from "@/components/scenes/IdeaToProduct";
import { ProductRescue } from "@/components/rescue/ProductRescue";
import { AiSection } from "@/components/ai/AiSection";
import { Integrations } from "@/components/scenes/Integrations";
import { UnderInterface } from "@/components/scenes/UnderInterface";
import { Process } from "@/components/process/Process";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { Why } from "@/components/why/Why";
import { Builder } from "@/components/builder/Builder";
import { FinalCTA } from "@/components/site/FinalCTA";

export default function Home() {
  return (
    <>
      <ChapterRuntime />
      <Nav />
      <main id="main">
        <Hero />
        <Services />
        <StartingPoint />
        <IdeaToProduct />
        <BusinessSoftware />
        <Transformation />
        <AiSection />
        <Integrations />
        <Specialized />
        <ProofSection><WorkGallery /></ProofSection>
        <ProductRescue />
        <UnderInterface />
        <Process />
        <Testimonials />
        <Why />
        <Builder />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
