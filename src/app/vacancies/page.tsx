'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Calendar, Share2, Mail, Users, FileText, CheckCircle2, Crown } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ShareDialog } from '@/components/share-dialog';
import { cn } from '@/lib/utils';

export type Vacancy = {
    id: string;
    title: string;
    description: string;
    companyId: string;
    companyName: string;
    companyEmail: string;
    contactPhone?: string;
    location: string;
    employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    skillsRequired: string;
    isImmediate?: boolean;
    positionsAvailable: number;
    isCompanyVerified?: boolean;
    companyTier?: 'Standard' | 'Premier' | 'Super Premier';
    status: 'Pending' | 'Approved' | 'Rejected';
    postedAt: Timestamp;
};

const ApplyDialog = ({ vacancy, children }: { vacancy: Vacancy, children: React.ReactNode }) => {
    const { toast } = useToast();
    const subject = `Application for ${vacancy.title}`;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copied to Clipboard',
            description: `${field} has been copied.`,
        });
    };
    
    return (
        <Dialog>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] border-none bg-[#1a1c23] rounded-[2rem] text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Apply for {vacancy.title}</DialogTitle>
                    <DialogDescription className="text-muted-foreground font-medium">
                        To apply, please send your resume and a cover letter to the email address below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="company-email" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Company Email</Label>
                        <div className="flex items-center gap-2">
                            <Input id="company-email" value={vacancy.companyEmail} readOnly className="bg-white/5 border-none rounded-xl h-12" />
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl border-white/10 hover:bg-white/5" onClick={() => copyToClipboard(vacancy.companyEmail, 'Email')}>
                                <Mail className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <a href={`mailto:${vacancy.companyEmail}?subject=${encodeURIComponent(subject)}`} className="w-full">
                      <Button className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-xl shadow-orange-500/20">Open Email Client</Button>
                    </a>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
    return (
        <Card className="border-none rounded-[2rem] overflow-hidden shadow-2xl bg-[#24262d] transition-all hover:scale-[1.02] group ring-1 ring-white/5 hover:ring-orange-500/30">
            <CardContent className="p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {vacancy.isImmediate && (
                            <Badge variant="outline" className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[10px] font-black uppercase py-1 px-3 rounded-full flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Immediate
                            </Badge>
                        )}
                        {vacancy.isCompanyVerified && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] font-black uppercase py-1 px-3 rounded-full flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Verified
                            </Badge>
                        )}
                        {vacancy.companyTier === 'Premier' && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/20 text-[10px] font-black uppercase py-1 px-3 rounded-full flex items-center gap-1">
                                <Crown className="h-3 w-3" /> Premier
                            </Badge>
                        )}
                    </div>
                    <ShareDialog shareDetails={{ type: 'vacancy', vacancyId: vacancy.id, vacancyTitle: vacancy.title, companyName: vacancy.companyName }}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-white hover:bg-white/5 rounded-full">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </ShareDialog>
                </div>

                <h3 className="text-3xl font-black text-white tracking-tighter group-hover:text-orange-500 transition-colors leading-tight">{vacancy.title}</h3>

                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="description" className="border-none">
                        <AccordionTrigger className="flex items-center gap-2 hover:no-underline text-muted-foreground text-sm font-bold uppercase tracking-widest py-0 group-data-[state=open]:text-white">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>Details & Skills</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-6 text-muted-foreground/80 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                            {vacancy.description}
                            <div className="mt-6 pt-6 border-t border-white/5">
                                <p className="font-black text-white text-xs uppercase tracking-widest mb-3">Required Skills</p>
                                <div className="flex flex-wrap gap-2">
                                    {vacancy.skillsRequired.split(',').map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="bg-white/5 text-white/70 border-none font-bold text-[10px] px-3 py-1 rounded-lg">{skill.trim()}</Badge>
                                    ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="space-y-4 pt-2">
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2.5 bg-white/5 rounded-xl"><Building className="h-4 w-4 text-orange-500" /></div>
                        <span className="text-sm font-black text-white/90">{vacancy.companyName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2.5 bg-white/5 rounded-xl"><Calendar className="h-4 w-4 text-orange-500" /></div>
                        <span className="text-xs font-bold uppercase tracking-wider">{vacancy.postedAt ? format(vacancy.postedAt.toDate(), 'MMMM d, yyyy') : 'Just now'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2.5 bg-white/5 rounded-xl"><MapPin className="h-4 w-4 text-orange-500" /></div>
                        <span className="text-xs font-bold">{vacancy.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2.5 bg-white/5 rounded-xl"><Briefcase className="h-4 w-4 text-orange-500" /></div>
                        <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase px-3 py-1 rounded-full border-none">
                            {vacancy.employmentType}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-muted-foreground">
                        <div className="p-2.5 bg-white/5 rounded-xl"><Users className="h-4 w-4 text-orange-500" /></div>
                        <span className="text-xs font-bold text-white/60">{vacancy.positionsAvailable} Position{vacancy.positionsAvailable !== 1 ? 's' : ''} available</span>
                    </div>
                </div>

                <ApplyDialog vacancy={vacancy}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black h-14 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all text-lg">
                        <Mail className="mr-2 h-6 w-6" /> Apply Now
                    </Button>
                </ApplyDialog>
            </CardContent>
        </Card>
    );
}

function VacanciesList() {
    const firestore = useFirestore();

    const vacanciesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'vacancies'), 
            orderBy('postedAt', 'desc')
        );
    }, [firestore]);

    const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <p className="text-muted-foreground font-black uppercase tracking-widest text-xs">Loading opportunities...</p>
            </div>
        );
    }

    if (!vacancies || vacancies.length === 0) {
        return (
            <div className="text-center py-32 bg-[#24262d] rounded-[3rem] border-4 border-dashed border-white/5">
                <Briefcase className="h-20 w-20 text-white/5 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-white">No Openings Found</h2>
                <p className="text-muted-foreground mt-2 font-medium max-w-sm mx-auto">Check back later for new career opportunities in your area.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vacancies.map(vacancy => (
                <VacancyCard key={vacancy.id} vacancy={vacancy} />
            ))}
        </div>
    );
}

export default function VacanciesPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8 pb-32">
            <div className="mx-auto max-w-7xl">
                <header className="text-center space-y-6 mb-20 pt-8">
                    <div className="flex items-center justify-center gap-4">
                        <div className="bg-orange-500 p-4 rounded-[1.5rem] shadow-2xl shadow-orange-500/30">
                            <Briefcase className="h-12 w-12 text-white" />
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter">Job Board</h1>
                    </div>
                    <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto px-4 leading-relaxed">
                        Kickstart your career with the best local opportunities from verified companies.
                    </p>
                    <div className="pt-4">
                        <Button variant="outline" asChild className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-white h-12 px-8 font-bold">
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                </header>

                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        </div>
                    }>
                        <VacanciesList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}