import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Users, Plus, Mail, Shield, Edit, Eye } from "lucide-react";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Team {
  id: string;
  name: string;
  memberCount: number;
  role: "admin" | "editor" | "viewer";
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  status: "active" | "pending";
}

const Teams = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "editor" | "admin">("viewer");

  useEffect(() => {
    fetchTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
    }
  }, [selectedTeam]);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${API_BASE_URL}/api/teams`);
      // setTeams(response.data);
      
      // Mock data for now
      setTeams([
        { id: "1", name: "ProLight Studio", memberCount: 12, role: "admin" },
        { id: "2", name: "Client - Retail Brand", memberCount: 5, role: "editor" },
      ]);
    } catch (error: unknown) {
      console.error("Failed to load teams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // const response = await axios.get(`${API_BASE_URL}/api/teams/${teamId}/members`);
      // setMembers(response.data);
      
      // Mock data
      setMembers([
        { id: "1", name: "John Doe", email: "john@example.com", role: "admin", status: "active" },
        { id: "2", name: "Jane Smith", email: "jane@example.com", role: "editor", status: "active" },
        { id: "3", name: "Bob Wilson", email: "bob@example.com", role: "viewer", status: "pending" },
      ]);
    } catch (error: unknown) {
      console.error("Failed to load team members:", error);
      toast.error("Failed to load team members");
    }
  };

  const handleInvite = async () => {
    if (!selectedTeam || !inviteEmail) {
      toast.error("Please select a team and enter an email");
      return;
    }

    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // await axios.post(`${API_BASE_URL}/api/teams/${selectedTeam.id}/invite`, {
      //   email: inviteEmail,
      //   role: inviteRole,
      // });
      toast.success(`Invitation sent to ${inviteEmail}`);
      setInviteDialogOpen(false);
      setInviteEmail("");
      setInviteRole("viewer");
      if (selectedTeam) {
        fetchTeamMembers(selectedTeam.id);
      }
    } catch (error: unknown) {
      const errorMessage = error && typeof error === 'object' && 'response' in error 
        ? (error.response as { data?: { detail?: string } })?.data?.detail 
        : undefined;
      toast.error(errorMessage || "Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4" />;
      case "editor":
        return <Edit className="w-4 h-4" />;
      case "viewer":
        return <Eye className="w-4 h-4" />;
      default:
        return null;
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teams</h1>
          <p className="text-muted-foreground">Manage your teams and members</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {teams.map((team) => (
          <Card
            key={team.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTeam?.id === team.id ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => setSelectedTeam(team)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <Users className="w-8 h-8 text-primary" />
                <Badge variant={getRoleBadgeVariant(team.role)}>
                  {getRoleIcon(team.role)}
                  <span className="ml-1 capitalize">{team.role}</span>
                </Badge>
              </div>
              <CardTitle>{team.name}</CardTitle>
              <CardDescription>{team.memberCount} members</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {selectedTeam && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{selectedTeam.name} - Members</CardTitle>
                <CardDescription>Manage team members and permissions</CardDescription>
              </div>
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="w-4 h-4 mr-2" />
                    Invite Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join {selectedTeam.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="colleague@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select value={inviteRole} onValueChange={(value: string) => setInviteRole(value as "viewer" | "editor" | "admin")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer - Can view projects</SelectItem>
                          <SelectItem value="editor">Editor - Can create and edit</SelectItem>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                      <strong className="capitalize">{inviteRole}:</strong>{" "}
                      {inviteRole === "viewer" && "Can view images and projects"}
                      {inviteRole === "editor" && "Can generate, edit, and manage projects"}
                      {inviteRole === "admin" && "Full access including billing, users, and settings"}
                    </div>
                    <Button onClick={handleInvite} disabled={loading} className="w-full">
                      {loading ? "Sending..." : "Send Invitation"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(member.role)}>
                        {getRoleIcon(member.role)}
                        <span className="ml-1 capitalize">{member.role}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={member.status === "active" ? "default" : "secondary"}>
                        {member.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        Change Role
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Teams;
