'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Briefcase, ArrowRight, UserCheck, ShieldCheck, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RoleSelectionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-4xl w-full mx-auto space-y-12">
        <div className="text-center space-y-4">
            <Button variant="ghost" asChild className="rounded-xl border border-border/50 hover:bg-muted font-black uppercase text-[10px] tracking-widest h-10 px-6 mb-4">
                <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Return to Home</Link>
            </Button>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-500/60">CHOOSE YOUR PATHWAY</p>
            <h1 className="text-4xl sm:text-7xl font-black text-foreground tracking-tighter uppercase italic">Join DriveGuru</h1>
            <p className="text-muted-foreground font-medium max-w-xl mx-auto text-sm sm:text-base">
              Select the professional profile that matches your goals. Are you looking to provide expert services or hire the best local talent?
            </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Expert Card */}
          <Card className="relative group overflow-hidden border-none bg-card rounded-[3rem] shadow-2xl transition-all hover:ring-2 hover:ring-orange-500/50">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <CardHeader className="pt-12 items-center text-center relative z-10">
              <div className="bg-orange-500/10 p-6 rounded-[2rem] border border-orange-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500 mb-6">
                <Briefcase className="h-12 w-12 text-orange-500" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tight mb-2">I'm an Expert</CardTitle>
              <CardDescription className="text-muted-foreground font-medium px-4">
                Offer your individual skills, set your own pricing models, and connect directly with clients.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12 px-10 relative z-10">
              <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/70">
                      <ShieldCheck className="h-4 w-4 text-green-500" /> Verified Identity Badge
                  </li>
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/70">
                      <Sparkles className="h-4 w-4 text-orange-500" /> AI-Powered Profile Tools
                  </li>
              </ul>
              <Button asChild className="w-full h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-lg shadow-xl shadow-orange-500/20 transition-all active:scale-95 group">
                <Link href="/signup">
                  BECOME AN EXPERT <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Client Card */}
          <Card className="relative group overflow-hidden border-none bg-card rounded-[3rem] shadow-2xl transition-all hover:ring-2 hover:ring-blue-500/50">
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                 style={{ backgroundImage: 'radial-gradient(var(--grid-dot) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            <CardHeader className="pt-12 items-center text-center relative z-10">
              <div className="bg-blue-500/10 p-6 rounded-[2rem] border border-blue-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500 mb-6">
                <UserCheck className="h-12 w-12 text-blue-500" />
              </div>
              <CardTitle className="text-3xl font-black uppercase italic tracking-tight mb-2">I'm a Client</CardTitle>
              <CardDescription className="text-muted-foreground font-medium px-4">
                Discover trusted professionals for any task. Browse the registry and book appointments instantly.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-12 px-10 relative z-10">
               <ul className="space-y-4 mb-10">
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/70">
                      <ShieldCheck className="h-4 w-4 text-green-500" /> Direct Expert Contact
                  </li>
                  <li className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-foreground/70">
                      <User className="h-4 w-4 text-blue-500" /> Secure Talent Search
                  </li>
              </ul>
              <Button asChild variant="outline" className="w-full h-16 rounded-2xl border-border bg-background hover:bg-muted text-foreground font-black text-lg shadow-xl transition-all active:scale-95 group">
                <Link href="/">
                  SEARCH FOR TALENT <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
