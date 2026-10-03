import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";
import { Hero } from "@/components/hero/Hero";
import { copy } from "@/content/copy";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main">
        <Hero />
        <div className="quiet"><p>{copy.transition}</p></div>
      </main>
      <Footer />
    </>
  );
}
