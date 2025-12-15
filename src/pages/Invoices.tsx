import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Download, ChevronLeft, ChevronRight, FileText, FileDown } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  number?: string;
  stripe_invoice_id?: string;
  date: string;
  amount: number;
  amount_due?: number;
  currency?: string;
  status: "Paid" | "Due" | "Overdue" | "Pending" | "paid" | "open" | "draft" | "void" | "uncollectible";
  receiptUrl?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
}

const Invoices = () => {
  const { api } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const searchTimeoutRef = React.useRef<NodeJS.Timeout>();

  const perPage = 20;

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter]);

  // Debounce search query
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      if (page === 1) {
        fetchInvoices();
      } else {
        setPage(1); // Reset to first page when search changes
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const fetchInvoices = async (resetCursor = false) => {
    setLoading(true);
    try {
      // Try server-side API first (supports cursor-based pagination)
      try {
        const params: Record<string, string | number | undefined> = {
          limit: perPage,
        };
        
        // Use cursor if available, otherwise use page
        if (cursor && !resetCursor) {
          params.cursor = cursor;
        } else if (page > 1 && !cursor) {
          params.page = page;
        }
        
        if (statusFilter) {
          params.status = statusFilter;
        }
        
        if (searchQuery) {
          params.q = searchQuery;
        }

        const response = await api.get("/billing/invoices", { params });

        if (response.data?.items) {
          const items = response.data.items;
          
          // Normalize invoice data
<<<<<<< Updated upstream
          const normalizedInvoices: Invoice[] = items.map((inv: Record<string, unknown>) => ({
            id: inv.id || inv.stripe_invoice_id || `inv_${Date.now()}`,
            number: inv.number || inv.invoice_number || inv.id?.substring(0, 12),
            stripe_invoice_id: inv.stripe_invoice_id || inv.id,
            date: inv.date || inv.created || inv.invoice_date || new Date().toISOString(),
            amount: inv.amount_due ? inv.amount_due / 100 : inv.amount || 0,
            amount_due: inv.amount_due,
            currency: inv.currency || "usd",
            status: inv.status || "Pending",
            receiptUrl: inv.hosted_invoice_url || inv.invoice_pdf || inv.receiptUrl,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
          }));
=======
          const normalizedInvoices: Invoice[] = items.map((inv: Record<string, unknown>) => {
            const getId = () => {
              const id = typeof inv.id === 'string' ? inv.id : undefined;
              const stripeId = typeof inv.stripe_invoice_id === 'string' ? inv.stripe_invoice_id : undefined;
              return id || stripeId || `inv_${Date.now()}`;
            };
            const getNumber = () => {
              const num = typeof inv.number === 'string' ? inv.number : undefined;
              const invoiceNum = typeof inv.invoice_number === 'string' ? inv.invoice_number : undefined;
              const id = typeof inv.id === 'string' ? inv.id : undefined;
              return num || invoiceNum || id?.substring(0, 12);
            };
            const getDate = () => {
              const date = typeof inv.date === 'string' ? inv.date : undefined;
              const created = typeof inv.created === 'string' ? inv.created : undefined;
              const invoiceDate = typeof inv.invoice_date === 'string' ? inv.invoice_date : undefined;
              return date || created || invoiceDate || new Date().toISOString();
            };
            const getAmount = () => {
              const amountDue = typeof inv.amount_due === 'number' ? inv.amount_due : undefined;
              const amount = typeof inv.amount === 'number' ? inv.amount : 0;
              return amountDue ? amountDue / 100 : amount;
            };
            const getStatus = () => {
              const status = typeof inv.status === 'string' ? inv.status : 'Pending';
              return status as Invoice['status'];
            };
            return {
              id: getId(),
              number: getNumber(),
              stripe_invoice_id: typeof inv.stripe_invoice_id === 'string' ? inv.stripe_invoice_id : typeof inv.id === 'string' ? inv.id : undefined,
              date: getDate(),
              amount: getAmount(),
              amount_due: typeof inv.amount_due === 'number' ? inv.amount_due : undefined,
              currency: typeof inv.currency === 'string' ? inv.currency : 'usd',
              status: getStatus(),
              receiptUrl: typeof inv.hosted_invoice_url === 'string' ? inv.hosted_invoice_url : typeof inv.invoice_pdf === 'string' ? inv.invoice_pdf : typeof inv.receiptUrl === 'string' ? inv.receiptUrl : undefined,
              hosted_invoice_url: typeof inv.hosted_invoice_url === 'string' ? inv.hosted_invoice_url : undefined,
              invoice_pdf: typeof inv.invoice_pdf === 'string' ? inv.invoice_pdf : undefined,
            };
          });
>>>>>>> Stashed changes

          if (resetCursor || page === 1) {
            setInvoices(normalizedInvoices);
          } else {
            setInvoices((prev) => [...prev, ...normalizedInvoices]);
          }

          // Handle cursor-based pagination
          if (response.data.nextCursor) {
            setNextCursor(response.data.nextCursor);
            setHasMore(true);
          } else {
            setNextCursor(null);
            setHasMore(false);
          }

          // Fallback to page-based pagination
          if (response.data.totalPages) {
            setTotalPages(response.data.totalPages);
          } else if (response.data.total) {
            setTotalPages(Math.ceil(response.data.total / perPage));
          }
          
          setTotal(response.data.total || normalizedInvoices.length);
          return;
        }
      } catch (apiError: unknown) {
        // If API endpoint doesn't exist, fall back to mock data
        const status = apiError && typeof apiError === 'object' && 'response' in apiError
          ? (apiError as { response?: { status?: number } }).response?.status
          : undefined;
        if (status !== 404) {
          throw apiError;
        }
      }

      // Fallback to mock data for development
      const mockInvoices: Invoice[] = [
        { id: "1", number: "INV-1042", date: "2025-09-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "2", number: "INV-1041", date: "2025-08-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "3", number: "INV-1040", date: "2025-07-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "4", number: "INV-1039", date: "2025-06-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
        { id: "5", number: "INV-1038", date: "2025-05-01", amount: 49.0, status: "Paid", receiptUrl: "#" },
      ];

      // Client-side filtering for mock data
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
      setTotal(filtered.length);
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

  const normalizeStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      paid: "Paid",
      open: "Due",
      draft: "Pending",
      void: "Void",
      uncollectible: "Overdue",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "Paid":
        return "default";
      case "Pending":
      case "Draft":
        return "secondary";
      case "Due":
      case "Overdue":
      case "Uncollectible":
        return "destructive";
      case "Void":
        return "outline";
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

  const exportToCSV = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    // CSV headers
    const headers = ["Invoice #", "Date", "Amount", "Currency", "Status", "Invoice ID"];
    
    // CSV rows
    const rows = filteredInvoices.map((inv) => [
      inv.number || "",
      new Date(inv.date).toLocaleDateString(),
      inv.amount.toFixed(2),
      inv.currency?.toUpperCase() || "USD",
      normalizeStatus(inv.status),
      inv.id,
    ]);

    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `invoices-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(`Exported ${filteredInvoices.length} invoice(s) to CSV`);
  };

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
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <FileDown className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : invoices.length === 0 ? (
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
                        <TableCell>
                          {new Date(invoice.date).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          ${invoice.amount.toFixed(2)} {invoice.currency?.toUpperCase() || 'USD'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusBadgeVariant(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {invoice.hosted_invoice_url && (
                              <Button variant="ghost" size="sm" asChild>
                                <a 
                                  href={invoice.hosted_invoice_url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  View
                                </a>
                              </Button>
                            )}
                            {(invoice.invoice_pdf || invoice.receiptUrl) && (
                              <Button variant="ghost" size="sm" asChild>
                                <a 
                                  href={invoice.invoice_pdf || invoice.receiptUrl || "#"} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download
                                </a>
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-muted-foreground">
                  {cursor 
                    ? `Showing ${invoices.length} invoice${invoices.length !== 1 ? 's' : ''}${hasMore ? ' (more available)' : ''}`
                    : `Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, total)} of {total} invoices`
                  }
                </div>
                <div className="flex gap-2">
                  {cursor ? (
                    // Cursor-based pagination
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setCursor(null);
                          setPage(1);
                          fetchInvoices(true);
                        }}
                        disabled={!cursor || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (nextCursor) {
                            setCursor(nextCursor);
                            setPage((p) => p + 1);
                            fetchInvoices(false);
                          }
                        }}
                        disabled={!hasMore || !nextCursor || loading}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    // Page-based pagination (fallback)
                    <>
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
                    </>
                  )}
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


