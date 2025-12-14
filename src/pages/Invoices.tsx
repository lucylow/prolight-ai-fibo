import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Download, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  status: "Paid" | "Due" | "Overdue" | "Pending";
  receiptUrl?: string;
}

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const perPage = 10;

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${API_BASE_URL}/api/invoices`, {
      //   params: { page, per_page: perPage, status: statusFilter || undefined },
      // });
      // setInvoices(response.data.items);
      // setTotalPages(response.data.total_pages);
      
      // Mock data
      const mockInvoices: Invoice[] = [
        { id: "1", number: "INV-1042", date: "2025-09-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "2", number: "INV-1041", date: "2025-08-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "3", number: "INV-1040", date: "2025-07-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "4", number: "INV-1039", date: "2025-06-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "5", number: "INV-1038", date: "2025-05-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
      ];
      
      let filtered = mockInvoices;
      if (statusFilter) {
        filtered = filtered.filter((inv) => inv.status === statusFilter);
      }
      if (searchQuery) {
        filtered = filtered.filter(
          (inv) =>
            inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.date.includes(searchQuery)
        );
      }

      const start = (page - 1) * perPage;
      const end = start + perPage;
      setInvoices(filtered.slice(start, end));
      setTotalPages(Math.ceil(filtered.length / perPage));
    } catch (error: unknown) {
      console.error("Failed to load invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Paid":
        return "default";
      case "Pending":
        return "secondary";
      case "Due":
      case "Overdue":
        return "destructive";
      default:
        return "outline";
    }
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (searchQuery) {
      return (
        inv.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        inv.date.includes(searchQuery)
      );
    }
    return true;
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Payment History & Invoices</h1>
        <p className="text-muted-foreground">View and download your invoices</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>Your payment history and invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Due">Due</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No invoices found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{new Date(invoice.date).toLocaleDateString()}</TableCell>
                        <TableCell>${invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.receiptUrl || "#"} target="_blank" rel="noopener noreferrer">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1 || loading}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages || loading}
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Invoices;
