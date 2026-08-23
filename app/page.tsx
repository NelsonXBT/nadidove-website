import Hero from "@/components/home/Hero";
import Process from "@/components/home/Process";
import FilmsPreview from "@/components/home/FilmsPreview";
import ContactCta from "@/components/home/ContactCta";

export default function Home() {
  return (
    <main>
      <Hero />
      <Process />
      <FilmsPreview />
      <ContactCta />
    </main>
  );
}