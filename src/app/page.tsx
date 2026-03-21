"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const cleanedUsername = username.trim();
  const cleanedSessionCode = sessionCode.trim().toUpperCase();
  const canEnter = cleanedUsername.length > 0;
  const canJoin = canEnter && cleanedSessionCode.length > 0;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const handleCreateSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEnter || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: cleanedUsername }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload?.error || "Could not create session.");
        return;
      }

      const params = new URLSearchParams({
        username: cleanedUsername,
        mode: "create",
        sessionCode: payload.session.code,
        playerId: payload.player.id,
        hostPlayerId: payload.session.hostPlayerId,
      });
      router.push(`/TeamChoosing?${params.toString()}`);
    } catch {
      setErrorMessage("Could not reach the API. Start incident_game_api first.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSession = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canJoin || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/sessions/${cleanedSessionCode}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: cleanedUsername }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setErrorMessage(payload?.error || "Could not join session.");
        return;
      }

      const params = new URLSearchParams({
        username: cleanedUsername,
        mode: "join",
        sessionCode: payload.session.code,
        playerId: payload.player.id,
      });
      router.push(`/TeamChoosing?${params.toString()}`);
    } catch {
      setErrorMessage("Could not reach the API. Start incident_game_api first.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-shell menu-shell">
      <main className="menu-wrap menu-wrap-modern">
        <Link href="/info" className="info-icon" aria-label="Open info page">
          ?
        </Link>

        <section className="menu-center" aria-label="Main menu">
          <img
            className="menu-main-image"
            src="/main-menu-image.png"
            alt="Main game artwork"
          />

          <h1 className="menu-title">Incident Management Champion</h1>

          <form className="menu-form menu-form-modern" onSubmit={handleCreateSession}>
            <label className="sr-only" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="USERNAME"
              autoComplete="nickname"
              required
              minLength={2}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />

            <button type="submit" disabled={!canEnter || isSubmitting}>
              {isSubmitting ? "CREATING..." : "CREATE SESSION"}
            </button>

          </form>

          <p className="menu-divider">-OR-</p>

          <form className="menu-form menu-form-modern" onSubmit={handleJoinSession}>
            <label className="sr-only" htmlFor="sessionCode">
              Session Code
            </label>
            <input
              id="sessionCode"
              name="sessionCode"
              type="text"
              placeholder="SESSION CODE"
              autoComplete="off"
              value={sessionCode}
              onChange={(event) => setSessionCode(event.target.value.toUpperCase())}
            />

            <button type="submit" disabled={!canJoin || isSubmitting}>
              {isSubmitting ? "JOINING..." : "JOIN"}
            </button>
          </form>

          {!canEnter && (
            <p className="menu-warning" aria-live="polite">
              Enter your username to continue.
            </p>
          )}

          {canEnter && !cleanedSessionCode && (
            <p className="menu-warning" aria-live="polite">
              Enter a session code to join an existing session.
            </p>
          )}

          {errorMessage && (
            <p className="menu-warning" aria-live="assertive">
              {errorMessage}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
