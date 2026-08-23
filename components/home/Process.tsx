import Container from "@/components/ui/Container";
import Eyebrow from "@/components/ui/Eyebrow";
import Section from "@/components/ui/Section";

const processSteps = [
  {
    number: "01",
    label: "WRITE",
    title: "Write",
    description:
      "Every film starts as a real script — a character, a conflict, a reason to keep watching.",
  },
  {
    number: "02",
    label: "GENERATE",
    title: "Generate",
    description:
      "We direct AI models frame by frame to build the world, the cast and every performance in it.",
  },
  {
    number: "03",
    label: "RELEASE",
    title: "Release",
    description:
      "Finished films go straight to our audience on YouTube, free to watch.",
    link: {
      label: "YouTube",
      href: "https://youtube.com/@nadidove",
    },
  },
];

export default function Process() {
  return (
    <Section className="positioning">
      <Container>
        <div className="positioning-head">
          <Eyebrow>How We Work</Eyebrow>

          <h2>
            An AI-powered filmmaking studio, start to finish.
          </h2>

          <p>
            Every Nadidove film is written, directed and generated using AI —
            no cameras, no sets, no crew. We build the world, the characters
            and the performances entirely through generative tools, then edit
            and score each short like any other production.
          </p>
        </div>

        <div className="process">
          {processSteps.map((step) => (
            <article
              className="process-step"
              key={step.number}
            >
              <span className="step-num">
                {step.number} — {step.label}
              </span>

              <h3>{step.title}</h3>

              <p>
                {step.description}{" "}
                {step.link && (
                  <a
                    href={step.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {step.link.label}
                  </a>
                )}
              </p>
            </article>
          ))}
        </div>
      </Container>
    </Section>
  );
}