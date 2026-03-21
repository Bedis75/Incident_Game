"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Category = "red" | "blue" | "green";
type SpaceType = Category | "neutral";

type TeamState = {
  id: string;
  name: string;
  token: string;
  colorClass: string;
  position: number;
  wedges: Record<Category, number>;
};

type Question = {
  category: Category;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

type TrapContext = "championship";

const CATEGORY_LABEL: Record<Category, string> = {
  red: "Detection & Logging",
  blue: "Triage & Diagnosis",
  green: "Resolution & Closure",
};

const CATEGORY_KEYS: Category[] = ["red", "blue", "green"];

const SPACES: SpaceType[] = Array.from({ length: 24 }, (_, index) => {
  const cycle = index % 4;
  if (cycle === 0) return "red";
  if (cycle === 1) return "blue";
  if (cycle === 2) return "green";
  return "neutral";
});

const QUESTION_DECK: Question[] = [
  {
    category: "red",
    prompt: "What should happen first when an alert triggers?",
    options: [
      "Ignore it until users report impact",
      "Log and create or update an incident ticket",
      "Close monitoring to reduce noise",
      "Jump directly to closure",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "red",
    prompt: "Give one common source of incidents.",
    options: [
      "Monitoring alert or user report",
      "Holiday calendar entry",
      "Coffee machine notification",
      "Office parking shortage",
    ],
    correctOptionIndex: 0,
  },
  {
    category: "red",
    prompt: "What is the purpose of incident classification?",
    options: [
      "To make incident tickets longer",
      "To route and prioritize incidents correctly",
      "To remove SLA commitments",
      "To skip communication",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "blue",
    prompt: "What two factors determine incident priority?",
    options: [
      "Age and team size",
      "Impact and urgency",
      "Shift timing and weather",
      "Budget and hardware brand",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "blue",
    prompt: "When should an incident be escalated?",
    options: [
      "Only after closure",
      "When SLA risk is high or expertise is missing",
      "Never",
      "Only if no ticket exists",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "blue",
    prompt: "Why communicate during triage?",
    options: [
      "To create extra approvals",
      "To align responders and keep stakeholders informed",
      "To delay recovery",
      "To hide incident impact",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "green",
    prompt: "What is a workaround in incident management?",
    options: [
      "A final permanent fix",
      "A temporary action to restore service quickly",
      "A postmortem template",
      "A tool for deleting logs",
    ],
    correctOptionIndex: 1,
  },
  {
    category: "green",
    prompt: "What should be verified before closure?",
    options: [
      "Service restored, fix validated, and users confirmed",
      "Only ticket title updated",
      "Only manager informed",
      "No verification needed",
    ],
    correctOptionIndex: 0,
  },
  {
    category: "green",
    prompt: "Why capture lessons learned?",
    options: [
      "To prevent recurrence and improve response process",
      "To reduce monitoring visibility",
      "To avoid documenting root causes",
      "To skip closure checks",
    ],
    correctOptionIndex: 0,
  },
];

const TRAP_ACTIVITIES = [
  "Name 3 actions to stabilize an incident in 20 seconds.",
  "Give one escalation reason and one communication channel.",
  "State a quick workaround and one verification step.",
  "List impact, urgency, and one SLA-related action.",
  "Name one likely root cause and one containment action.",
  "Give a closure check and one lesson learned item.",
];

const categoryClass: Record<SpaceType, string> = {
  red: "ig-red",
  blue: "ig-blue",
  green: "ig-green",
  neutral: "ig-neutral",
};

function hasAllWedges(team: TeamState) {
  return team.wedges.red >= 2 && team.wedges.blue >= 2 && team.wedges.green >= 2;
}

function randomFrom<T>(list: T[]) {
  return list[Math.floor(Math.random() * list.length)];
}

function getPipPattern(face: number): number[] {
  if (face === 1) return [4];
  if (face === 2) return [0, 8];
  if (face === 3) return [0, 4, 8];
  if (face === 4) return [0, 2, 6, 8];
  if (face === 5) return [0, 2, 4, 6, 8];
  return [0, 2, 3, 5, 6, 8];
}

type PinMarker = {
  team: TeamState;
  stackClass: string;
  layerClass: string;
};

type QcmFeedback = {
  selectedOptionIndex: number;
  correct: boolean;
};

export default function GameBoardPage() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() || "Player";
  const sessionCode = searchParams.get("sessionCode")?.trim() || "AUTO-SESSION";
  const initialTeams = useMemo<TeamState[]>(
    () => [
      {
        id: "team-1",
        name: `${username} Team`,
        token: "Y",
        colorClass: "team-color-yellow",
        position: 0,
        wedges: { red: 0, blue: 0, green: 0 },
      },
      {
        id: "team-2",
        name: "Alpha Team",
        token: "A",
        colorClass: "team-color-cyan",
        position: 0,
        wedges: { red: 0, blue: 0, green: 0 },
      },
      {
        id: "team-3",
        name: "Bravo Team",
        token: "B",
        colorClass: "team-color-pink",
        position: 0,
        wedges: { red: 0, blue: 0, green: 0 },
      },
      {
        id: "team-4",
        name: "Charlie Team",
        token: "C",
        colorClass: "team-color-green",
        position: 0,
        wedges: { red: 0, blue: 0, green: 0 },
      },
    ],
    [username],
  );

  const [teams, setTeams] = useState<TeamState[]>(initialTeams);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [turnMessage, setTurnMessage] = useState(
    "Roll d6 and move clockwise. Red/Blue/Green: answer QCM. Neutral: roll again or move +1.",
  );
  const [pendingQuestion, setPendingQuestion] = useState<Question | null>(null);
  const [pendingTrapActivity, setPendingTrapActivity] = useState<string | null>(null);
  const [pendingTrapContext, setPendingTrapContext] = useState<TrapContext | null>(null);
  const [pendingNeutral, setPendingNeutral] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [rollingFace, setRollingFace] = useState(1);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [qcmFeedback, setQcmFeedback] = useState<QcmFeedback | null>(null);
  const [isQcmVisible, setIsQcmVisible] = useState(false);
  const qcmShowTimeoutRef = useRef<number | null>(null);
  const qcmHideTimeoutRef = useRef<number | null>(null);

  const currentTeam = teams[currentTeamIndex];

  const clearQcmTimers = () => {
    if (qcmShowTimeoutRef.current !== null) {
      window.clearTimeout(qcmShowTimeoutRef.current);
      qcmShowTimeoutRef.current = null;
    }

    if (qcmHideTimeoutRef.current !== null) {
      window.clearTimeout(qcmHideTimeoutRef.current);
      qcmHideTimeoutRef.current = null;
    }
  };

  const advanceTurn = () => {
    clearQcmTimers();
    setPendingQuestion(null);
    setQcmFeedback(null);
    setIsQcmVisible(false);
    setPendingNeutral(false);
    setPendingTrapActivity(null);
    setPendingTrapContext(null);
    setLastRoll(null);
    setCurrentTeamIndex((previous) => (previous + 1) % teams.length);
  };

  useEffect(() => {
    return () => {
      clearQcmTimers();
    };
  }, []);

  const moveAndResolve = (steps: number) => {
    const newTeams = teams.map((team, index) => {
      if (index !== currentTeamIndex) return team;
      return {
        ...team,
        position: (team.position + steps) % SPACES.length,
      };
    });

    setTeams(newTeams);
    const activeTeam = newTeams[currentTeamIndex];
    const landed = SPACES[activeTeam.position];

    if (landed === "neutral") {
      setPendingNeutral(true);
      setTurnMessage(`${activeTeam.name} landed on Neutral. Choose roll again or move +1.`);
      return;
    }

    const categoryDeck = QUESTION_DECK.filter((q) => q.category === landed);
    const chosen = randomFrom(categoryDeck);
    clearQcmTimers();
    setPendingQuestion(chosen);
    setQcmFeedback(null);
    setIsQcmVisible(false);

    qcmShowTimeoutRef.current = window.setTimeout(() => {
      setIsQcmVisible(true);
    }, 2000);

    setTurnMessage(`${activeTeam.name} landed on ${CATEGORY_LABEL[landed]}. Answer to earn a wedge.`);
  };

  const animateDiceRoll = () => {
    return new Promise<number>((resolve) => {
      setIsDiceRolling(true);
      let ticks = 0;
      const totalTicks = 12;

      const intervalId = window.setInterval(() => {
        const face = Math.floor(Math.random() * 6) + 1;
        setRollingFace(face);
        ticks += 1;

        if (ticks < totalTicks) {
          return;
        }

        window.clearInterval(intervalId);
        const finalFace = Math.floor(Math.random() * 6) + 1;
        setRollingFace(finalFace);
        setLastRoll(finalFace);
        setIsDiceRolling(false);
        resolve(finalFace);
      }, 85);
    });
  };

  const onRollDice = async () => {
    if (
      winnerId ||
      pendingQuestion ||
      pendingNeutral ||
      pendingTrapActivity ||
      pendingTrapContext ||
      isDiceRolling
    ) return;
    const roll = await animateDiceRoll();
    moveAndResolve(roll);
  };

  const onNeutralChoice = async (choice: "roll" | "plus") => {
    setPendingNeutral(false);
    if (choice === "roll") {
      if (isDiceRolling) return;
      const roll = await animateDiceRoll();
      moveAndResolve(roll);
      return;
    }

    setLastRoll(1);
    setRollingFace(1);
    moveAndResolve(1);
  };

  const onQuestionOptionSelect = (selectedOptionIndex: number) => {
    if (!pendingQuestion || qcmFeedback || !isQcmVisible) return;
    clearQcmTimers();
    const correct = selectedOptionIndex === pendingQuestion.correctOptionIndex;
    setQcmFeedback({ selectedOptionIndex, correct });

    const category = pendingQuestion.category;
    if (correct) {
      setTeams((previous) =>
        previous.map((team, index) => {
          if (index !== currentTeamIndex) return team;
          if (team.wedges[category] >= 2) {
            return team;
          }

          return {
            ...team,
            wedges: {
              ...team.wedges,
              [category]: team.wedges[category] + 1,
            },
          };
        }),
      );

      setTurnMessage(
        `${currentTeam.name} answered correctly. ${CATEGORY_LABEL[category]} wedge awarded (max 2).`,
      );
    } else {
      setTurnMessage(`${currentTeam.name} answered wrong. Turn ends.`);
    }

    qcmHideTimeoutRef.current = window.setTimeout(() => {
      advanceTurn();
    }, 3000);
  };

  const onAttemptChampionship = () => {
    if (winnerId || pendingQuestion || pendingNeutral || pendingTrapActivity || pendingTrapContext || isDiceRolling) return;
    if (!hasAllWedges(currentTeam)) return;
    setPendingTrapContext("championship");
    setPendingTrapActivity(randomFrom(TRAP_ACTIVITIES));
    setTurnMessage("Championship trap activity: succeed to win, fail and lose one wedge.");
  };

  const onTrapResult = (success: boolean) => {
    if (!pendingTrapContext || !pendingTrapActivity) return;

    if (success) {
      setWinnerId(currentTeam.id);
      setPendingTrapActivity(null);
      setPendingTrapContext(null);
      setTurnMessage(`${currentTeam.name} succeeded in the championship trap and is crowned Incident Management Champion.`);
      return;
    }

    setTeams((previous) =>
      previous.map((team, index) => {
        if (index !== currentTeamIndex) return team;
        const available: Category[] = CATEGORY_KEYS.filter((category) => team.wedges[category] > 0);

        if (available.length === 0) return team;
        const removeFrom = randomFrom(available);
        return {
          ...team,
          wedges: {
            ...team.wedges,
            [removeFrom]: team.wedges[removeFrom] - 1,
          },
        };
      }),
    );

    setTurnMessage(`${currentTeam.name} failed the championship trap and lost one wedge.`);
    advanceTurn();
  };

  const winner = winnerId ? teams.find((team) => team.id === winnerId) : null;
  const diceFace = lastRoll ?? rollingFace;
  const pipPattern = getPipPattern(diceFace);

  const pinMarkers = useMemo<PinMarker[]>(() => {
    const teamsByPosition = new Map<number, TeamState[]>();

    for (const team of teams) {
      const bucket = teamsByPosition.get(team.position) ?? [];
      bucket.push(team);
      teamsByPosition.set(team.position, bucket);
    }

    return teams.map((team) => {
      const bucket = teamsByPosition.get(team.position) ?? [team];
      const indexInBucket = bucket.findIndex((item) => item.id === team.id);
      return {
        team,
        stackClass: `pin-stack-${bucket.length}-${indexInBucket}`,
        layerClass: `pin-layer-${indexInBucket}`,
      };
    });
  }, [teams]);

  return (
    <div className="page-shell board-shell">
      <main className="board-wrap">
        <section className="board-topbar board-topbar-modern">
          <div>
            <p className="board-eyebrow">Live Session</p>
            <h1 className="board-title">Incident Management Champion Board</h1>
          </div>
          <div className="board-top-actions">
            <p className="board-energy">Session {sessionCode}</p>
            <Link href="/" className="board-home-btn" aria-label="Quit to main menu">
              Quit
            </Link>
          </div>
        </section>

        <section className="board-meta board-meta-modern" aria-label="Board details">
          <article className="board-chip">
            <strong>Active Team</strong>
            <span>{currentTeam.name}</span>
          </article>
          <article className="board-chip">
            <strong>Last Roll</strong>
            <span>{lastRoll ?? "-"}</span>
          </article>
          <article className="board-chip">
            <strong>Status</strong>
            <span>{winner ? "Champion crowned" : "In progress"}</span>
          </article>
        </section>

        <section className="board-grid board-grid-modern" aria-label="Main game board">
          <article className="board-panel board-main board-main-modern">
            <h2>Incident Lifecycle Track</h2>
            <div className="ig-track" role="img" aria-label="24-space board with category spaces and tokens">
              <div className="ig-hub ig-hub-red" aria-hidden="true" />
              <div className="ig-hub ig-hub-blue" aria-hidden="true" />
              <div className="ig-hub ig-hub-green" aria-hidden="true" />
              {SPACES.map((space, index) => (
                <div
                  key={index}
                  className={`ig-space ${categoryClass[space]} ig-pos-${index}`}
                >
                  <small className="ig-space-label">{space === "neutral" ? "N" : space.toUpperCase()}</small>
                </div>
              ))}
              {pinMarkers.map(({ team, stackClass, layerClass }) => (
                <div
                  key={`${team.id}-pin`}
                  className={`ig-board-pin-wrap ig-pos-${team.position} ${stackClass} ${layerClass}`}
                  aria-label={`${team.name} position marker`}
                >
                  <span className={`ig-token-pin ${team.colorClass}`}>
                    <span className="ig-token-core" aria-hidden="true" />
                  </span>
                </div>
              ))}
              <div className="ig-center">Resolution Center</div>
            </div>
            <p className="ig-message">{turnMessage}</p>

            {pendingQuestion && isQcmVisible && (
              <div className="ig-qcm-overlay" role="dialog" aria-modal="true" aria-label="Question popup">
                <div className={`ig-qcm-card ${qcmFeedback ? (qcmFeedback.correct ? "qcm-correct" : "qcm-wrong") : ""}`}>
                  <p className="selection-label">QCM ({CATEGORY_LABEL[pendingQuestion.category]})</p>
                  <p className="selection-value">{pendingQuestion.prompt}</p>
                  <div className="ig-qcm-options">
                    {pendingQuestion.options.map((option, optionIndex) => (
                      <button
                        key={`${pendingQuestion.prompt}-${optionIndex}`}
                        type="button"
                        className={`ig-qcm-option ${
                          qcmFeedback
                            ? qcmFeedback.selectedOptionIndex === optionIndex
                              ? qcmFeedback.correct
                                ? "qcm-answer-correct"
                                : "qcm-answer-wrong"
                              : optionIndex === pendingQuestion.correctOptionIndex
                                ? "qcm-answer-correct-ghost"
                                : "qcm-answer-dim"
                            : ""
                        }`}
                        onClick={() => onQuestionOptionSelect(optionIndex)}
                        disabled={Boolean(qcmFeedback)}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {pendingNeutral && (
              <div className="ig-question-box">
                <p className="selection-value">Neutral space action</p>
                <div className="ig-actions-row">
                  <button
                    type="button"
                    className="board-start-btn"
                    onClick={() => onNeutralChoice("roll")}
                    disabled={isDiceRolling}
                  >
                    Roll Again
                  </button>
                  <button
                    type="button"
                    className="board-start-btn host-start-game-btn"
                    onClick={() => onNeutralChoice("plus")}
                  >
                    Move +1
                  </button>
                </div>
              </div>
            )}

            {pendingTrapActivity && pendingTrapContext && (
              <div className="ig-question-box">
                <p className="selection-label">
                  {pendingTrapContext === "championship" ? "Championship trap" : "Blue trap activity"}
                </p>
                <p className="selection-value">{pendingTrapActivity}</p>
                <div className="ig-actions-row">
                  <button type="button" className="board-start-btn" onClick={() => onTrapResult(true)}>
                    Success
                  </button>
                  <button
                    type="button"
                    className="board-start-btn host-start-game-btn"
                    onClick={() => onTrapResult(false)}
                  >
                    Failure
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="board-panel board-side-panel">
            <h2>Match Panel</h2>
            {teams.map((team, index) => (
              <div key={team.id} className={`selection-card ${index === currentTeamIndex ? "ig-active-team" : ""}`}>
                <p className="selection-value team-name-row">
                  <span className={`team-color-dot ${team.colorClass}`} aria-hidden="true" />
                  <span>{team.name}</span>
                </p>
                <p className="selection-value compact">
                  Red {team.wedges.red}/2 | Blue {team.wedges.blue}/2 | Green {team.wedges.green}/2
                </p>
                <p className="selection-value compact">Position {team.position + 1} / 24</p>
              </div>
            ))}

            <button
              type="button"
              className="board-start-btn"
              onClick={onRollDice}
              disabled={
                Boolean(winner) ||
                Boolean(pendingQuestion) ||
                pendingNeutral ||
                Boolean(pendingTrapActivity) ||
                Boolean(pendingTrapContext) ||
                isDiceRolling
              }
            >
              Roll Dice
            </button>

            <div
              className={`board-dice-widget ${isDiceRolling ? "rolling" : ""}`}
              aria-live="polite"
              aria-label="Dice animation"
            >
              <div className="board-dice-face" role="img" aria-label={`Dice face ${diceFace}`}>
                {Array.from({ length: 9 }, (_, index) => (
                  <span
                    key={`pip-${index}`}
                    className={`board-dice-pip ${pipPattern.includes(index) ? "active" : ""}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="board-dice-label">
                {isDiceRolling ? "Rolling..." : `Dice face: ${diceFace}`}
              </p>
            </div>

            <button
              type="button"
              className="board-start-btn host-start-game-btn"
              onClick={onAttemptChampionship}
              disabled={
                Boolean(winner) ||
                !hasAllWedges(currentTeam) ||
                Boolean(pendingQuestion) ||
                pendingNeutral ||
                Boolean(pendingTrapActivity) ||
                Boolean(pendingTrapContext) ||
                isDiceRolling
              }
            >
              Attempt Championship Trap
            </button>

            {winner && (
              <div className="selection-card ig-winner-card">
                <p className="selection-label">Champion</p>
                <p className="selection-value">{winner.name}</p>
                <p className="selection-value compact">Incident Management Champion crowned.</p>
              </div>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}
