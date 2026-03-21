"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

const TEAM_OPTIONS = [
  {
    id: "team-alpha",
    name: "Team Alpha",
    players: ["Nora", "Ibrahim", "Lea"],
    colorClass: "team-card-red",
  },
  {
    id: "team-bravo",
    name: "Team Bravo",
    players: ["Mateo", "Chen", "Sana"],
    colorClass: "team-card-blue",
  },
  {
    id: "team-charlie",
    name: "Team Charlie",
    players: ["Ava", "Rami", "Noah"],
    colorClass: "team-card-green",
  },
  {
    id: "team-delta",
    name: "Team Delta",
    players: ["Zoe", "Karim", "Mina"],
    colorClass: "team-card-violet",
  },
];

const TEAM_COLOR_CLASSES = [
  "team-card-red",
  "team-card-blue",
  "team-card-green",
  "team-card-violet",
];

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() || "Player";
  const mode = searchParams.get("mode") === "create" ? "create" : "join";
  const sessionCode = searchParams.get("sessionCode")?.trim() || "AUTO-SESSION";
  const [selectedTeam, setSelectedTeam] = useState<string>(TEAM_OPTIONS[0].id);
  const [isLocked, setIsLocked] = useState(false);
  const [isTeamsSaved, setIsTeamsSaved] = useState(false);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [nextTeamNumber, setNextTeamNumber] = useState(TEAM_OPTIONS.length + 1);
  const [hostTeams, setHostTeams] = useState(
    TEAM_OPTIONS.map((team) => ({
      id: team.id,
      name: team.name,
      playersText: team.players.join(", "),
      colorClass: team.colorClass,
    })),
  );

  const selectedTeamInfo = TEAM_OPTIONS.find((team) => team.id === selectedTeam);
  const selectedTeamPlayers = selectedTeamInfo?.players ?? [];

  const sessionPlayers = useMemo(() => {
    const fromTeams =
      mode === "create"
        ? hostTeams
            .flatMap((team) => team.playersText.split(","))
            .map((name) => name.trim())
            .filter(Boolean)
        : TEAM_OPTIONS.flatMap((team) => team.players);

    const merged = [username, ...fromTeams];
    return Array.from(new Set(merged));
  }, [hostTeams, mode, username]);

  const updateHostTeam = (
    teamId: string,
    field: "name" | "playersText",
    value: string,
  ) => {
    setHostTeams((previous) =>
      previous.map((team) =>
        team.id === teamId
          ? {
              ...team,
              [field]: value,
            }
          : team,
      ),
    );
    setIsTeamsSaved(false);
  };

  const addHostTeam = () => {
    setHostTeams((previous) => {
      const colorClass = TEAM_COLOR_CLASSES[previous.length % TEAM_COLOR_CLASSES.length];
      return [
        ...previous,
        {
          id: `team-custom-${Date.now()}`,
          name: `Team ${nextTeamNumber}`,
          playersText: "",
          colorClass,
        },
      ];
    });
    setNextTeamNumber((value) => value + 1);
    setIsTeamsSaved(false);
  };

  const removeHostTeam = (teamId: string) => {
    setHostTeams((previous) => {
      if (previous.length <= 1) {
        return previous;
      }

      return previous.filter((team) => team.id !== teamId);
    });
    setIsTeamsSaved(false);
  };

  return (
    <div className="page-shell tc-shell">
      <main className="tc-wrap">
        <header className="tc-header">
          <h1>Incident Management Champion</h1>
          <p>SESSION CODE: {sessionCode}</p>
        </header>

        <section className="tc-layout" aria-label="Team choosing layout">
          <article className={`tc-main-panel ${mode === "create" ? "tc-main-panel-host" : ""}`}>
            <h2>{mode === "create" ? "Manage Teams" : "Select Team"}</h2>
            {mode === "create" ? (
              <>
                <div className="tc-host-tools-row">
                  <p className="tc-host-badge">Host: {username}</p>
                  <button type="button" className="tc-btn tc-btn-small" onClick={addHostTeam}>
                    Add Team
                  </button>
                </div>

                <div className="team-builder-grid" role="list" aria-label="Team builder">
                  {hostTeams.map((team) => (
                    <article
                      key={team.id}
                      role="listitem"
                      className={`team-builder-card ${team.colorClass}`}
                    >
                      <div className="team-builder-card-head">
                        <p>{team.name}</p>
                        <button
                          type="button"
                          className="team-delete-btn tc-btn-danger"
                          onClick={() => removeHostTeam(team.id)}
                          disabled={hostTeams.length <= 1}
                          aria-label={`Delete ${team.name}`}
                        >
                          Delete
                        </button>
                      </div>

                      <label htmlFor={`${team.id}-name`}>Team Name</label>
                      <input
                        id={`${team.id}-name`}
                        type="text"
                        value={team.name}
                        onChange={(event) =>
                          updateHostTeam(team.id, "name", event.target.value)
                        }
                      />

                      <ul className="team-players-list" aria-label={`${team.name} players`}>
                        {team.playersText
                          .split(",")
                          .map((player) => player.trim())
                          .filter(Boolean)
                          .map((player) => (
                            <li key={`${team.id}-${player}`} className="team-player-line">
                              <span className="team-player-avatar" aria-hidden="true">
                                {player.slice(0, 1).toUpperCase()}
                              </span>
                              <span className="team-player-name">{player}</span>
                            </li>
                          ))}
                      </ul>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="team-card-grid" role="list" aria-label="Teams">
                  {TEAM_OPTIONS.map((team) => {
                    const isSelected = selectedTeam === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        role="listitem"
                        className={`team-card team-card-name-only ${team.colorClass} ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedTeam(team.id);
                          setIsLocked(false);
                        }}
                      >
                        <div className="team-card-head">
                          <strong>{team.name}</strong>
                          <span className="team-size-badge">{team.players.length} players</span>
                        </div>
                        <small>{isSelected ? "Selected" : "Click to select"}</small>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </article>

          <aside className="tc-right-panel">
            {mode === "create" ? (
              <>
                <h3>PLAYERS: {sessionPlayers.length}</h3>
                <div className="tc-player-list">
                  {sessionPlayers.map((player, index) => (
                    <p key={`${player}-${index}`} className="tc-player-item">
                      {player}
                    </p>
                  ))}
                </div>

                <button
                  type="button"
                  className="tc-btn"
                  onClick={() => {
                    setIsTeamsSaved(true);
                    setHasGameStarted(false);
                  }}
                >
                  Save Teams
                </button>

                <button
                  type="button"
                  className="tc-btn"
                  disabled={!isTeamsSaved || hasGameStarted}
                  onClick={() => {
                    setHasGameStarted(true);
                    const params = new URLSearchParams({
                      username,
                      sessionCode,
                    });
                    router.push(`/board?${params.toString()}`);
                  }}
                >
                  {hasGameStarted ? "Game Started" : "Start Game"}
                </button>
              </>
            ) : (
              <>
                <h3>{selectedTeamInfo?.name ?? "Selected Team"}</h3>
                <p className="team-select-help">Players in selected team:</p>
                <div className="tc-player-list" aria-label="Selected team players">
                  {selectedTeamPlayers.map((player) => (
                    <p key={`${selectedTeam}-${player}`} className="tc-player-item">
                      {player}
                    </p>
                  ))}
                </div>
                <button
                  type="button"
                  className="tc-btn"
                  onClick={() => setIsLocked(true)}
                >
                  {isLocked ? "Team Locked" : `Join ${selectedTeamInfo?.name}`}
                </button>
              </>
            )}
            <Link href="/" className="tc-back-link" aria-label="Back to menu">
              Back to Menu
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}
