/**
 * ExecutionLog - Component for displaying searchable, filterable execution logs
 */
import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import type { LogEntry, LogLevel } from "@/types/workflow";
import { cn } from "@/lib/utils";

interface ExecutionLogProps {
  logs: LogEntry[];
  className?: string;
}

const LOG_LEVEL_COLORS: Record<LogLevel, string> = {
  info: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  warn: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  error: "bg-red-500/10 text-red-700 border-red-500/20",
  debug: "bg-gray-500/10 text-gray-700 border-gray-500/20",
};

export const ExecutionLog: React.FC<ExecutionLogProps> = ({ logs, className }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [stepFilter, setStepFilter] = useState<string | "all">("all");

  // Get unique step IDs
  const stepIds = useMemo(() => {
    const steps = new Set<string>();
    logs.forEach((log) => {
      if (log.step_id) steps.add(log.step_id);
    });
    return Array.from(steps).sort();
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !log.message.toLowerCase().includes(query) &&
          !log.step_id?.toLowerCase().includes(query) &&
          !JSON.stringify(log.data || {}).toLowerCase().includes(query)
        ) {
          return false;
        }
      }

      // Level filter
      if (levelFilter !== "all" && log.level !== levelFilter) {
        return false;
      }

      // Step filter
      if (stepFilter !== "all" && log.step_id !== stepFilter) {
        return false;
      }

      return true;
    });
  }, [logs, searchQuery, levelFilter, stepFilter]);

  const handleCopyLog = (log: LogEntry) => {
    const logText = JSON.stringify(log, null, 2);
    navigator.clipboard.writeText(logText);
    toast.success("Log entry copied to clipboard");
  };

  const handleCopyAll = () => {
    const allLogsText = filteredLogs.map((log) => JSON.stringify(log)).join("\n");
    navigator.clipboard.writeText(allLogsText);
    toast.success(`${filteredLogs.length} log entries copied to clipboard`);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Execution Log</CardTitle>
            <CardDescription>{logs.length} log entries</CardDescription>
          </div>
          {filteredLogs.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleCopyAll}>
              <Copy className="w-4 h-4 mr-2" />
              Copy All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={levelFilter} onValueChange={(v) => setLevelFilter(v as LogLevel | "all")}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Warn</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>

          {stepIds.length > 0 && (
            <Select value={stepFilter} onValueChange={(v) => setStepFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Steps</SelectItem>
                {stepIds.map((stepId) => (
                  <SelectItem key={stepId} value={stepId}>
                    {stepId}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Logs */}
        <ScrollArea className="h-[400px] w-full">
          <div className="space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {logs.length === 0 ? "No logs yet" : "No logs match the filters"}
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "p-3 rounded-md border text-sm space-y-1",
                    LOG_LEVEL_COLORS[log.level]
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {log.level.toUpperCase()}
                        </Badge>
                        {log.step_id && (
                          <Badge variant="outline" className="text-xs">
                            {log.step_id}
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground font-mono">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <p className="mt-1 break-words">{log.message}</p>
                      {log.data && Object.keys(log.data).length > 0 && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                            Show data
                          </summary>
                          <pre className="mt-1 text-xs bg-background/50 p-2 rounded overflow-x-auto">
                            {JSON.stringify(log.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLog(log)}
                      className="flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
