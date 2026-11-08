"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_TRACE_KEY, emptyState, parseState, type TraceSample, type TraceState } from "@/lib/nav-trace";

function read(): TraceState {
  try {
    return parseState(sessionStorage.getItem(NAV_TRACE_KEY));
  } catch {
    return emptyState();
  }
}

function cell(value: number | null | undefined): string {
  return value == null ? "—" : String(value);
}

function yes(value: boolean): string {
  return value ? "yes" : "";
}

export function NavTraceDump() {
  const [state, setState] = useState<TraceState>(emptyState);
  const [note, setNote] = useState("");

  useEffect(() => {
    const update = () => setState(read());
    update();
    const timer = window.setTimeout(update, 1000);
    window.addEventListener("focus", update);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", update);
    };
  }, []);

  const json = JSON.stringify(state, null, 2);

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(json);
      setNote("Copied.");
    } catch {
      setNote("Clipboard was blocked. Select the JSON below.");
    }
  }

  function clearTrace() {
    try {
      sessionStorage.removeItem(NAV_TRACE_KEY);
    } catch {
      // Leave the table as it is if storage is blocked.
    }
    setState(emptyState());
    setNote("Cleared in this tab.");
  }

  return (
    <main className="shell" style={{ paddingTop: 24, paddingBottom: 48 }}>
      <h1 className="page-title">Navigation trace</h1>
      <p className="note">
        Development only. This page is not in the academy menu. A row is one header click or one document load.
        Usable means the real page marker is in the document, not the “Loading your courses” line. Times are milliseconds.
        Nothing here is a name, cookie, or page body.
      </p>
      <p className="note">
        <code>requestMs</code> is the fetch. <code>waitedForResponseMs</code> is how long the click waited on that fetch.{" "}
        <code>clickToUsableMs</code> includes the fetch and the time until the page marker. <code>longTasks</code> is main-thread work of 50ms or more.{" "}
        <code>reload</code> on a click means the click loaded a new document. A blank usable cell with timed out means the marker never appeared; that row stays in the list.
      </p>
      <p style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button className="pill pill-purple" type="button" onClick={() => void copyJson()}>
          Copy JSON
        </button>
        <button className="pill pill-black" type="button" onClick={() => setState(read())}>
          Refresh
        </button>
        <button className="pill pill-black" type="button" onClick={clearTrace}>
          Clear trace
        </button>
        <Link className="pill pill-black" href="/">
          Academy home
        </Link>
      </p>
      <p className="note" role="status">
        {note}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {[
                "#",
                "kind",
                "from",
                "to",
                "landed",
                "signed in",
                "reload",
                "auth redirect",
                "timed out",
                "loading",
                "fetch start",
                "request",
                "waited",
                "commit",
                "usable",
                "long tasks",
                "in flight",
                "prefetch",
              ].map((label) => (
                <th key={label} style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #ccc", whiteSpace: "nowrap" }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.samples.length === 0 ? (
              <tr>
                <td colSpan={18} style={{ padding: 8 }}>
                  No rows yet. Use the academy menu, then come back and press Refresh.
                </td>
              </tr>
            ) : (
              state.samples.map((sample) => <Row key={`${sample.kind}-${sample.n}-${sample.at}`} sample={sample} />)
            )}
          </tbody>
        </table>
      </div>
      <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>{json}</pre>
    </main>
  );
}

function Row({ sample }: { sample: TraceSample }) {
  const cellStyle = { padding: "6px 8px", borderBottom: "1px solid #eee", whiteSpace: "nowrap" as const };
  return (
    <tr>
      <td style={cellStyle}>{sample.n}</td>
      <td style={cellStyle}>{sample.kind}</td>
      <td style={cellStyle}>{sample.from}</td>
      <td style={cellStyle}>{sample.to}</td>
      <td style={cellStyle}>{sample.landed}</td>
      <td style={cellStyle}>{sample.signedIn == null ? "—" : sample.signedIn ? "yes" : "no"}</td>
      <td style={cellStyle}>{yes(sample.reload)}</td>
      <td style={cellStyle}>{yes(sample.authRedirect)}</td>
      <td style={cellStyle}>{yes(sample.timedOut)}</td>
      <td style={cellStyle}>{yes(sample.loadingSeen)}</td>
      <td style={cellStyle}>{cell(sample.fetchStartMs)}</td>
      <td style={cellStyle}>{cell(sample.requestMs)}</td>
      <td style={cellStyle}>{cell(sample.waitedForResponseMs)}</td>
      <td style={cellStyle}>{cell(sample.clickToCommitMs)}</td>
      <td style={cellStyle}>{cell(sample.clickToUsableMs)}</td>
      <td style={cellStyle}>{sample.longTasks.count === 0 ? "" : `${sample.longTasks.totalMs} (${sample.longTasks.count})`}</td>
      <td style={cellStyle}>{sample.inFlightAtClick === 0 ? "" : sample.inFlightAtClick}</td>
      <td style={cellStyle}>{yes(sample.prefetchHit)}</td>
    </tr>
  );
}
