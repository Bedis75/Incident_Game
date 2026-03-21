import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="page-shell">
      <main className="game-wrap">
        <section className="hero-card">
          <p className="eyebrow">Team Training Board Game</p>
          <h1>Incident Management Champion</h1>
          <p className="hero-lead">
            Race through the incident lifecycle, collect all wedges, survive the
            trap challenge, and become the champion.
          </p>
          <div className="hero-meta">
            <span>Players: 4 groups</span>
            <span>Play time: 30-40 min</span>
            <span>Pace: Fast turns (30-45 sec)</span>
          </div>
          <p>
            <Link href="/" className="menu-link" aria-label="Back to main menu">
              Back to Menu
            </Link>
          </p>
        </section>

        <section className="grid-three" aria-label="Core objective and categories">
          <article className="panel">
            <h2>Objective</h2>
            <p>
              Be the first team to collect all 6 wedges (2 per category), reach
              the final trap activity, and win to claim the title.
            </p>
          </article>
          <article className="panel category-red">
            <h2>Detection and Logging</h2>
            <p>
              Monitoring, alerts, ticket creation, initial reporting, incident
              source, and classification.
            </p>
          </article>
          <article className="panel category-blue">
            <h2>Triage and Diagnosis</h2>
            <p>
              Prioritization, impact and urgency, SLA, escalation, root cause,
              and communication.
            </p>
          </article>
          <article className="panel category-green">
            <h2>Resolution and Closure</h2>
            <p>
              Workarounds, fixes, testing, verification, closure codes, and
              lessons learned.
            </p>
          </article>
        </section>

        <section className="grid-two" aria-label="Board and components">
          <article className="panel">
            <h2>Board Layout</h2>
            <ul>
              <li>Outer ring: 24 spaces, repeated 6 times.</li>
              <li>Pattern: Red to Blue to Green to Neutral.</li>
              <li>Three hub checkpoints: Red, Blue, Green.</li>
              <li>Center: Resolution Center / Champion Zone.</li>
              <li>Neutral spaces: roll again or move +1.</li>
            </ul>
          </article>
          <article className="panel">
            <h2>Components</h2>
            <ul>
              <li>1 circular board with 26 spaces.</li>
              <li>4 player pieces.</li>
              <li>30+ question cards with color-coded backs.</li>
              <li>24 wedges (8 sets of Red, Blue, Green).</li>
              <li>1 six-sided die and one trap activity.</li>
              <li>Optional: 30-second timer.</li>
            </ul>
          </article>
        </section>

        <section className="panel" aria-label="Turn sequence">
          <h2>How to Play</h2>
          <ol>
            <li>Roll a Dice and move clockwise.</li>
            <li>
              Land on a color: answer that category question. Land on blue: you
              face the trap activity.
            </li>
            <li>
              Correct answer: gain one wedge if you still need wedges in that
              color.
            </li>
            <li>Wrong answer: turn ends.</li>
            <li>If already full on a color (2 wedges), no extra effect.</li>
          </ol>
        </section>

        <section className="grid-two" aria-label="Setup and win conditions">
          <article className="panel">
            <h2>Setup</h2>
            <ol>
              <li>Place board at the center.</li>
              <li>Each team picks a piece and starts on any space.</li>
              <li>Shuffle each question deck separately by category.</li>
              <li>Each team gets an incident pie tracker with 6 slots.</li>
            </ol>
          </article>
          <article className="panel champion-box">
            <h2>Winning the Game</h2>
            <p>
              Once a team has all 6 wedges, they must attempt the trap activity.
            </p>
            <ul>
              <li>Success: crowned Incident Management Champion.</li>
              <li>Failure: lose one wedge and keep racing.</li>
            </ul>
          </article>
        </section>
      </main>
    </div>
  );
}
