import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Users, CheckCircle, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">CV Shortlister</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Screen CVs with{" "}
            <span className="text-primary">Evidence-Backed</span> Confidence
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            Upload CVs, define your criteria, and get intelligent shortlists
            with every match backed by real evidence from the documents.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg">Start Free Trial</Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-muted/50 py-24">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold">
              Why CV Shortlister?
            </h2>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={<FileText className="h-10 w-10 text-primary" />}
                title="Smart Parsing"
                description="Extracts text from PDFs with OCR fallback. Handles scanned documents seamlessly."
              />
              <FeatureCard
                icon={<Users className="h-10 w-10 text-primary" />}
                title="Role-Based Matching"
                description="Define must-have and nice-to-have skills. Set location preferences and experience requirements."
              />
              <FeatureCard
                icon={<CheckCircle className="h-10 w-10 text-primary" />}
                title="Evidence Trail"
                description="Every match shows the exact snippet and page number. No hallucinations, just facts."
              />
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24">
          <div className="container">
            <h2 className="mb-12 text-center text-3xl font-bold">
              How It Works
            </h2>
            <div className="grid gap-8 md:grid-cols-4">
              <StepCard
                number={1}
                title="Upload CVs"
                description="Drag and drop multiple PDFs or DOCX files"
              />
              <StepCard
                number={2}
                title="Define Criteria"
                description="Set skills, experience, and location requirements"
              />
              <StepCard
                number={3}
                title="Run Shortlist"
                description="Get ranked candidates with scores"
              />
              <StepCard
                number={4}
                title="Review Evidence"
                description="See highlighted matches in original documents"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>&copy; 2026 CV Shortlister. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-6 text-center">
      <div className="mb-4 flex justify-center">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
        {number}
      </div>
      <h3 className="mb-2 font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
