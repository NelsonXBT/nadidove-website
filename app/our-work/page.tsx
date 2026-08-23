import Link from "next/link";

const films = [
  {
    number: "01",
    title: "The Ember Warden",
    description:
      "A mage trades his own flame to keep an ancient order of fire alive.",
    tone: "one",
  },
  {
    number: "02",
    title: "He Cock",
    description:
      "A rooster alone keeps the sun on schedule — and he's sick of the job.",
    tone: "two",
  },
  {
    number: "03",
    title: "The Receipt",
    description:
      "A Lagos hustle goes sideways when one small receipt won't disappear.",
    tone: "three",
  },
  {
    number: "04",
    title: "Threadbare",
    description:
      "A family holds itself together with a little less thread every year.",
    tone: "four",
  },
  {
    number: "05",
    title: "Ring Road Drop Off",
    description:
      "One ride, one road, one decision that can't be undone.",
    tone: "five",
  },
  {
    number: "06",
    title: "Unreconciled",
    description:
      "Two siblings, one inheritance, and everything they never said.",
    tone: "six",
  },
];

export default function OurWorkPage() {
  return (
    <main>

      <section className="page-intro">
        <div className="container">

          <p className="eyebrow">Our Work</p>

          <h1 className="heading-xl">
            Six worlds so far.
            <br />
            More every month.
          </h1>

          <p className="body-lg">
            Original stories written, generated and brought to life by
            Nadidove.
          </p>

        </div>
      </section>


      <section className="section films-section">
        <div className="container">

          <div className="film-grid">

            {films.map((film) => (
              <article className="film-card" key={film.number}>

                <a
                  href="https://youtube.com/@nadidove"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="film-card-link"
                >

                  <div className={`film-card-media film-tone-${film.tone}`}>

                    <span className="film-card-number">
                      FILM {film.number}
                    </span>

                    <div className="film-card-overlay">

                      <span className="film-card-watch">
                        Watch Film
                        <span aria-hidden="true">→</span>
                      </span>

                    </div>

                  </div>

                  <div className="film-card-content">

                    <div className="film-card-meta">
                      <span>Short Film</span>
                      <span>2026</span>
                    </div>

                    <h2 className="film-card-title">
                      {film.title}
                    </h2>

                    <p className="film-card-description">
                      {film.description}
                    </p>

                  </div>

                </a>

              </article>
            ))}

          </div>

        </div>
      </section>

    </main>
  );
}