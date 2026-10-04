import { ChapterBoundary } from "@/components/site/ChapterBoundary";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { BusinessSoftware } from "@/components/business/BusinessSoftware";
import { Specialized } from "@/components/specialized/Specialized";
import { Services } from "@/components/services/Services";
import { StartingPoint } from "@/components/start/StartingPoint";
import { Transformation } from "@/components/transformation/Transformation";
import { ProofSection } from "@/components/proof/ProofSection";
import { IdeaToProduct } from "@/components/scenes/IdeaToProduct";
import { ProductRescue } from "@/components/rescue/ProductRescue";
import { AiSection } from "@/components/ai/AiSection";
import { Integrations } from "@/components/scenes/Integrations";
import { Work } from "@/components/work/Work";
import { UnderInterface } from "@/components/scenes/UnderInterface";
import { Process } from "@/components/process/Process";
import { Testimonials } from "@/components/testimonials/Testimonials";
import { Why } from "@/components/why/Why";
import { Builder } from "@/components/builder/Builder";
import { FinalCTA } from "@/components/site/FinalCTA";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <ChapterBoundary type="handoff" />
        <Services />
        <ChapterBoundary type="compress" />
        <StartingPoint />
        <ChapterBoundary type="expand" />
        <IdeaToProduct />
        <ChapterBoundary type="depth" />
        <BusinessSoftware />
        <ChapterBoundary type="fragment" />
        <Transformation />
        <ChapterBoundary type="awaken" />
        <AiSection />
        <ChapterBoundary type="morph" />
        <Integrations />
        <ChapterBoundary type="handoff" />
        <Specialized />
        <ChapterBoundary type="expand" />
        <ProofSection />
        <ChapterBoundary type="continuity" />
        <ProductRescue />
        <ChapterBoundary type="flatten" />
        <Work />
        <ChapterBoundary type="depth" />
        <UnderInterface />
        <ChapterBoundary type="recompress" />
        <Process />
        <Testimonials />
        <ChapterBoundary type="light" />
        <Why />
        <ChapterBoundary type="focus" />
        <Builder />
        <ChapterBoundary type="brand" />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
