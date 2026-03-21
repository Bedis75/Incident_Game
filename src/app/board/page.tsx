"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

type Category = "red" | "blue" | "green";
type SpaceType = Category | "neutral";

type TeamState = {
  id: string;
  name: string;
  position: number;
  playerCount: number;
  wedges: Record<Category, number>;
};

type Question = {
  category: Category;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
};

type PendingTrap = {
  context: "championship";
  activity: string;
};

type AnswerReveal = {
  question: Question;
  selectedOptionIndex: number;
  correct: boolean;
  correctOptionIndex: number;
  teamId: string;
  teamName: string;
  hideAt: number;
};

type GameState = {
  teams: TeamState[];
  currentTeamIndex: number;
  lastRoll: number | null;
  rollSequence: number;
  turnMessage: string;
  pendingQuestion: Question | null;
  answerReveal: AnswerReveal | null;
  pendingNeutral: boolean;
  pendingTrap: PendingTrap | null;
  winnerId: string | null;
  viewerTeamId: string | null;
  viewerIsHost: boolean;
  updatedAt: string;
};

type QcmFeedback = {
  selectedOptionIndex: number;
  correct: boolean;
  correctOptionIndex: number;
};

const CATEGORY_KEYS: Category[] = ["red", "blue", "green"];
const SPACES: SpaceType[] = Array.from({ length: 24 }, (_, index) => {
  const cycle = index % 4;
  if (cycle === 0) return "red";
  if (cycle === 1) return "blue";
  if (cycle === 2) return "green";
  return "neutral";
});

const categoryClass: Record<SpaceType, string> = {
  red: "ig-red",
  blue: "ig-blue",
  green: "ig-green",
  neutral: "ig-neutral",
};

const TEAM_COLOR_CLASSES = [
  "team-color-yellow",
  "team-color-cyan",
  "team-color-pink",
  "team-color-green",
];

function getPipPattern(face: number): number[] {
  if (face === 1) return [4];
  if (face === 2) return [0, 8];
  if (face === 3) return [0, 4, 8];
  if (face === 4) return [0, 2, 6, 8];
  if (face === 5) return [0, 2, 4, 6, 8];
  return [0, 2, 3, 5, 6, 8];
}

function hasAllWedges(team: TeamState | null) {
  if (!team) return false;
  return team.wedges.red >= 2 && team.wedges.blue >= 2 && team.wedges.green >= 2;
}

