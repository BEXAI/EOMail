import { Link } from "wouter";
import { Sparkles, ShieldCheck, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Smart summaries",
    description: "Every email condensed to the lines that matter, with replies drafted for you.",
  },
  {
    icon: ShieldCheck,
    title: "Built-in protection",
    description: "Phishing and impersonation attempts are flagged before you open them.",
  },
  {
    icon: CalendarClock,
    title: "Scheduling handled",
    description: "Meeting requests turn into calendar suggestions automatically.",
  },
];

/** Phone-first welcome screen shown at "/" to signed-out visitors on small screens. */
export default function WelcomePage() {
  return (
    <div
      className="min-h-[100dvh] flex flex-col bg-background text-foreground"
      style={{ paddingTop: "max(env(safe-area-inset-top), 1.5rem)" }}
    >
      <header className="px-6 flex items-center gap-2.5">
        <img src={logoPath} alt="" className="w-9 h-9 rounded-xl object-cover" />
        <span className="text-lg font-bold tracking-tight">EOMail</span>
      </header>

      <main className="flex-1 flex flex-col justify-center px-6 py-10 [@media(max-height:700px)]:py-2">
        <h1 className="text-[2.1rem] [@media(max-height:700px)]:text-[1.85rem] leading-[1.1] font-bold tracking-tight">
          Email that
          <br />
          runs itself.
        </h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          EOMail is an AI-powered inbox that sorts, summarizes, and answers your mail, so you spend less time in it.
        </p>

        <ul className="mt-9 space-y-5 [@media(max-height:700px)]:mt-5 [@media(max-height:700px)]:space-y-3.5" data-testid="welcome-features">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-3.5">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="text-[0.95rem] font-semibold">{title}</p>
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{description}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      {/* Pinned so both actions stay visible even if the content above scrolls */}
      <footer
        className="sticky bottom-0 px-6 pt-3 space-y-3 bg-background"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 1.25rem)" }}
      >
        <Button asChild className="w-full h-12 text-base font-semibold rounded-xl" data-testid="button-welcome-signup">
          <Link href="/auth?mode=signup">Sign up</Link>
        </Button>
        <Button asChild variant="outline" className="w-full h-12 text-base font-semibold rounded-xl" data-testid="button-welcome-signin">
          <Link href="/auth">Sign in</Link>
        </Button>
        <p className="pt-1 text-center text-xs text-muted-foreground">
          Get your own <span className="font-medium text-foreground">@eomail.co</span> address in under a minute.
        </p>
      </footer>
    </div>
  );
}
