import ContactCta from "@/components/home/ContactCta";
import FilmsPreview from "@/components/home/FilmsPreview";
import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";

export default function Home() {
  return (
    <main id="main">
      <Hero />
      <Process />
      <FilmsPreview />
      <ContactCta />
    </main>
  );
}
