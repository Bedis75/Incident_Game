"use client";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SessionPlayer = {
  id: string;
  username: string;
  isHost: boolean;
  teamId: string | null;
};

type SessionTeam = {
  id: string;
  name: string;
  playerIds: string[];
};

type ActivityEvent = {
  id: string;
  at: string;
  type: string;
  message: string;
  playerId?: string;
  username?: string;
  teamId?: string | null;
};

type ToastNotice = {
  id: string;
  message: string;
};

type HostTeamDraft = {
  id: string;
  name: string;
  colorClass: string;
};

const TEAM_COLOR_CLASSES = [
  "team-card-red",
  "team-card-blue",
  "team-card-green",
  "team-card-violet",
];

export default function TeamChoosingClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username")?.trim() || "";
  const mode = searchParams.get("mode") === "create" ? "create" : "join";
  const sessionCode = searchParams.get("sessionCode")?.trim() || "";
  const playerId = searchParams.get("playerId")?.trim() || "";
  const hostPlayerIdFromParams = searchParams.get("hostPlayerId")?.trim() || "";
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [isLocked, setIsLocked] = useState(false);
  const [isTeamsSaved, setIsTeamsSaved] = useState(false);
  const [hasGameStarted, setHasGameStarted] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [sessionHostPlayerId, setSessionHostPlayerId] = useState(hostPlayerIdFromParams);
  const [sessionPlayers, setSessionPlayers] = useState<SessionPlayer[]>([]);
  const [sessionTeams, setSessionTeams] = useState<SessionTeam[]>([]);
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const [toasts, setToasts] = useState<ToastNotice[]>([]);
  const [hostTeams, setHostTeams] = useState<HostTeamDraft[]>([
    {
      id: "team-custom-1",
      name: "",
      colorClass: TEAM_COLOR_CLASSES[0],
    },
    {
      id: "team-custom-2",
      name: "",
      colorClass: TEAM_COLOR_CLASSES[1],
    },
  ]);

  const startedRedirectRef = useRef(false);
  const didHydrateHostTeamsRef = useRef(false);
  const didPrimeEventsRef = useRef(false);
  const seenEventIdsRef = useRef<Set<string>>(new Set());
  const leaveNotifiedRef = useRef(false);
  const suppressLeaveRef = useRef(false);

  const isHost = Boolean(sessionHostPlayerId && playerId && sessionHostPlayerId === playerId);

  const selectedTeamInfo = useMemo(
    () => sessionTeams.find((team) => team.id === selectedTeam),
    [selectedTeam, sessionTeams],
  );

  const selectedTeamPlayers = useMemo(
    () =>
      sessionPlayers
        .filter((player) => player.teamId === selectedTeam)
        .map((player) => player.username),
    [selectedTeam, sessionPlayers],
  );

  const pushToast = useCallback((message: string) => {
    const notice = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
    };

    setToasts((previous) => [...previous.slice(-2), notice]);
    window.setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== notice.id));
    }, 4200);
  }, []);

  const fetchSession = useCallback(async () => {
    if (!sessionCode) {
      return;
    }

    const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload?.error || "Could not fetch session.");
    }

    const hostId = payload.session.hostPlayerId || "";
    const players: SessionPlayer[] = Array.isArray(payload.session.players)
      ? payload.session.players
      : [];
    const teams: SessionTeam[] = Array.isArray(payload.session.teams)
      ? payload.session.teams
      : [];
    const events = Array.isArray(payload.session.activityEvents)
      ? (payload.session.activityEvents as ActivityEvent[])
      : [];

    setSessionHostPlayerId(hostId);
    setSessionPlayers(players);
    setSessionTeams(teams);
    setActivityEvents(events);
    setIsTeamsSaved(teams.length > 0);

    if (!didPrimeEventsRef.current) {
      for (const event of events) {
        seenEventIdsRef.current.add(event.id);
      }
      didPrimeEventsRef.current = true;
    } else {
      const unseen = events.filter((event) => !seenEventIdsRef.current.has(event.id));
      for (const event of unseen) {
        seenEventIdsRef.current.add(event.id);
        if (
          event.type === "player-left" ||
          event.type === "player-rejoined" ||
          event.type === "player-kicked"
        ) {
          pushToast(event.message);
        }
      }
    }

    const currentPlayerExists = players.some((player) => player.id === playerId);
    if (playerId && !currentPlayerExists && !isHost) {
      setStatusMessage("You are no longer in this session.");
      suppressLeaveRef.current = true;
      window.setTimeout(() => router.push("/"), 700);
      return;
    }

    if (!selectedTeam && teams.length > 0) {
      setSelectedTeam(teams[0].id);
    }

    if (!didHydrateHostTeamsRef.current && teams.length > 0) {
      setHostTeams(
        teams.map((team: SessionTeam, index: number) => ({
          id: team.id,
          name: team.name,
          colorClass: TEAM_COLOR_CLASSES[index % TEAM_COLOR_CLASSES.length],
        })),
      );
      didHydrateHostTeamsRef.current = true;
    }

    if (payload.session.status === "in-game" && !startedRedirectRef.current) {
      startedRedirectRef.current = true;
      setHasGameStarted(true);
      suppressLeaveRef.current = true;
      const params = new URLSearchParams({ username, sessionCode, playerId });
      router.push(`/board?${params.toString()}`);
    }
  }, [apiBaseUrl, isHost, playerId, pushToast, router, selectedTeam, sessionCode, username]);

  const updateHostTeam = (teamId: string, field: "name", value: string) => {
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
          name: "",
          colorClass,
        },
      ];
    });
    setIsTeamsSaved(false);
  };

  const getPlayerNamesForTeam = useCallback(
    (teamId: string) => {
      const sessionTeam = sessionTeams.find((team) => team.id === teamId);
      if (!sessionTeam) {
        return [];
      }

      return sessionTeam.playerIds
        .map((id) => sessionPlayers.find((player) => player.id === id)?.username || "")
        .filter(Boolean);
    },
    [sessionPlayers, sessionTeams],
  );

  const removeHostTeam = (teamId: string) => {
    setHostTeams((previous) => {
      if (previous.length <= 1) {
        return previous;
      }
      return previous.filter((team) => team.id !== teamId);
    });
    setIsTeamsSaved(false);
  };

  useEffect(() => {
    if (!sessionCode) {
      return;
    }

    let isCancelled = false;

    const syncSession = async () => {
      try {
        await fetchSession();
      } catch (error) {
        if (!isCancelled) {
          const message = error instanceof Error ? error.message : "Cannot sync session state.";
          if (message.toLowerCase().includes("session not found")) {
            setStatusMessage("Session has been closed by host.");
            suppressLeaveRef.current = true;
            window.setTimeout(() => router.push("/"), 900);
            return;
          }

          setStatusMessage("Cannot sync session state. Check if API is running.");
        }
      }
    };

    void syncSession();
    const intervalId = window.setInterval(syncSession, 2000);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
    };
  }, [fetchSession, router, sessionCode]);

  useEffect(() => {
    if (!sessionCode || !playerId) {
      return;
    }

    const notifyLeave = () => {
      if (leaveNotifiedRef.current || suppressLeaveRef.current) {
        return;
      }

      leaveNotifiedRef.current = true;
      const url = `${apiBaseUrl}/api/sessions/${sessionCode}/leave`;
      const body = JSON.stringify({ playerId });

      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(url, blob);
        return;
      }

      void fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body,
        keepalive: true,
      });
    };

    const handleBeforeUnload = () => {
      notifyLeave();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      notifyLeave();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [apiBaseUrl, playerId, sessionCode]);

  const handleStartGame = async () => {
    if (!isHost || !sessionCode || isStartingGame) {
      return;
    }

    setIsStartingGame(true);
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ hostPlayerId: playerId }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setStatusMessage(payload?.error || "Could not start game.");
        return;
      }

      setHasGameStarted(true);
      startedRedirectRef.current = true;
      suppressLeaveRef.current = true;
      const params = new URLSearchParams({ username, sessionCode, playerId });
      router.push(`/board?${params.toString()}`);
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
    } finally {
      setIsStartingGame(false);
    }
  };

  const handleSaveTeams = async () => {
    if (!isHost || !sessionCode || !playerId) {
      setStatusMessage("Only the host can save teams.");
      return;
    }

    setStatusMessage("");

    try {
      const hasEmptyTeamName = hostTeams.some((team) => !team.name.trim());
      if (hasEmptyTeamName) {
        setStatusMessage("Each team must have a name before saving.");
        return;
      }

      const payload = {
        hostPlayerId: playerId,
        teams: hostTeams.map((team) => ({
          name: team.name.trim(),
          players: getPlayerNamesForTeam(team.id),
        })),
      };

      const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}/teams`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = await response.json();
      if (!response.ok) {
        setStatusMessage(body?.error || "Could not save teams.");
        return;
      }

      const players = Array.isArray(body.session?.players) ? body.session.players : [];
      const teams = Array.isArray(body.session?.teams) ? body.session.teams : [];
      setSessionPlayers(players);
      setSessionTeams(teams);
      if (!selectedTeam && teams.length > 0) {
        setSelectedTeam(teams[0].id);
      }

      setIsTeamsSaved(true);
      setStatusMessage("Teams saved for all players.");
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
    }
  };

  const handleJoinSelectedTeam = async () => {
    if (!playerId || !selectedTeam || !sessionCode) {
      return;
    }

    setStatusMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}/players/${playerId}/team`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ teamId: selectedTeam }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setStatusMessage(payload?.error || "Could not join selected team.");
        return;
      }

      setIsLocked(true);
      setStatusMessage("Team joined. Waiting for host to start the game.");
      await fetchSession();
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
    }
  };

  const handleKickPlayer = async (targetPlayerId: string) => {
    if (!isHost || !sessionCode || !playerId) {
      return;
    }

    setStatusMessage("");

    try {
      const response = await fetch(
        `${apiBaseUrl}/api/sessions/${sessionCode}/players/${targetPlayerId}/kick`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ hostPlayerId: playerId }),
        },
      );

      const payload = await response.json();
      if (!response.ok) {
        setStatusMessage(payload?.error || "Could not remove player.");
        return;
      }

      setSessionPlayers(Array.isArray(payload.session?.players) ? payload.session.players : []);
      setSessionTeams(Array.isArray(payload.session?.teams) ? payload.session.teams : []);
      setActivityEvents(
        Array.isArray(payload.session?.activityEvents) ? payload.session.activityEvents : [],
      );
      setStatusMessage("Player removed by host.");
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
    }
  };

  const handleLeaveSession = async () => {
    if (!sessionCode || !playerId) {
      router.push("/");
      return;
    }

    leaveNotifiedRef.current = true;
    setStatusMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions/${sessionCode}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerId }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setStatusMessage(payload?.error || "Could not leave session.");
        leaveNotifiedRef.current = false;
        return;
      }

      suppressLeaveRef.current = true;
      router.push("/");
    } catch {
      setStatusMessage("Could not reach API. Start incident_game_api first.");
      leaveNotifiedRef.current = false;
    }
  };

  return (
    <div className="page-shell tc-shell">
      {toasts.length > 0 && (
        <aside className="tc-toast-stack" aria-live="polite">
          {toasts.map((toast) => (
            <p key={toast.id} className="tc-toast-item">
              {toast.message}
            </p>
          ))}
        </aside>
      )}
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
                        <p>{team.name || ""}</p>
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
                        onChange={(event) => updateHostTeam(team.id, "name", event.target.value)}
                        placeholder="Enter team name"
                      />

                      <ul className="team-players-list" aria-label={`${team.name} players`}>
                        {getPlayerNamesForTeam(team.id).map((player) => (
                          <li key={`${team.id}-${player}`} className="team-player-line">
                            <span className="team-player-avatar" aria-hidden="true">
                              {player.slice(0, 1).toUpperCase()}
                            </span>
                            <span className="team-player-name">{player}</span>
                          </li>
                        ))}
                        {getPlayerNamesForTeam(team.id).length === 0 && (
                          <li className="team-player-line">
                            <span className="team-player-name">No players assigned yet</span>
                          </li>
                        )}
                      </ul>
                    </article>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="team-card-grid" role="list" aria-label="Teams">
                  {sessionTeams.map((team, index) => {
                    const isSelected = selectedTeam === team.id;
                    return (
                      <button
                        key={team.id}
                        type="button"
                        role="listitem"
                        className={`team-card team-card-name-only ${TEAM_COLOR_CLASSES[index % TEAM_COLOR_CLASSES.length]} ${isSelected ? "selected" : ""}`}
                        onClick={() => {
                          setSelectedTeam(team.id);
                          setIsLocked(false);
                        }}
                      >
                        <div className="team-card-head">
                          <strong>{team.name}</strong>
                          <span className="team-size-badge">{team.playerIds.length} players</span>
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
                <p className="team-select-help">
                  {isHost
                    ? "You are host. Starting game will move all session players to board automatically."
                    : "Waiting for host rights..."}
                </p>
                <div className="tc-player-list">
                  {sessionPlayers.map((player) => (
                    <div key={player.id} className="tc-player-item-row">
                      <p className="tc-player-item tc-player-name">
                        {player.username}
                        {player.isHost ? " (Host)" : ""}
                      </p>
                      {isHost && !player.isHost && player.id !== playerId && (
                        <button
                          type="button"
                          className="tc-kick-btn"
                          onClick={() => handleKickPlayer(player.id)}
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button type="button" className="tc-btn" onClick={handleSaveTeams}>
                  Save Teams
                </button>

                <button
                  type="button"
                  className="tc-btn"
                  disabled={!isHost || !isTeamsSaved || hasGameStarted}
                  onClick={handleStartGame}
                >
                  {hasGameStarted
                    ? "Game Started"
                    : isStartingGame
                      ? "Starting..."
                      : "Start Game"}
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
                  onClick={handleJoinSelectedTeam}
                  disabled={!selectedTeam || isLocked}
                >
                  {isLocked ? "Team Locked" : `Join ${selectedTeamInfo?.name || "Team"}`}
                </button>
                <p className="team-select-help">
                  Waiting for host to start the game. You will enter the board automatically.
                </p>
              </>
            )}
            {statusMessage && <p className="team-select-help">{statusMessage}</p>}
            {activityEvents.length > 0 && (
              <div className="tc-activity-feed" aria-label="Recent activity">
                {activityEvents
                  .slice(-5)
                  .reverse()
                  .map((event) => (
                    <p key={event.id} className="tc-activity-line">
                      {event.message}
                    </p>
                  ))}
              </div>
            )}
            <button
              type="button"
              className="tc-btn tc-btn-small tc-btn-danger tc-leave-btn"
              onClick={handleLeaveSession}
            >
              Leave Session
            </button>
          </aside>
        </section>
      </main>
    </div>
  );
}
