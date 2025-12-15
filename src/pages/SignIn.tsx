import React, { useState, useContext, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Github, Mail, Eye, EyeOff, Loader2 } from "lucide-react";

const REMEMBER_ME_KEY = "prolight_remember_email";
const REMEMBER_ME_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const SignIn = () => {
  const auth = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem(REMEMBER_ME_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  if (!auth) {
    return null;
  }

  // Get the intended destination from location state, or default to dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || "/dashboard";

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    // Basic validation
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setLoading(true);
    try {
      await auth.login(email, password);
      
      // Handle remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, email);
        // Set expiration
        localStorage.setItem(`${REMEMBER_ME_KEY}_expires`, String(Date.now() + REMEMBER_ME_DURATION));
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(`${REMEMBER_ME_KEY}_expires`);
      }
      
      toast.success("Welcome back!");
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : "Invalid credentials, please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: "google" | "github") => {
    try {
      setOauthLoading(provider);
      setError("");
      await auth.loginWithOAuth(provider);
      // OAuth will redirect, so we don't need to navigate here
    } catch (err: unknown) {
      const errorMessage = err && typeof err === 'object' && 'message' in err 
        ? String(err.message) 
        : `Failed to sign in with ${provider}`;
      setError(errorMessage);
      toast.error(errorMessage);
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign In</CardTitle>
          <CardDescription className="text-center">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading || oauthLoading !== null}
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                  tabIndex={-1}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || oauthLoading !== null}
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={loading || oauthLoading !== null}
              />
              <Label
                htmlFor="remember-me"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            <Button type="submit" className="w-full" disabled={loading || oauthLoading !== null}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin("github")}
              disabled={loading || oauthLoading !== null}
              className="w-full"
            >
              {oauthLoading === "github" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Github className="mr-2 h-4 w-4" />
              )}
              GitHub
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => handleOAuthLogin("google")}
              disabled={loading || oauthLoading !== null}
              className="w-full"
            >
              {oauthLoading === "google" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Google
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignIn;

