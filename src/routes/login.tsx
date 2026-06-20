import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Database, Github, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithEmail, signUpWithEmail, signInWithGitHub } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — OpenFlowDB" },
      { name: "description", content: "Sign in to save and share your database diagrams." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await signUpWithEmail(email, password);
        if (error) throw error;
        setSignupSuccess(true);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGitHub() {
    setError(null);
    setLoading(true);
    try {
      const { error } = await signInWithGitHub();
      if (error) throw error;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "GitHub sign-in failed");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(50%_40%_at_50%_0%,oklch(0.55_0.22_277/0.15),transparent)]" />

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Database className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">OpenFlowDB</span>
          </Link>
          <p className="text-sm text-muted-foreground">
            {mode === "signin" ? "Sign in to your account" : "Create a free account"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-border bg-card/60 p-8 shadow-xl backdrop-blur">
          {signupSuccess ? (
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                  <Mail className="h-6 w-6" />
                </div>
              </div>
              <h2 className="text-base font-semibold text-foreground">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
              </p>
              <button
                onClick={() => { setSignupSuccess(false); setMode("signin"); }}
                className="mt-4 text-sm text-primary hover:underline"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* GitHub OAuth */}
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={handleGitHub}
                disabled={loading}
              >
                <Github className="h-4 w-4" />
                Continue with GitHub
              </Button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs text-muted-foreground">
                  <span className="bg-card px-2">or continue with email</span>
                </div>
              </div>

              {/* Email form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "signup" ? "Min. 8 characters" : "••••••••"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                  />
                </div>

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    {error}
                  </p>
                )}

                <Button type="submit" className="w-full gap-2" disabled={loading}>
                  {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>

              {/* Switch mode */}
              <p className="mt-5 text-center text-xs text-muted-foreground">
                {mode === "signin" ? "Don't have an account? " : "Already have an account? "}
                <button
                  onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
                  className={cn("font-medium text-primary hover:underline")}
                >
                  {mode === "signin" ? "Sign up free" : "Sign in"}
                </button>
              </p>

              {/* Guest link */}
              <p className="mt-3 text-center text-xs text-muted-foreground">
                <Link to="/editor" className="hover:text-foreground hover:underline">
                  Continue without an account →
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
