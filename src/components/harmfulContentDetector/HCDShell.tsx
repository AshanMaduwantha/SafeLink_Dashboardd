"use client";

import "./hcd.css";
import { HCDNavigation } from "./HCDNavigation";

interface HCDShellProps {
  children: React.ReactNode;
}

export function HCDShell({ children }: HCDShellProps) {
  return (
    <div className="hcd-root">
      <HCDNavigation />
      {children}
    </div>
  );
}
