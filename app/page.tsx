import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { Explorer } from "@/components/explorer/Explorer";
import { ProofStage } from "@/components/proof/ProofStage";
import { ManualToAutomated } from "@/components/scenes/ManualToAutomated";
import { Bridge } from "@/components/scenes/Bridge";
import { IdeaToProduct } from "@/components/scenes/IdeaToProduct";
import { Integrations } from "@/components/scenes/Integrations";
import { UnderInterface } from "@/components/scenes/UnderInterface";
import { EngineeringWork } from "@/components/work/EngineeringWork";
import { Breadth } from "@/components/breadth/Breadth";
import { Process } from "@/components/process/Process";
import { Trust } from "@/components/trust/Trust";
import { FinalCTA } from "@/components/site/FinalCTA";
import { Builder } from "@/components/builder/Builder";
import { copy } from "@/content/copy";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <div className="quiet"><p>{copy.transition}</p></div>
        <Explorer />
        <ProofStage />
        <ManualToAutomated />
        <Bridge />
        <IdeaToProduct />
        <Integrations />
        <EngineeringWork />
        <UnderInterface />
        <Breadth />
        <Builder />
        <Process />
        <Trust />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
