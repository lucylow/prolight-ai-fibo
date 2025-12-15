import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Shield, Users, Building2, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@/contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  teams: number;
  role: "admin" | "editor" | "viewer";
  status: "active" | "suspended";
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  members: number;
  plan: string;
  createdAt: string;
}

interface AdminSummary {
  status: string;
  summary: {
    jobs?: number;
    active_users?: number;
    total_revenue?: number;
    pending_refunds?: number;
  };
}

const Admin = () => {
  const { api, user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${API_BASE_URL}/api/admin/users`);
      // setUsers(response.data);
      
      // Mock data
      setUsers([
        {
          id: "1",
          name: "John Doe",
          email: "john@example.com",
          teams: 2,
          role: "admin",
          status: "active",
          createdAt: "2025-01-15",
        },
        {
          id: "2",
          name: "Jane Smith",
          email: "jane@example.com",
          teams: 1,
          role: "editor",
          status: "active",
          createdAt: "2025-02-20",
        },
        {
          id: "3",
          name: "Bob Wilson",
          email: "bob@example.com",
          teams: 0,
          role: "viewer",
          status: "suspended",
          createdAt: "2025-03-10",
        },
      ]);
    } catch (error: unknown) {
      console.error("Failed to load users:", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchOrganizations = async () => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${API_BASE_URL}/api/admin/organizations`);
      // setOrganizations(response.data);
      
      // Mock data
      setOrganizations([
        {
          id: "1",
          name: "ProLight Studio",
          members: 12,
          plan: "Pro",
          createdAt: "2025-01-15",
        },
        {
          id: "2",
          name: "Retail Brand Inc",
          members: 5,
          plan: "Enterprise",
          createdAt: "2025-02-20",
        },
      ]);
    } catch (error: unknown) {
      console.error("Failed to load organizations:", error);
      toast.error("Failed to load organizations");
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await api.get("/admin/summary");
      setSummary(response.data);
    } catch (error: unknown) {
      console.error("Failed to fetch admin summary:", error);
      const errorMessage = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { data?: { detail?: string }; status?: number } }).response?.data?.detail
        : error instanceof Error
        ? error.message
        : "Failed to fetch admin summary";
      setSummaryError(errorMessage || "Failed to fetch admin summary");
      // Don't show toast for RBAC errors - they're expected for non-admin users
      const status = error && typeof error === 'object' && 'response' in error
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
      if (status !== 403) {
        toast.error("Failed to fetch admin summary");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    if (!user || (user.role !== "admin" && !user.roles?.includes("admin"))) {
      return;
    }
    fetchUsers();
    fetchOrganizations();
    fetchSummary();
  }, [user, api]);

  // Role guard - additional check in component (ProtectedRoute handles routing)
  if (!user || (user.role !== "admin" && !user.roles?.includes("admin"))) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      </div>
    );
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/suspend`);
      toast.success("User suspended");
      fetchUsers();
    } catch (error: unknown) {
      console.error("Failed to suspend user:", error);
      toast.error("Failed to suspend user");
    }
  };

  const handleResetMFA = async (userId: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // await axios.post(`${API_BASE_URL}/api/admin/users/${userId}/reset-mfa`);
      toast.success("MFA reset");
    } catch (error: unknown) {
      console.error("Failed to reset MFA:", error);
      toast.error("Failed to reset MFA");
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await api.get("/admin/summary");
      setSummary(response.data);
    } catch (error: any) {
      console.error("Failed to fetch admin summary:", error);
      setSummaryError(error.response?.data?.detail || error.message || "Failed to fetch admin summary");
      // Don't show toast for RBAC errors - they're expected for non-admin users
      if (error.response?.status !== 403) {
        toast.error("Failed to fetch admin summary");
      }
    } finally {
      setSummaryLoading(false);
    }
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "outline" => {
    switch (role) {
      case "admin":
        return "default";
      case "editor":
        return "secondary";
      case "viewer":
        return "outline";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs />
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Console</h1>
        </div>
        <p className="text-muted-foreground">Manage users, organizations, and system settings</p>
      </div>

      {/* Admin Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Admin Summary
          </CardTitle>
          <CardDescription>System overview and statistics</CardDescription>
        </CardHeader>
        <CardContent>
          {summaryLoading ? (
            <div className="text-sm text-muted-foreground">Loading summary...</div>
          ) : summaryError ? (
            <div className="text-sm text-destructive">
              {summaryError.includes("Access denied") || summaryError.includes("403")
                ? "You do not have permission to view admin summary."
                : `Error: ${summaryError}`}
            </div>
          ) : summary ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Jobs</div>
                <div className="text-2xl font-bold">{summary.summary.jobs ?? 0}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Active Users</div>
                <div className="text-2xl font-bold">{summary.summary.active_users ?? 0}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Total Revenue</div>
                <div className="text-2xl font-bold">
                  ${(summary.summary.total_revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Pending Refunds</div>
                <div className="text-2xl font-bold">{summary.summary.pending_refunds ?? 0}</div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Organizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>View and manage user accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.teams}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.status === "active" ? "default" : "destructive"}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {user.status === "active" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSuspendUser(user.id)}
                            >
                              Suspend
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResetMFA(user.id)}
                          >
                            Reset MFA
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organizations</CardTitle>
              <CardDescription>View all organizations and their details</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Members</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell className="font-medium">{org.name}</TableCell>
                      <TableCell>{org.members}</TableCell>
                      <TableCell>
                        <Badge>{org.plan}</Badge>
                      </TableCell>
                      <TableCell>{new Date(org.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;


