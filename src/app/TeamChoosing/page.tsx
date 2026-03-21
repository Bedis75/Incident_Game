import { Suspense } from "react";
import TeamChoosingClient from "./TeamChoosingClient";

export default function TeamChoosingPage() {
  return (
    <Suspense fallback={<div className="page-shell tc-shell">Loading team setup...</div>}>
      <TeamChoosingClient />
    </Suspense>
  );
}
