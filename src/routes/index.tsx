import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  ArrowRight,
  MousePointerClick,
  Code2,
  GitFork,
  Boxes,
  Zap,
} from "lucide-react";
import { GitHubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { GITHUB_REPO_URL } from "@/lib/site";
import { useAuth } from "@/lib/auth/useAuth";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OpenFlowDB — Visual Database Schema Designer" },
      {
        name: "description",
        content:
          "OpenFlowDB is an open-source, visual database schema designer. Draw ER diagrams and generate SQL for PostgreSQL, MySQL, and SQLite in seconds.",
      },
      { property: "og:title", content: "OpenFlowDB — Visual Database Schema Designer" },
      {
        property: "og:description",
        content:
          "Design database schemas visually and export clean SQL. Open-source alternative to DrawSQL.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">OpenFlowDB</span>
          </Link>
          <nav className="flex items-center gap-4">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <GitHubIcon className="h-4 w-4" /> Star
            </a>
            {!loading && user ? (
              <Button asChild>
                <Link to="/dashboard">Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Sign In
                </Link>
                <Button asChild size="sm">
                  <Link to="/login">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>


      {/* hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.55_0.22_277/0.18),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
            <GitFork className="h-3.5 w-3.5" /> Open-source alternative to DrawSQL
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-extrabold tracking-tight sm:text-6xl">
            Design database schemas{" "}
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
              visually
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg text-muted-foreground">
            Drag, connect, and design entity-relationship diagrams in your browser.
            Export production-ready SQL for PostgreSQL, MySQL, and SQLite instantly.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            {!loading && user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link to="/login">
                  Get Started Free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link to="/editor">
                Try Editor (Guest)
              </Link>
            </Button>
          </div>


          {/* mock preview */}
          <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <span className="ml-3 text-xs text-muted-foreground">openflowdb — blog_schema</span>
            </div>
            <div
              className="grid grid-cols-2 gap-4 p-8"
              style={{
                backgroundImage: "radial-gradient(var(--border) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
            >
              <MockTable color="#6366f1" name="users" rows={["id", "email", "full_name"]} />
              <MockTable color="#0ea5e9" name="posts" rows={["id", "user_id", "title", "body"]} />
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<MousePointerClick className="h-5 w-5" />}
            title="Visual canvas"
            desc="Pan, zoom, and drag tables on an infinite grid that feels like Figma."
          />
          <Feature
            icon={<Boxes className="h-5 w-5" />}
            title="Real relationships"
            desc="Draw foreign keys by connecting columns. Lines update as you move."
          />
          <Feature
            icon={<Code2 className="h-5 w-5" />}
            title="SQL export"
            desc="Generate clean DDL for PostgreSQL, MySQL, or SQLite in one click."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Instant & local"
            desc="Runs entirely in your browser. Your schema is auto-saved locally."
          />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 py-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Ready to map your data?</h2>
          <p className="mt-3 max-w-md text-muted-foreground">
            {!loading && user
              ? "Access your saved database schemas or build a new one."
              : "Create a free account to save, share, and collaborate on your database diagrams."}
          </p>
          <div className="mt-6 flex items-center gap-3">
            {!loading && user ? (
              <Button size="lg" asChild>
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/login">
                    Create Free Account <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/editor">
                    Open Editor as Guest
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>


      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>OpenFlowDB — open-source schema designer</span>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="transition hover:text-foreground"
          >
            GitHub
          </a>
        </div>
      </footer>
    </div>
  );
}

function MockTable({ color, name, rows }: { color: string; name: string; rows: string[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-md">
      <div className="px-3 py-2 text-sm font-semibold text-white" style={{ background: color }}>
        {name}
      </div>
      {rows.map((r, i) => (
        <div
          key={r}
          className="flex items-center justify-between border-t border-border px-3 py-1.5 text-xs"
        >
          <span className="font-medium">{r}</span>
          <span className="font-mono text-[10px] text-muted-foreground">
            {i === 0 ? "uuid" : "varchar"}
          </span>
        </div>
      ))}
    </div>
  );
}

function Feature({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
