"use client";

import { useState } from "react";
import styles from "./dashboard.module.css";

const tabs = [
  { id: "content", label: "Academy Content" },
  { id: "people", label: "Manage People" },
  { id: "events", label: "Events & Announcements" },
] as const;

export type DashboardTab = (typeof tabs)[number]["id"];

export function DashboardShell({
  initial,
  content,
  people,
  events,
}: {
  initial: DashboardTab;
  content: React.ReactNode;
  people: React.ReactNode;
  events: React.ReactNode;
}) {
  const [tab, setTab] = useState<DashboardTab>(initial);
  const panels = { content, people, events };
  return (
    <div className={styles.shell}>
      <div className={styles.tabs} role="tablist" aria-label="Dashboard">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`dashboard-tab-${item.id}`}
            className={styles.tab}
            aria-selected={tab === item.id}
            aria-controls={`dashboard-panel-${item.id}`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tabs.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`dashboard-panel-${item.id}`}
          aria-labelledby={`dashboard-tab-${item.id}`}
          hidden={tab !== item.id}
          className={styles.panel}
        >
          {panels[item.id]}
        </div>
      ))}
    </div>
  );
}
