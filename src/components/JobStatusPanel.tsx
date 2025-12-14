// components/JobStatusPanel.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface JobStatus {
  status?: string;
  state?: string;
  error?: string;
  data?: unknown;
}

interface JobStatusPanelProps {
  requestId: string;
  status?: JobStatus | null;
  className?: string;
}

export function JobStatusPanel({ requestId, status, className }: JobStatusPanelProps) {
  const getStatusBadge = () => {
    const statusValue = status?.status || status?.state || "UNKNOWN";
    
    switch (statusValue) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Completed
          </Badge>
        );
      case "IN_PROGRESS":
      case "PROCESSING":
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            In Progress
          </Badge>
        );
      case "ERROR":
      case "FAILED":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Error
          </Badge>
        );
      case "PENDING":
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            {statusValue}
          </Badge>
        );
    }
  };

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Job Status</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Request ID: {requestId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status && (
          <div className="space-y-2">
            {status.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm font-medium text-destructive">Error:</p>
                <p className="text-sm text-destructive/80">{status.error}</p>
              </div>
            )}
            {status.data && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                  View Details
                </summary>
                <pre className="mt-2 p-3 bg-muted rounded-md text-xs overflow-auto max-h-64">
                  {JSON.stringify(status.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
        {!status && (
          <p className="text-sm text-muted-foreground">Waiting for status update...</p>
        )}
      </CardContent>
    </Card>
  );
}