"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function Home() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [sessionCode, setSessionCode] = useState("");
  const cleanedUsername = username.trim();
  const canEnter = cleanedUsername.length > 0;

  const handleCreateSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEnter) {
      return;
    }

    const params = new URLSearchParams({
      username: cleanedUsername,
      mode: "create",
    });
    router.push(`/TeamChoosing?${params.toString()}`);
  };

  const handleJoinSession = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEnter) {
      return;
    }

    const params = new URLSearchParams({
      username: cleanedUsername,
      mode: "join",
      sessionCode: sessionCode.trim() || "N/A",
    });
    router.push(`/TeamChoosing?${params.toString()}`);
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

            <button type="submit" disabled={!canEnter}>CREATE SESSION</button>

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
              onChange={(event) => setSessionCode(event.target.value)}
            />

            <button type="submit" disabled={!canEnter}>JOIN</button>
          </form>

          {!canEnter && (
            <p className="menu-warning" aria-live="polite">
              Enter your username to continue.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
