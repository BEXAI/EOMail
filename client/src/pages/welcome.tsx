import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import logoPath from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

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

      <main className="flex-1 flex flex-col px-6 pt-8 pb-4 [@media(max-height:700px)]:pt-4">
        <h1 className="text-[2.1rem] [@media(max-height:700px)]:text-[1.85rem] leading-[1.1] font-bold tracking-tight">
          Email that
          <br />
          runs itself.
        </h1>
        <p className="mt-4 text-base text-muted-foreground leading-relaxed">
          EOMail is an AI-powered inbox that sorts, summarizes, and answers your mail, so you spend less time in it.
        </p>

        {/* Product preview: the app's menu in dark mode, cropped to whatever height the screen allows */}
        <figure
          className="relative mt-6 flex-1 min-h-[180px] overflow-hidden rounded-[1.75rem] bg-[#1b2027] ring-1 ring-border shadow-lg"
          data-testid="welcome-preview"
        >
          <img
            src="/assets/mobile-menu-dark.jpg"
            alt="The EOMail menu in dark mode, with Compose, Inbox, Sent, Drafts, Pending Approvals, and the FinOps, Calendar, and Security AI features"
            width={720}
            height={1742}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover object-top"
          />
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-[#1b2027] to-transparent" aria-hidden="true" />
        </figure>
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
