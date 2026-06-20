import { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Database,
  ArrowRight,
  MousePointerClick,
  Code2,
  GitFork,
  Boxes,
  Zap,
  Heart,
  Coffee,
  Bug,
  HelpCircle,
  X,
  ExternalLink,
  Lock,
  Sparkles,
  ChevronDown,
  LayoutDashboard,
  Check,
} from "lucide-react";
import { GitHubIcon } from "@/components/icons/github-icon";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/useAuth";
import {
  GITHUB_REPO_URL,
  SPONSOR_URL,
  BMC_URL,
  ISSUES_URL,
  CONTRIBUTING_URL,
  DISCORD_URL,
  TWITTER_URL,
} from "@/lib/site";

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
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://openflowdb.vercel.app/og-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "OpenFlowDB — Visual Database Schema Designer" },
      {
        name: "twitter:description",
        content: "Design database schemas visually and export clean SQL. Open-source alternative to DrawSQL.",
      },
      { name: "twitter:image", content: "https://openflowdb.vercel.app/og-image.png" },
      { rel: "canonical", href: "https://openflowdb.vercel.app" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const [stars, setStars] = useState<number | null>(null);
  const [showFloatingCTA, setShowFloatingCTA] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Fetch stargazers count on mount
  useEffect(() => {
    fetch("https://api.github.com/repos/Praveenpn180/openflowdb")
      .then((res) => res.json())
      .then((data) => {
        if (data && typeof data.stargazers_count === "number") {
          setStars(data.stargazers_count);
        }
      })
      .catch(() => {
        // Fallback silently if API rate limit or offline
      });
  }, []);

  // Floating CTA scroll trigger (show when scrolled 60% down)
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0 && scrolled > maxScroll * 0.6) {
        setShowFloatingCTA(true);
      } else {
        setShowFloatingCTA(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-background text-foreground scroll-smooth">
      {/* JSON-LD Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": "OpenFlowDB",
          "operatingSystem": "All",
          "applicationCategory": "DeveloperApplication",
          "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "USD",
          },
          "description":
            "Open-source visual database schema designer. Design schemas and generate clean DDL SQL.",
        })}
      </script>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition group-hover:scale-105">
              <Database className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">OpenFlowDB</span>
          </Link>
          <nav className="flex items-center gap-3">
            <a
              href={GITHUB_REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <GitHubIcon className="h-4 w-4" />
              <span>Star</span>
              {stars !== null && (
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold text-foreground border border-border">
                  {stars}
                </span>
              )}
            </a>

            {loading ? (
              <div className="flex gap-2">
                <div className="h-8 w-16 animate-pulse rounded bg-muted/40" />
                <div className="h-8 w-20 animate-pulse rounded bg-muted/60" />
              </div>
            ) : user ? (
              <Button asChild size="sm" className="cursor-pointer gap-1">
                <Link to="/dashboard">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  <span>Dashboard</span>
                </Link>
              </Button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground px-2 py-1"
                >
                  Sign In
                </Link>
                <Button asChild size="sm" className="cursor-pointer">
                  <Link to="/login">Sign Up</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.55_0.22_277/0.15),transparent)]" />
        <div className="mx-auto max-w-6xl px-6 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
            <GitFork className="h-3.5 w-3.5 text-sky-400" />
            <span>100% Free & Open-source alternative to DrawSQL</span>
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            Design database schemas{" "}
            <span className="bg-gradient-to-r from-primary to-sky-400 bg-clip-text text-transparent">
              visually
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-muted-foreground leading-relaxed">
            Drag, connect, and customize entity-relationship diagrams right in your browser.
            Generate clean, ready-to-run DDL SQL for PostgreSQL, MySQL, and SQLite instantly.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            {loading ? (
              <div className="h-11 w-44 animate-pulse rounded-md bg-muted" />
            ) : user ? (
              <Button size="lg" asChild className="cursor-pointer font-semibold shadow-lg shadow-primary/20">
                <Link to="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button size="lg" asChild className="cursor-pointer font-semibold shadow-lg shadow-primary/20">
                <Link to="/login">
                  Get Started Free <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild className="cursor-pointer border-border/80 hover:bg-muted/40">
              <Link to="/editor">
                Try Editor as Guest
              </Link>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground flex items-center justify-center gap-1.5">
            <Lock className="h-3 w-3 text-sky-400" />
            <span>Guest editor saves locally in your browser. No signup required.</span>
          </p>

          {/* Interactive CSS Mock Editor Preview */}
          <div className="mx-auto mt-16 max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                <span className="ml-3 text-xs font-mono text-muted-foreground">openflowdb — user_blog_schema</span>
              </div>
              <span className="rounded bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-mono font-medium uppercase tracking-wider text-primary">
                PostgreSQL
              </span>
            </div>
            
            <div className="relative min-h-[380px] md:grid md:grid-cols-5 bg-card/50 overflow-hidden">
              {/* Canvas Preview Area */}
              <div
                className="col-span-3 p-8 relative flex items-center justify-around flex-col gap-6 md:flex-row bg-[linear-gradient(to_right,oklch(var(--border)/0.2)_1px,transparent_1px),linear-gradient(to_bottom,oklch(var(--border)/0.2)_1px,transparent_1px)]"
                style={{ backgroundSize: "24px 24px" }}
              >
                {/* SVG connection line */}
                <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M 230 145 C 290 145, 270 240, 335 240"
                    fill="none"
                    stroke="oklch(var(--primary))"
                    strokeWidth="2.5"
                    strokeDasharray="4 2"
                    className="animate-[dash_20s_linear_infinite]"
                  />
                </svg>

                {/* Table 1: Users */}
                <div className="relative z-10 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-[float_4s_ease-in-out_infinite]">
                  <div className="bg-primary/95 px-3 py-1.5 text-xs font-bold text-primary-foreground flex justify-between items-center">
                    <span>users</span>
                    <span className="text-[9px] opacity-75">Table</span>
                  </div>
                  <div className="divide-y divide-border text-left">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-foreground">id</span>
                      <span className="font-mono text-[9px] text-primary">uuid (PK)</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span>email</span>
                      <span className="font-mono text-[9px] text-muted-foreground">varchar</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span>created_at</span>
                      <span className="font-mono text-[9px] text-muted-foreground">timestamp</span>
                    </div>
                  </div>
                </div>

                {/* Table 2: Posts */}
                <div className="relative z-10 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg animate-[float_4s_ease-in-out_infinite_1.5s]">
                  <div className="bg-sky-500/95 px-3 py-1.5 text-xs font-bold text-white flex justify-between items-center">
                    <span>posts</span>
                    <span className="text-[9px] opacity-75">Table</span>
                  </div>
                  <div className="divide-y divide-border text-left">
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span className="font-semibold text-foreground">id</span>
                      <span className="font-mono text-[9px] text-sky-400">uuid (PK)</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px] bg-sky-500/5">
                      <span className="font-semibold text-sky-400">user_id</span>
                      <span className="font-mono text-[9px] text-sky-400/90">uuid (FK)</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span>title</span>
                      <span className="font-mono text-[9px] text-muted-foreground">varchar</span>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
                      <span>status</span>
                      <span className="font-mono text-[9px] text-muted-foreground">varchar</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side SQL Code Preview */}
              <div className="col-span-2 border-t md:border-t-0 md:border-l border-border bg-muted/20 p-5 text-left font-mono text-[11px] leading-relaxed overflow-x-auto">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Generated SQL Code</span>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <pre className="text-muted-foreground">
                  <span className="text-sky-400">CREATE TABLE</span> <span className="text-emerald-400">users</span> ({"\n"}
                  {"  "}id <span className="text-amber-500">uuid PRIMARY KEY</span>,{"\n"}
                  {"  "}email <span className="text-amber-500">varchar UNIQUE</span>,{"\n"}
                  {"  "}created_at <span className="text-amber-500">timestamp</span>{"\n"}
                  );{"\n\n"}
                  <span className="text-sky-400">CREATE TABLE</span> <span className="text-emerald-400">posts</span> ({"\n"}
                  {"  "}id <span className="text-amber-500">uuid PRIMARY KEY</span>,{"\n"}
                  {"  "}user_id <span className="text-amber-500">uuid</span>,{"\n"}
                  {"  "}title <span className="text-amber-500">varchar</span>,{"\n"}
                  {"  "}status <span className="text-amber-500">varchar</span>,{"\n"}
                  {"  "}<span className="text-sky-400">FOREIGN KEY</span> (user_id){"\n"}
                  {"    "}<span className="text-sky-400">REFERENCES</span> users(id){"\n"}
                  );
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step "How it Works" Section */}
      <section className="border-t border-border/80 bg-muted/20 py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Design in minutes</h2>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            OpenFlowDB takes the complexity out of layout management and SQL scripting.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-lg mb-4">
                1
              </div>
              <h3 className="font-semibold text-base">Visual Canvas</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
                Add tables, define columns, and tweak data types on a sleek interactive canvas that supports drag & drop.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-lg mb-4">
                2
              </div>
              <h3 className="font-semibold text-base">Connect Keys</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
                Draw foreign key links simply by connecting column circles. Relationship lines automatically route.
              </p>
            </div>

            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-lg mb-4">
                3
              </div>
              <h3 className="font-semibold text-base">Export DDL</h3>
              <p className="mt-2 text-sm text-muted-foreground max-w-xs text-center leading-relaxed">
                Download fully formatted SQL scripts or copy table statements immediately to spin up your DB instance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">Powerful tools, simple controls</h2>
          <p className="mt-3 text-muted-foreground">Every utility you need to orchestrate structure.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Feature
            icon={<MousePointerClick className="h-5 w-5" />}
            title="Visual grid canvas"
            desc="Pan, zoom, and drag tables freely on an infinite schema grid designed for rapid mapping."
          />
          <Feature
            icon={<Boxes className="h-5 w-5" />}
            title="Smart relationships"
            desc="Foreign key relations map out live routes. Visual paths highlight dependencies cleanly."
          />
          <Feature
            icon={<Code2 className="h-5 w-5" />}
            title="Instant SQL compiler"
            desc="Compile schema definitions to optimized DDL. Toggle PostgreSQL, MySQL, or SQLite dialects."
          />
          <Feature
            icon={<Zap className="h-5 w-5" />}
            title="Local-first persistence"
            desc="Automatic backups keep changes safe on your local drive without creating an account."
          />
        </div>
      </section>

      {/* Comparison Section */}
      <section className="border-t border-border bg-muted/10 py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">OpenFlowDB vs. Alternatives</h2>
            <p className="mt-3 text-muted-foreground">An open-source design toolkit that fits your developer flow.</p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="p-4 font-bold text-foreground">Feature</th>
                  <th className="p-4 font-bold text-primary flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" /> OpenFlowDB
                  </th>
                  <th className="p-4 text-muted-foreground">DrawSQL</th>
                  <th className="p-4 text-muted-foreground">dbdiagram.io</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="p-4 font-medium text-foreground">Pricing</td>
                  <td className="p-4 text-emerald-500 font-semibold bg-emerald-500/5">Free (MIT Open-Source)</td>
                  <td className="p-4 text-muted-foreground">Subscription ($15+/mo)</td>
                  <td className="p-4 text-muted-foreground">Limited Free / Premium</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Local Offline Use</td>
                  <td className="p-4 bg-emerald-500/5"><Check className="h-4 w-4 text-emerald-500" /></td>
                  <td className="p-4 text-muted-foreground">No</td>
                  <td className="p-4 text-muted-foreground">No</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Diagram Limits</td>
                  <td className="p-4 text-foreground font-medium bg-emerald-500/5">Unlimited (Local & Cloud)</td>
                  <td className="p-4 text-muted-foreground">Limited in Free tier</td>
                  <td className="p-4 text-muted-foreground">Limited to 10 active</td>
                </tr>
                <tr>
                  <td className="p-4 font-medium text-foreground">Data Privacy</td>
                  <td className="p-4 text-foreground font-medium bg-emerald-500/5">Local-first / Own Database</td>
                  <td className="p-4 text-muted-foreground">Stored on central servers</td>
                  <td className="p-4 text-muted-foreground">Stored on central servers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="mt-3 text-muted-foreground">Answers to common structural and privacy questions.</p>
        </div>

        <div className="space-y-4">
          <FaqItem
            isOpen={activeFaq === 0}
            onClick={() => toggleFaq(0)}
            question="Is my database schema data private?"
            answer="Absolutely. If you use the guest editor, your diagrams are saved locally in your browser's LocalStorage and never leave your computer. When you sign up, data is securely stored in your personal account database. We do not sell or access your diagram data."
          />
          <FaqItem
            isOpen={activeFaq === 1}
            onClick={() => toggleFaq(1)}
            question="Can I host my own instance of OpenFlowDB?"
            answer="Yes, OpenFlowDB is fully open source under the MIT License. You can clone the GitHub repository and run your own instance locally, deploy to Vercel/Netlify, or link it to your own custom Supabase database backend."
          />
          <FaqItem
            isOpen={activeFaq === 2}
            onClick={() => toggleFaq(2)}
            question="What SQL databases can I generate code for?"
            answer="The visual designer lets you compile and export schemas into PostgreSQL, MySQL, and SQLite dialects instantly. We plan to support MS SQL Server and oracle dialects in a future release."
          />
          <FaqItem
            isOpen={activeFaq === 3}
            onClick={() => toggleFaq(3)}
            question="Do I need to sign up to use the visual editor?"
            answer="No signup is necessary. Click 'Try Editor as Guest' and you will get access to all design, layout, relationship, and SQL export tools. An account is only required if you want to sync your schemas to the cloud and share preview links."
          />
        </div>
      </section>

      {/* Tech Stack strip */}
      <section className="border-t border-border/60 py-12 bg-muted/10">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Built with Modern Tech</span>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-sm font-semibold text-muted-foreground/70 font-mono">
            <span>React 19</span>
            <span>Vite</span>
            <span>Supabase Auth</span>
            <span>Tailwind CSS</span>
            <span>TanStack Start</span>
          </div>
        </div>
      </section>

      {/* Bottom CTA Block */}
      <section className="border-t border-border/80 relative overflow-hidden bg-primary/5 py-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center px-6 text-center relative z-10">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to map out your next database?</h2>
          <p className="mt-4 max-w-md text-muted-foreground leading-relaxed">
            {!loading && user
              ? "Access your dashboard to open saved schemas, delete old files, or create a brand new visual structure."
              : "Create a free cloud account to save your schemas online, collaborate with team links, and restore past versions."}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            {!loading && user ? (
              <Button size="lg" asChild className="cursor-pointer w-full sm:w-auto">
                <Link to="/dashboard">
                  Access Dashboard <ArrowRight className="ml-1.5 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button size="lg" asChild className="cursor-pointer w-full sm:w-auto">
                  <Link to="/login">
                    Create Free Account <ArrowRight className="ml-1.5 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="cursor-pointer w-full sm:w-auto hover:bg-muted/40">
                  <Link to="/editor">
                    Open Guest Editor
                  </Link>
                </Button>
              </>
            )}
          </div>
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground font-mono">
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> Free Forever</span>
            <span className="flex items-center gap-1"><Check className="h-3 w-3 text-emerald-500" /> MIT Licensed</span>
          </div>
        </div>
      </section>

      {/* Exit Intent/Scroll-Triggered Floating CTA */}
      <div
        className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border border-border bg-card/95 p-4 shadow-2xl backdrop-blur-md transition-all duration-500 ${
          showFloatingCTA ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <button
          onClick={() => setShowFloatingCTA(false)}
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss banner"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <div className="flex gap-3 pr-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Database className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h4 className="text-sm font-semibold text-foreground">Create database diagrams in seconds</h4>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Skip login entirely. Get coding immediately with our visual database modeler.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button size="sm" asChild className="h-7 px-3 text-[11px] cursor-pointer">
                <Link to="/editor">Launch Editor</Link>
              </Button>
              <Link to="/login" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition px-1 py-0.5">
                or Sign Up Free
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {/* Column 1: Brand */}
            <div className="flex flex-col items-start gap-3 sm:col-span-2">
              <Link to="/" className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                  <Database className="h-3 w-3 text-primary-foreground" />
                </div>
                <span className="font-bold tracking-tight text-foreground text-sm">OpenFlowDB</span>
              </Link>
              <p className="text-xs text-muted-foreground leading-relaxed text-left max-w-md">
                An open-source database modeler designed to visualize structures and compile clean schema scripts instantly.
              </p>
            </div>

            {/* Column 2: Developer Resources */}
            <div className="flex flex-col items-start gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</h4>
              <a href={CONTRIBUTING_URL} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1.5">
                <GitFork className="h-3 w-3" /> Contribute
              </a>
              <a href={ISSUES_URL} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition flex items-center gap-1.5">
                <Bug className="h-3 w-3" /> Report a Bug
              </a>
              <a href={`${GITHUB_REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition">
                MIT License
              </a>
            </div>
          </div>

          <div className="mt-12 border-t border-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>&copy; {new Date().getFullYear()} OpenFlowDB. Open-source under MIT License.</span>
            <div className="flex items-center gap-1">
              <span>Made with</span>
              <Heart className="h-3 w-3 text-rose-500 fill-rose-500" />
              <span>by the community.</span>
            </div>
          </div>
        </div>
      </footer>
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
    <div className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:border-primary/30">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-base text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed text-left">{desc}</p>
    </div>
  );
}

function FaqItem({
  isOpen,
  onClick,
  question,
  answer,
}: {
  isOpen: boolean;
  onClick: () => void;
  question: string;
  answer: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between p-4 text-left font-medium transition-colors hover:bg-muted/30"
      >
        <span className="text-sm text-foreground flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary shrink-0" />
          {question}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      <div
        className={`transition-all duration-300 ease-in-out ${
          isOpen ? "max-h-40 border-t border-border opacity-100 p-4" : "max-h-0 opacity-0 pointer-events-none"
        }`}
      >
        <p className="text-xs text-muted-foreground leading-relaxed text-left">{answer}</p>
      </div>
    </div>
  );
}
