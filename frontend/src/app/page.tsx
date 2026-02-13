import Link from "next/link";
import { ArrowRight, CheckCircle2, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { H1, H2, H3, Lead, Muted } from "@/components/ui/typography";

const features = [
  {
    title: "Evidence-Backed Ranking",
    description:
      "Every score links to exact proof from the CV so reviewers decide quickly with confidence.",
    icon: FileSearch,
  },
  {
    title: "Fast Pipeline Decisions",
    description:
      "Bulk actions, sticky tables, and role-focused views reduce time-to-shortlist for HR teams.",
    icon: Sparkles,
  },
  {
    title: "Audit-Ready Reviews",
    description:
      "Structured scoring and consistent criteria make hiring decisions repeatable and defensible.",
    icon: ShieldCheck,
  },
];

const steps = [
  {
    title: "Upload CVs",
    description:
      "Drop candidate files once and let ingestion handle parsing in the background.",
  },
  {
    title: "Define Role Criteria",
    description:
      "Set must-have and nice-to-have requirements with clear weighting for each role.",
  },
  {
    title: "Review and Decide",
    description:
      "Use ranked tables and evidence drawers to shortlist candidates in minutes.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-6xl px-6">
        <header className="sticky top-0 z-20 py-4">
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/90 px-4 py-3 shadow-sm backdrop-blur">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <span className="text-base font-semibold tracking-tight">CV Shortlister</span>
            </Link>
            <nav className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </nav>
          </div>
        </header>

        <main className="pb-10 pt-12">
          <section className="rounded-2xl border border-border/80 bg-card px-8 py-14 shadow-sm">
            <div className="mx-auto max-w-3xl text-center">
              <Badge className="mb-4">Built for HR decision speed</Badge>
              <H1>
                Hire faster with a calm,
                <span className="text-primary"> evidence-first </span>
                CV workflow
              </H1>
              <Lead className="mt-5">
                A modern ATS workspace for HR teams reviewing high candidate volume
                with speed, clarity, and consistency.
              </Lead>
              <div className="mt-8 flex items-center justify-center gap-3">
                <Link href="/register">
                  <Button size="lg">Start Free Trial</Button>
                </Link>
                <Link href="/jobs">
                  <Button size="lg" variant="outline">
                    Open Workspace
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="mb-6 text-center">
              <H2>Built for high-speed candidate review</H2>
              <Muted className="mt-2">
                Clean surfaces, structured evidence, and fewer clicks to every decision.
              </Muted>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card
                    key={feature.title}
                    className="border-border/80 bg-card shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <CardHeader>
                      <span className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </span>
                      <CardTitle>{feature.title}</CardTitle>
                      <CardDescription className="text-sm leading-6">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </section>

          <section className="mt-14 rounded-2xl border border-border/80 bg-card p-7 shadow-sm">
            <div className="mb-6 text-center">
              <H2>How it works</H2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {steps.map((step, index) => (
                <Card key={step.title} className="border-border/80 bg-background">
                  <CardHeader>
                    <span className="mb-1 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
                      {index + 1}
                    </span>
                    <H3>{step.title}</H3>
                  </CardHeader>
                  <CardContent>
                    <Muted className="leading-6">{step.description}</Muted>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </main>

        <footer className="pb-8">
          <Separator className="mb-4" />
          <p className="text-center text-sm text-muted-foreground">
            © 2026 CV Shortlister. Built for modern hiring teams.
          </p>
        </footer>
      </div>
    </div>
  );
}
