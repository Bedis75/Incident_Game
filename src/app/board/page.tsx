import { Suspense } from "react";
import GameBoardClient from "./BoardClient";

export default function GameBoardPage() {
  return (
    <Suspense fallback={<div className="page-shell board-shell">Loading board...</div>}>
      <GameBoardClient />
    </Suspense>
  );
}
