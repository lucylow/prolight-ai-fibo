import React, { useEffect, useState } from "react";
import axios from "axios";
import { clsx } from "clsx";
import { X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

const CLIENT_COMMIT = import.meta.env.VITE_CLIENT_COMMIT || "unknown";

type DeployStatus = {
  server_commit?: string | null;
  server_build_time?: string | null;
  recommended_rebuild?: boolean;
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export default function DeployCheckBanner() {
  const [status, setStatus] = useState<DeployStatus | null>(null);
  const [visible, setVisible] = useState(true);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("deploy_check_dismissed_at");
    if (dismissed) {
      const ts = Number(dismissed);
      // Hide for 1 hour if dismissed
      if (Date.now() - ts < 1000 * 60 * 60) {
        setVisible(false);
        setLoading(false);
        return;
      }
    }
    
    const fetchStatus = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/deploy-check`);
        const data: DeployStatus = res.data || {};
        setStatus(data);
        const server = data.server_commit || null;
        const needs = !!data.recommended_rebuild;
        const mismatch = server && server !== CLIENT_COMMIT;
        if (needs || mismatch) {
          setStale(true);
        }
      } catch (err) {
        // If request fails, don't show banner (might be local dev)
        console.warn("Failed to fetch deploy status:", err);
        setStale(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, []);

  if (loading || !visible || !stale) return null;

  const serverCommit = status?.server_commit || "unknown";
  const buildTime = status?.server_build_time || "unknown";

  const onDismiss = () => {
    localStorage.setItem("deploy_check_dismissed_at", Date.now().toString());
    setVisible(false);
  };

  // Get CI link from env or use default
  const ciLink = import.meta.env.VITE_CI_ACTIONS_URL || "https://github.com/your-org/your-repo/actions";

  return (
    <div
      className={clsx("deploy-check-banner")}
      style={{
        position: "fixed",
        top: 16,
        left: 16,
        right: 16,
        zIndex: 9999,
        padding: "16px",
        background: "linear-gradient(90deg, rgba(0,179,166,0.1), rgba(255,183,90,0.08))",
        border: "1px solid rgba(255,183,90,0.2)",
        borderRadius: 8,
        boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="font-bold text-white text-base mb-2">
          Production artifact mismatch — rebuild recommended
        </div>
        <div className="text-sm text-slate-200 mb-1 font-mono">
          client: <code className="text-teal-300">{CLIENT_COMMIT.slice(0, 7)}</code>
          {" • "}
          server: <code className="text-amber-300">{typeof serverCommit === "string" ? serverCommit.slice(0, 7) : serverCommit}</code>
          {buildTime !== "unknown" && (
            <>
              {" • "}
              <span className="text-slate-400">build: {new Date(buildTime).toLocaleString()}</span>
            </>
          )}
        </div>
        <div className="text-xs text-slate-300 mt-2">
          This banner appears when your deployed frontend JS does not match the server build metadata.
          Rebuilding the frontend in CI will produce matching artifacts and clear this banner.
        </div>
        <div className="flex gap-2 mt-3">
          <a
            href={ciLink}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 bg-teal-500 text-black rounded-md font-semibold text-sm hover:bg-teal-400 transition-colors no-underline inline-block"
          >
            Redeploy / CI
          </a>
        </div>
      </div>
      <Button
        onClick={onDismiss}
        variant="ghost"
        size="icon"
        className="flex-shrink-0 h-8 w-8 text-slate-400 hover:text-white"
        aria-label="Dismiss banner (1 hour)"
      >
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}
