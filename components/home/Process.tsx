import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";

const processSteps = [
  {
    number: "01",
    title: "Director-Led",
    description:
      "We direct every creative choice, using AI as a filmmaking tool to bring our stories, characters, and vision to life.",
  },
  {
    number: "02",
    title: "Cinematic",
    description:
      "We craft every frame with cinematic intention, from composition and lighting to movement and atmosphere, creating films that feel immersive, emotional, and alive.",
  },
  {
    number: "03",
    title: "AI-Native",
    description:
      "Built from the ground up with AI at the heart of our creative process, allowing us to explore new visual possibilities and bring ambitious stories to life.",
  },
];

export default function Process() {
  return (
    <Section className="positioning">
      <Container>
        <div className="positioning-head">
          <h2>AI-powered production studio.</h2>

          <p>
            We make films, not samples. Nadidove combines cutting-edge AI
            with world-class directing to produce content that rivals
            traditional production — at unprecedented speed.
          </p>
        </div>

        <div className="process">
          {processSteps.map((step) => (
            <article className="process-step" key={step.number}>
              {/* The number alone — the label used to repeat the heading
                  word for word underneath it. */}
              <span className="step-num">{step.number}</span>

              <h3>{step.title}</h3>

              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}
