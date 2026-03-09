import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import autopropLogo from "@assets/912AF931-1EA4-4CC4-8976-8C6D0557A5A5_1_105_c_1772859976130.jpeg";

const WALKTHROUGH_STEPS = [
    {
        title: "1. FinOps Autopilot",
        description: "Invoices and receipts are instantly detected, digested, and stored. EOMail extracts total amounts, sender information, and categorizes financial documents automatically so your accountant doesn't have to wait.",
        placeholder: "[FinOps Interface Screenshot will go here]"
    },
    {
        title: "2. Chrono Logistics",
        description: "Meeting requests and scheduling emails are automatically recognized. Chrono drafts calendar invites, flags timezone conflicts, and pre-writes optimal responses to save you endless back-and-forth.",
        placeholder: "[Chrono Scheduling Screenshot will go here]"
    },
    {
        title: "3. Aegis Security",
        description: "Every inbound email is scanned via advanced heuristics. Phishing attempts and urgent social engineering attacks are quarantined instantly with clear danger breakdowns, protecting your team.",
        placeholder: "[Aegis Threat Detection Screenshot will go here]"
    },
    {
        title: "4. The EOMail Assistant",
        description: "When dealing with newsletter floods or dense threads, the EOMail core assistant digests the content into a 2-line summary so you instantly know what matters without reading a 40-reply chain.",
        placeholder: "[EOMail Chat / Summary Screenshot will go here]"
    }
];

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 flex flex-col font-sans overflow-x-hidden">

            {/* Navigation Layer */}
            <nav className="fixed top-0 w-full z-50 border-b border-white/[0.03] bg-background/80 backdrop-blur-md">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex flex-col items-center justify-center -translate-y-[2px]">
                        <img src={autopropLogo} alt="EOMail logo" className="w-10 h-10 rounded-xl shadow-xl object-cover" />
                    </div>
                    <div className="flex gap-4">
                        <Link href="/auth">
                            <span className="text-sm font-semibold tracking-widest uppercase hover:text-white/80 cursor-pointer pt-2">Login</span>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="flex-1 flex flex-col justify-start pt-32 pb-20 container mx-auto px-6">

                {/* Hero Text */}
                <section className="text-center max-w-3xl mx-auto space-y-6 mb-16 animate-stagger-fade-in">
                    <div className="inline-block px-3 py-1 mb-4 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] uppercase font-bold tracking-widest shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                        Inbox Zero → Zero Time Spent
                    </div>

                    <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter text-[#0a1930] [text-shadow:0_0_15px_#1e3a8a,0_0_25px_#3b82f6,0_0_35px_#3b82f6]">
                        The AI-Powered <br className="hidden md:block" /> Command Center
                    </h1>

                    <p className="text-lg text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed mt-6">
                        EOMail automatically categorizes inbound threats, processes invoices via FinOps, auto-drafts replies, and coordinates scheduling—all autonomously.
                    </p>

                    <div className="pt-6 flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Link href="/auth">
                            <Button size="lg" className="h-14 px-8 text-xs font-bold uppercase tracking-widest bg-[#1e3a8a] hover:bg-[#172554] text-white">
                                Enter The Inbox
                            </Button>
                        </Link>
                    </div>
                </section>

                {/* The Carousel Walkthrough */}
                <section className="max-w-6xl mx-auto w-full mt-12 animate-stagger-fade-in eomail-glass rounded-2xl border border-white/5 shadow-2xl relative px-4 sm:px-12 py-8">

                    <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent opacity-50 left-0"></div>

                    <Carousel className="w-full" opts={{ align: "start", loop: true }}>
                        <CarouselContent>
                            {WALKTHROUGH_STEPS.map((step, idx) => (
                                <CarouselItem key={idx}>
                                    <div className="p-4 md:p-8 flex flex-col md:flex-row gap-12 items-center">

                                        {/* Carousel Content Info */}
                                        <div className="flex-1 space-y-6">
                                            <h2 className="text-2xl font-bold uppercase tracking-widest text-[#3b82f6]">{step.title}</h2>
                                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                                                {step.description}
                                            </p>
                                        </div>

                                        {/* Carousel Screenshot Area */}
                                        <div className="flex-[1.5] w-full bg-black/40 rounded-xl border border-white/10 aspect-[16/10] flex items-center justify-center overflow-hidden relative shadow-inner">
                                            <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/20 to-transparent z-0"></div>
                                            <p className="text-xs font-mono text-muted-foreground z-10 text-center px-4">{step.placeholder}</p>
                                        </div>

                                    </div>
                                </CarouselItem>
                            ))}
                        </CarouselContent>

                        <div className="hidden sm:block">
                            <CarouselPrevious className="left-0 -translate-x-1/2 bg-[#1e3a8a] border-0 text-white hover:bg-[#172554]" />
                            <CarouselNext className="right-0 translate-x-1/2 bg-[#1e3a8a] border-0 text-white hover:bg-[#172554]" />
                        </div>

                        <div className="flex justify-center gap-4 mt-6 sm:hidden">
                            <CarouselPrevious className="static translate-y-0 bg-[#1e3a8a] border-0 text-white" />
                            <CarouselNext className="static translate-y-0 bg-[#1e3a8a] border-0 text-white" />
                        </div>
                    </Carousel>
                </section>

            </main>

            <footer className="border-t border-white/5 mt-auto bg-black/50 py-8 text-center text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                <p>© 2026 EOMail Corp. Built for optimal velocity.</p>
            </footer>
        </div>
    );
}
