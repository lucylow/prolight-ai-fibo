import React, { useEffect, useState } from "react";
import { adminClient, RefundRequest } from "@/services/adminClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Search, Copy, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminRefunds() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [selectedRefund, setSelectedRefund] = useState<RefundRequest | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [denyDialogOpen, setDenyDialogOpen] = useState(false);
  const [amount, setAmount] = useState<number | undefined>();
  const [note, setNote] = useState("");

  useEffect(() => {
    loadRefunds();
  }, [query, statusFilter]);

  const loadRefunds = async () => {
    try {
      setLoading(true);
      const data = await adminClient.listRefunds({
        q: query || undefined,
        status: statusFilter || undefined,
      });
      setRefunds(data);
    } catch (error: unknown) {
      console.error("Failed to load refunds:", error);
      toast.error("Failed to load refund requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRefund) return;

    try {
      await adminClient.approveRefund(selectedRefund.id, {
        amount_cents: amount ? Math.round(amount * 100) : undefined,
        admin_note: note,
      });
      toast.success("Refund approved successfully");
      setApproveDialogOpen(false);
      setSelectedRefund(null);
      setAmount(undefined);
      setNote("");
      loadRefunds();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to approve refund");
    }
  };

  const handleDeny = async () => {
    if (!selectedRefund) return;

    try {
      await adminClient.denyRefund(selectedRefund.id, { admin_note: note });
      toast.success("Refund denied");
      setDenyDialogOpen(false);
      setSelectedRefund(null);
      setNote("");
      loadRefunds();
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to deny refund");
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      refunded: "default",
      denied: "destructive",
      failed: "destructive",
    };

    return (
      <Badge variant={variants[status] || "outline"} className="capitalize">
        {status}
      </Badge>
    );
  };

  const copyChargeId = (chargeId: string) => {
    navigator.clipboard.writeText(chargeId);
    toast.success("Charge ID copied to clipboard");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-teal-300 mb-2">Refund Requests</h1>
        <p className="text-slate-400">Manage and process refund requests</p>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search charge ID or reason..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
          <option value="denied">Denied</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Refunds List */}
      {loading ? (
        <div className="text-center py-12">Loading refund requests...</div>
      ) : refunds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No refund requests found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {refunds.map((refund) => (
            <Card key={refund.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">Charge: {refund.charge_id}</h3>
                      {getStatusBadge(refund.status)}
                    </div>
                    <div className="text-sm text-slate-400">
                      Amount:{" "}
                      {refund.amount_cents
                        ? `$${(refund.amount_cents / 100).toFixed(2)}`
                        : "Full refund"}
                      {" "}
                      {refund.currency.toUpperCase()}
                    </div>
                    {refund.reason && (
                      <div className="text-sm text-slate-300">
                        Reason: {refund.reason}
                      </div>
                    )}
                    {refund.admin_note && (
                      <div className="text-xs text-slate-500 bg-slate-800 p-2 rounded">
                        Admin Note: {refund.admin_note}
                      </div>
                    )}
                    <div className="text-xs text-slate-500">
                      Created: {format(new Date(refund.created_at), "MMM d, yyyy HH:mm")}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyChargeId(refund.charge_id)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                    {refund.status === "pending" && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setAmount(refund.amount_cents ? refund.amount_cents / 100 : undefined);
                            setApproveDialogOpen(true);
                          }}
                          className="bg-teal-500 hover:bg-teal-600 text-black"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRefund(refund);
                            setDenyDialogOpen(true);
                          }}
                          className="bg-red-500 hover:bg-red-600"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Deny
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Refund</DialogTitle>
            <DialogDescription>
              Review and approve this refund request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Charge ID</Label>
              <Input value={selectedRefund?.charge_id || ""} disabled />
            </div>
            <div>
              <Label>Amount (USD) - Leave empty for full refund</Label>
              <Input
                type="number"
                value={amount ?? ""}
                onChange={(e) =>
                  setAmount(e.target.value ? Number(e.target.value) : undefined)
                }
                placeholder="Full refund"
              />
            </div>
            <div>
              <Label>Admin Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note about this refund..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              className="bg-teal-500 hover:bg-teal-600 text-black"
            >
              Approve Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={denyDialogOpen} onOpenChange={setDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deny Refund</DialogTitle>
            <DialogDescription>
              Provide a reason for denying this refund request
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Charge ID</Label>
              <Input value={selectedRefund?.charge_id || ""} disabled />
            </div>
            <div>
              <Label>Admin Note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for denial..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeny}
              className="bg-red-500 hover:bg-red-600"
            >
              Deny Refund
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
