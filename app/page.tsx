import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { Explorer } from "@/components/explorer/Explorer";
import { ProofStage } from "@/components/proof/ProofStage";
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
        <Builder />
      </main>
      <Footer />
    </>
  );
}
