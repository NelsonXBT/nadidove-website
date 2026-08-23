export default function AboutPage() {
  return (
    <main>

      <section className="page-intro">
        <div className="container">

          <p className="eyebrow">About Nadidove</p>

          <h1 className="heading-xl">
            An AI-powered filmmaking studio,
            <br />
            start to finish.
          </h1>

          <p className="body-lg">
            Nadidove is a creative film studio creating original stories
            through imagination, technology and film.
          </p>

        </div>
      </section>


      <section className="section positioning">
        <div className="container">

          <div className="positioning-head">

            <p className="eyebrow">How We Work</p>

            <h2>
              We build the entire production from story to screen.
            </h2>

            <p>
              Every Nadidove film is written, directed and generated using AI.
              We build the world, the characters and the performances through
              generative tools, then edit and score each film as a complete
              production.
            </p>

          </div>

          <div className="process">

            <div className="process-step">
              <span className="step-num">01 — WRITE</span>
              <h3>Write</h3>
              <p>
                Every film starts with a real story, real characters and a
                reason to keep watching.
              </p>
            </div>

            <div className="process-step">
              <span className="step-num">02 — GENERATE</span>
              <h3>Generate</h3>
              <p>
                We direct AI models frame by frame to build the world, cast
                and performances.
              </p>
            </div>

            <div className="process-step">
              <span className="step-num">03 — RELEASE</span>
              <h3>Release</h3>
              <p>
                Finished films are released directly to our audience.
              </p>
            </div>

          </div>

        </div>
      </section>

    </main>
  );
}