export default function GameBoardPage() {
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() || "";
  const sessionCode = searchParams.get("sessionCode")?.trim() || "";
  const playerId = searchParams.get("playerId")?.trim() || "";
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [qcmFeedback, setQcmFeedback] = useState<QcmFeedback | null>(null);
  const [displayQuestion, setDisplayQuestion] = useState<Question | null>(null);
  const [isQcmVisible, setIsQcmVisible] = useState(false);
  const [rollingFace, setRollingFace] = useState(1);
  const [isDiceRolling, setIsDiceRolling] = useState(false);
  const [frozenTeams, setFrozenTeams] = useState<TeamState[] | null>(null);

  const previousGameStateRef = useRef<GameState | null>(null);
  const previousRollSequenceRef = useRef<number>(0);
  const previousLastRollRef = useRef<number | null>(null);
  const questionKeyRef = useRef("");
  const qcmShowTimeoutRef = useRef<number | null>(null);
  const qcmHideTimeoutRef = useRef<number | null>(null);

  const currentTeam =
    gameState && gameState.teams.length > 0
      ? gameState.teams[gameState.currentTeamIndex] || null
      : null;

  const winner = gameState?.winnerId
    ? gameState.teams.find((team) => team.id === gameState.winnerId) || null
    : null;

  const diceFace = isDiceRolling ? rollingFace : gameState?.lastRoll ?? rollingFace;
  const pipPattern = getPipPattern(diceFace);

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

  const syncGameState = async () => {
    if (!sessionCode) {
      return;
    }

    const response = await fetch(
      `${apiBaseUrl}/api/sessions/${sessionCode}/game-state?playerId=${encodeURIComponent(playerId)}`,
    );
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "Could not load game state.");
    }

    setGameState(payload.gameState);
  };

  useEffect(() => {
    if (!sessionCode) {
      setStatusMessage("Missing session code. Return to menu and join a valid session.");
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const poll = async () => {
      try {
        await syncGameState();
        if (!isCancelled) {
          setStatusMessage("");
          setIsLoading(false);
        }
      } catch (error) {
        if (!isCancelled) {
          setStatusMessage(error instanceof Error ? error.message : "Could not sync game state.");
          setIsLoading(false);
        }
      }
    };

    void poll();
    const intervalId = window.setInterval(poll, 1000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [apiBaseUrl, sessionCode]);

  useEffect(() => {
    return () => {
      clearQcmTimers();
    };
  }, []);

  useEffect(() => {
    const rollSequence = Number(gameState?.rollSequence || 0);
    const lastRoll = gameState?.lastRoll ?? null;
    const hasSequenceTrigger = rollSequence > 0 && previousRollSequenceRef.current !== rollSequence;
    const hasLastRollFallbackTrigger = rollSequence === 0 && lastRoll !== null && previousLastRollRef.current !== lastRoll;

    if (lastRoll === null || (!hasSequenceTrigger && !hasLastRollFallbackTrigger)) {
      previousGameStateRef.current = gameState;
      return;
    }

    const previousTeams = previousGameStateRef.current?.teams || null;
    setFrozenTeams(previousTeams);
    if (hasSequenceTrigger) {
      previousRollSequenceRef.current = rollSequence;
    }
    previousLastRollRef.current = lastRoll;
    setIsDiceRolling(true);
    let ticks = 0;
    const totalTicks = 12;

    const intervalId = window.setInterval(() => {
      setRollingFace(Math.floor(Math.random() * 6) + 1);
      ticks += 1;

      if (ticks < totalTicks) {
        return;
      }

      window.clearInterval(intervalId);
      setRollingFace(lastRoll);
      setIsDiceRolling(false);
      setFrozenTeams(null);
    }, 85);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState?.lastRoll, gameState?.rollSequence]);

  useEffect(() => {
    previousGameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    const answerReveal = gameState?.answerReveal ?? null;
    if (!answerReveal) {
      setQcmFeedback(null);
      setDisplayQuestion(null);
      setIsQcmVisible(false);
      return;
    }

    clearQcmTimers();
    setDisplayQuestion(answerReveal.question);
    setQcmFeedback({
      selectedOptionIndex: answerReveal.selectedOptionIndex,
      correct: answerReveal.correct,
      correctOptionIndex: answerReveal.correctOptionIndex,
    });
    setIsQcmVisible(true);

    const msUntilHide = Math.max(0, Number(answerReveal.hideAt || 0) - Date.now());
    qcmHideTimeoutRef.current = window.setTimeout(() => {
      setQcmFeedback(null);
      setDisplayQuestion(null);
      setIsQcmVisible(false);
    }, msUntilHide);
  }, [gameState?.answerReveal]);

  useEffect(() => {
    const pendingQuestion = gameState?.pendingQuestion ?? null;
    const answerReveal = gameState?.answerReveal ?? null;

    if (answerReveal) {
      return;
    }

    if (isDiceRolling) {
      return;
    }

    if (!pendingQuestion) {
      if (!qcmFeedback) {
        setIsQcmVisible(false);
        setDisplayQuestion(null);
      }
      return;
    }

    const questionKey = `${pendingQuestion.prompt}:${pendingQuestion.correctOptionIndex}`;
    if (questionKeyRef.current === questionKey) {
      return;
    }

    questionKeyRef.current = questionKey;
    clearQcmTimers();
    setDisplayQuestion(pendingQuestion);
    setIsQcmVisible(false);

    qcmShowTimeoutRef.current = window.setTimeout(() => {
      setIsQcmVisible(true);
    }, 2000);
  }, [gameState?.pendingQuestion, gameState?.answerReveal, isDiceRolling, qcmFeedback]);

  const runGameAction = async (path: string, body?: unknown) => {
    if (!sessionCode || isActionLoading) {
      return;
    }

    setIsActionLoading(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(payload?.error || "Game action failed.");
        if (payload?.gameState) {
          setGameState(payload.gameState);
        }
        return;
      }

      if (payload?.gameState) {
        setGameState(payload.gameState);
      }

      return payload;
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
      return undefined;
    } finally {
      setIsActionLoading(false);
    }
  };

  const onRollDice = async () => {
    setQcmFeedback(null);
    await runGameAction("/game/roll", { actorPlayerId: playerId || undefined });
  };

  const onNeutralChoice = async (choice: "roll" | "plus") => {
    setQcmFeedback(null);
    await runGameAction("/game/neutral", {
      choice,
      actorPlayerId: playerId || undefined,
    });
  };

  const onQuestionOptionSelect = async (selectedOptionIndex: number) => {
    if (!displayQuestion || qcmFeedback || isActionLoading) return;
    if (!canActThisTurn) return;

    await runGameAction("/game/answer", {
      selectedOptionIndex,
      actorPlayerId: playerId || undefined,
    });
  };

  const onAttemptChampionship = async () => {
    await runGameAction("/game/trap-attempt", {
      actorPlayerId: playerId || undefined,
    });
  };

  const onTrapResult = async (success: boolean) => {
    await runGameAction("/game/trap-result", {
      success,
      actorPlayerId: playerId || undefined,
    });
  };

  const teamsForRender =
    isDiceRolling && frozenTeams
      ? frozenTeams
      : gameState?.teams || [];

  const pinMarkers = useMemo(() => {
    if (teamsForRender.length === 0) return [];

    const teamsByPosition = new Map<number, TeamState[]>();

    for (const team of teamsForRender) {
      const bucket = teamsByPosition.get(team.position) ?? [];
      bucket.push(team);
      teamsByPosition.set(team.position, bucket);
    }

    return teamsForRender.map((team) => {
      const bucket = teamsByPosition.get(team.position) ?? [team];
      const indexInBucket = bucket.findIndex((item) => item.id === team.id);
      return {
        team,
        stackClass: `pin-stack-${bucket.length}-${indexInBucket}`,
        layerClass: `pin-layer-${indexInBucket}`,
      };
    });
  }, [teamsForRender]);

  const busy =
    isActionLoading ||
    !gameState ||
    isLoading;

  const canActThisTurn =
    Boolean(gameState?.viewerTeamId) &&
    Boolean(currentTeam) &&
    gameState?.viewerTeamId === currentTeam?.id;

  const actionLocked =
    busy ||
    Boolean(qcmFeedback) ||
    isDiceRolling;

  return (
    <div className="page-shell board-shell">
      <main className="board-wrap">
        <section className="board-topbar board-topbar-modern">
          <div>
            <p className="board-eyebrow">Live Session</p>
            <h1 className="board-title">Incident Management Champion Board</h1>
          </div>
          <div className="board-top-actions">
            <p className="board-energy">Session {sessionCode || "-"}</p>
            <Link href="/" className="board-home-btn" aria-label="Quit to main menu">
              Quit
            </Link>
          </div>
        </section>

        <section className="board-meta board-meta-modern" aria-label="Board details">
          <article className="board-chip">
            <strong>Active Team</strong>
            <span>{currentTeam?.name || "-"}</span>
          </article>
          <article className="board-chip">
            <strong>Last Roll</strong>
            <span>{gameState?.lastRoll ?? "-"}</span>
          </article>
          <article className="board-chip">
            <strong>Status</strong>
            <span>{isLoading ? "Loading" : winner ? "Champion crowned" : "In progress"}</span>
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
              {pinMarkers.map(({ team, stackClass, layerClass }, teamIndex) => (
                <div
                  key={`${team.id}-pin`}
                  className={`ig-board-pin-wrap ig-pos-${team.position} ${stackClass} ${layerClass}`}
                  aria-label={`${team.name} position marker`}
                >
                  <span className={`ig-token-pin ${TEAM_COLOR_CLASSES[teamIndex % TEAM_COLOR_CLASSES.length]}`}>
                    <span className="ig-token-core" aria-hidden="true" />
                  </span>
                </div>
              ))}
              <div className="ig-center">Resolution Center</div>
            </div>
            <p className="ig-message">{statusMessage || gameState?.turnMessage || "-"}</p>

            {displayQuestion && isQcmVisible && (
              <div className="ig-qcm-overlay" role="dialog" aria-modal="true" aria-label="Question popup">
                <div className={`ig-qcm-card ${qcmFeedback ? (qcmFeedback.correct ? "qcm-correct" : "qcm-wrong") : ""}`}>
                  <p className="selection-label">QCM</p>
                  <p className="selection-value">{displayQuestion.prompt}</p>
                  <div className="ig-qcm-options">
                    {displayQuestion.options.map((option, optionIndex) => (
                      <button
                        key={`${displayQuestion.prompt}-${optionIndex}`}
                        type="button"
                        className={`ig-qcm-option ${
                          qcmFeedback
                            ? qcmFeedback.selectedOptionIndex === optionIndex
                              ? qcmFeedback.correct
                                ? "qcm-answer-correct"
                                : "qcm-answer-wrong"
                              : optionIndex === qcmFeedback.correctOptionIndex
                                ? "qcm-answer-correct-ghost"
                                : "qcm-answer-dim"
                            : ""
                        }`}
                        onClick={() => onQuestionOptionSelect(optionIndex)}
                        disabled={busy || isDiceRolling || !canActThisTurn || Boolean(qcmFeedback)}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {gameState?.pendingNeutral && (
              <div className="ig-question-box">
                <p className="selection-value">Neutral space action</p>
                <div className="ig-actions-row">
                  <button
                    type="button"
                    className="board-start-btn"
                    onClick={() => onNeutralChoice("roll")}
                    disabled={actionLocked || !canActThisTurn}
                  >
                    Roll Again
                  </button>
                  <button
                    type="button"
                    className="board-start-btn host-start-game-btn"
                    onClick={() => onNeutralChoice("plus")}
                    disabled={actionLocked || !canActThisTurn}
                  >
                    Move +1
                  </button>
                </div>
              </div>
            )}

            {gameState?.pendingTrap && (
              <div className="ig-question-box">
                <p className="selection-label">Championship trap</p>
                <p className="selection-value">{gameState.pendingTrap.activity}</p>
                <div className="ig-actions-row">
                  <button type="button" className="board-start-btn" onClick={() => onTrapResult(true)} disabled={actionLocked || !canActThisTurn}>
                    Success
                  </button>
                  <button
                    type="button"
                    className="board-start-btn host-start-game-btn"
                    onClick={() => onTrapResult(false)}
                    disabled={actionLocked || !canActThisTurn}
                  >
                    Failure
                  </button>
                </div>
              </div>
            )}
          </article>

          <article className="board-panel board-side-panel">
            <h2>Match Panel</h2>
            {(gameState?.teams || []).map((team, index) => (
              <div key={team.id} className={`selection-card ${index === gameState?.currentTeamIndex ? "ig-active-team" : ""}`}>
                <p className="selection-value team-name-row">
                  <span className={`team-color-dot ${TEAM_COLOR_CLASSES[index % TEAM_COLOR_CLASSES.length]}`} aria-hidden="true" />
                  <span>{team.name}</span>
                </p>
                <p className="selection-value compact">
                  Red {team.wedges.red}/2 | Blue {team.wedges.blue}/2 | Green {team.wedges.green}/2
                </p>
                <p className="selection-value compact">Players {team.playerCount}</p>
                <p className="selection-value compact">Position {team.position + 1} / 24</p>
              </div>
            ))}

            <button
              type="button"
              className="board-start-btn"
              onClick={onRollDice}
              disabled={
                actionLocked ||
                !canActThisTurn ||
                Boolean(winner) ||
                Boolean(gameState?.pendingQuestion) ||
                Boolean(gameState?.answerReveal) ||
                Boolean(gameState?.pendingNeutral) ||
                Boolean(gameState?.pendingTrap)
              }
            >
              Roll Dice
            </button>

            <div className={`board-dice-widget ${isDiceRolling ? "rolling" : ""}`} aria-live="polite" aria-label="Dice animation">
              <div className="board-dice-face" role="img" aria-label={`Dice face ${diceFace}`}>
                {Array.from({ length: 9 }, (_, index) => (
                  <span
                    key={`pip-${index}`}
                    className={`board-dice-pip ${pipPattern.includes(index) ? "active" : ""}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="board-dice-label">{isDiceRolling ? "Rolling..." : `Dice face: ${diceFace}`}</p>
            </div>

            <button
              type="button"
              className="board-start-btn host-start-game-btn"
              onClick={onAttemptChampionship}
              disabled={
                actionLocked ||
                !canActThisTurn ||
                Boolean(winner) ||
                !hasAllWedges(currentTeam) ||
                Boolean(gameState?.pendingQuestion) ||
                Boolean(gameState?.answerReveal) ||
                Boolean(gameState?.pendingNeutral) ||
                Boolean(gameState?.pendingTrap)
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

            <p className="selection-value compact">Player: {username || "-"}</p>
            <p className="selection-value compact">
              {canActThisTurn ? "Your team turn" : "Waiting for active team"}
            </p>
            <p className="selection-value compact">Session sync at 1s interval</p>
          </article>
        </section>
      </main>
    </div>
  );
}
