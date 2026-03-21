'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Briefcase, Search, UserCheck, Users, Rss, Sparkles, ShieldCheck, Award } from 'lucide-react';
import { Icons } from '@/components/icons';

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-5xl w-full space-y-12 py-12">
        <div className="text-center space-y-4">
            <div className="mx-auto bg-orange-500/10 p-6 rounded-[2rem] border border-orange-500/20 shadow-inner w-fit mb-6 animate-bounce">
              <Icons.logo className="h-12 w-12 text-orange-500" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">REGISTRATION SUCCESSFUL</p>
            <h1 className="text-4xl sm:text-7xl font-black text-foreground tracking-tighter uppercase italic">Welcome to DriveGuru</h1>
            <p className="text-muted-foreground font-medium max-w-xl mx-auto text-sm sm:text-base">
              Your professional journey starts here. Explore our premium features and start building your network today.
            </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 text-left">
          {[
            {
              title: "Discover Experts",
              desc: "Use our AI-powered registry to find trusted professionals for any industry or task.",
              icon: <Search className="h-6 w-6 text-orange-500" />,
              link: "/",
              label: "Search Registry"
            },
            {
              title: "Manage Profile",
              desc: "Access your expert workspace to update services, set rates, and track your influence score.",
              icon: <UserCheck className="h-6 w-6 text-orange-500" />,
              link: "/dashboard",
              label: "Go to Dashboard"
            },
            {
              title: "Professional Groups",
              desc: "Connect and share specialized knowledge with other experts in secure industry communities.",
              icon: <Users className="h-6 w-6 text-orange-500" />,
              link: "/groups",
              label: "Explore Groups"
            },
            {
              title: "Public Updates",
              desc: "Share your latest projects and insights on the community wall to attract new clients.",
              icon: <Rss className="h-6 w-6 text-orange-500" />,
              link: "/feed",
              label: "View Public Feed"
            }
          ].map((item, i) => (
            <Card key={i} className="relative group overflow-hidden border-none bg-card rounded-[2.5rem] shadow-2xl transition-all hover:ring-2 hover:ring-orange-500/30 p-8">
                <div className="flex items-start gap-5">
                    <div className="bg-background p-4 rounded-2xl border border-border shadow-inner group-hover:scale-110 transition-transform">
                        {item.icon}
                    </div>
                    <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-black uppercase italic tracking-tight">{item.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-6">
                            {item.desc}
                        </p>
                        <Button asChild variant="ghost" className="p-0 h-auto font-black text-[10px] uppercase tracking-[0.2em] text-orange-500 hover:text-orange-400 hover:bg-transparent">
                            <Link href={item.link}>
                                {item.label} <ArrowRight className="ml-2 h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-8">
            <Button asChild size="lg" className="h-20 rounded-[1.5rem] bg-orange-500 hover:bg-orange-600 text-white font-black text-lg sm:text-xl px-12 shadow-2xl shadow-orange-500/30 uppercase tracking-[0.2em] transition-all active:scale-95 group">
                <Link href="/dashboard">
                    GET STARTED <Sparkles className="ml-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                </Link>
            </Button>
        </div>
      </div>
    </div>
  );
}
