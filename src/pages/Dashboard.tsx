import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Breadcrumbs from "@/components/Breadcrumbs";
import { Lightbulb, Palette, MessageSquare, History, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const Dashboard = () => {
  const { user } = useAuth();

  const quickActions = [
    {
      title: "Studio",
      description: "Create professional lighting setups",
      icon: Lightbulb,
      link: "/studio",
      color: "text-blue-500",
    },
    {
      title: "Presets",
      description: "Browse lighting presets",
      icon: Palette,
      link: "/presets",
      color: "text-purple-500",
    },
    {
      title: "AI Chat",
      description: "Natural language lighting generation",
      icon: MessageSquare,
      link: "/natural-language",
      color: "text-green-500",
    },
    {
      title: "History",
      description: "View your generation history",
      icon: History,
      link: "/history",
      color: "text-orange-500",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <Breadcrumbs />
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}!
        </h1>
        <p className="text-muted-foreground">
          Welcome to your ProLight AI workspace. Navigate using the menu above.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.link} to={action.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Icon className={`h-8 w-8 ${action.color}`} />
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">{action.title}</CardTitle>
                  <CardDescription>{action.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Learn how to use ProLight AI</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              New to ProLight AI? Check out our documentation to get started with professional lighting generation.
            </p>
            <Button asChild variant="outline">
              <Link to="/docs">View Documentation</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your account settings</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Update your profile, manage billing, and configure your preferences.
            </p>
            <Button asChild variant="outline">
              <Link to="/account">Go to Account</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
