
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Calendar, Share2, Mail, Users, FileText, CheckCircle } from 'lucide-react';
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
            <DialogContent className="sm:max-w-[500px] rounded-3xl border-none">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Apply for {vacancy.title}</DialogTitle>
                    <DialogDescription className="font-medium">
                        Send your resume and cover letter to the email address below to apply for this position.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company-email" className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Contact Email</Label>
                        <div className="flex items-center gap-2">
                            <Input id="company-email" value={vacancy.companyEmail} readOnly className="rounded-xl h-12 bg-secondary/50 border-none font-bold" />
                            <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={() => copyToClipboard(vacancy.companyEmail, 'Email')}>
                                <Mail className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <a href={`mailto:${vacancy.companyEmail}?subject=${encodeURIComponent(subject)}`} className="w-full">
                      <Button className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black shadow-lg shadow-orange-500/20">
                        Open Email Client
                      </Button>
                    </a>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
    return (
        <Card className="border-none rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 bg-white group">
            <CardContent className="p-8 space-y-6">
                {/* Status Badges */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {vacancy.isImmediate && (
                            <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200 text-[10px] font-black py-1 px-3 rounded-full flex items-center gap-1 uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" /> Immediate
                            </Badge>
                        )}
                        {vacancy.isCompanyVerified && (
                            <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 text-[10px] font-black py-1 px-3 rounded-full flex items-center gap-1 uppercase tracking-wider">
                                <CheckCircle className="h-3 w-3" /> Verified
                            </Badge>
                        )}
                        {vacancy.companyTier === 'Premier' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] font-black py-1 px-3 rounded-full flex items-center gap-1 uppercase tracking-wider">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Premier
                            </Badge>
                        )}
                    </div>
                    <ShareDialog shareDetails={{ type: 'vacancy', vacancyId: vacancy.id, vacancyTitle: vacancy.title, companyName: vacancy.companyName }}>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-slate-300 hover:text-orange-500 hover:bg-orange-50 transition-colors">
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </ShareDialog>
                </div>

                {/* Title */}
                <div>
                    <h3 className="text-2xl font-black text-[#1a1c23] tracking-tight group-hover:text-orange-500 transition-colors">{vacancy.title}</h3>
                    <p className="text-sm font-bold text-slate-400 mt-1 flex items-center gap-2">
                        <Building className="h-4 w-4" /> {vacancy.companyName}
                    </p>
                </div>

                {/* Description Accordion */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="description" className="border-none bg-slate-50 rounded-2xl px-4">
                        <AccordionTrigger className="flex items-center gap-2 hover:no-underline text-slate-600 text-sm font-black py-4">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-orange-500" />
                                <span>View Job Details</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-6 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                            {vacancy.description}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                                <p className="font-black text-[#1a1c23] mb-2 uppercase text-[10px] tracking-widest">Required Expertise:</p>
                                <div className="flex flex-wrap gap-2">
                                    {vacancy.skillsRequired.split(',').map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="bg-white border text-slate-600 font-bold rounded-lg">{skill.trim()}</Badge>
                                    ))}
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-500">
                            <Calendar className="h-4 w-4 text-orange-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{vacancy.postedAt ? format(vacancy.postedAt.toDate(), 'MMM d, yyyy') : 'Recent'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500">
                            <MapPin className="h-4 w-4 text-orange-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider truncate">{vacancy.location}</span>
                        </div>
                    </div>
                    <div className="space-y-3 text-right">
                        <div className="flex items-center justify-end gap-3 text-slate-500">
                            <Briefcase className="h-4 w-4 text-orange-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{vacancy.employmentType}</span>
                        </div>
                        <div className="flex items-center justify-end gap-3 text-slate-500">
                            <Users className="h-4 w-4 text-orange-500" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">{vacancy.positionsAvailable} Openings</span>
                        </div>
                    </div>
                </div>

                <ApplyDialog vacancy={vacancy}>
                    <Button className="w-full bg-[#1a1c23] hover:bg-orange-500 text-white font-black h-14 rounded-[1.25rem] shadow-xl shadow-slate-200 group-hover:shadow-orange-200 transition-all active:scale-[0.98]">
                        <Mail className="mr-2 h-5 w-5" /> Apply Now
                    </Button>
                </ApplyDialog>
            </CardContent>
        </Card>
    );
}

function JobsList() {
    const firestore = useFirestore();

    const vacanciesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        // Showing all "Approved" vacancies as these are the ones the admin has vetted
        return query(
            collection(firestore, 'vacancies'), 
            where('status', '==', 'Approved'),
            orderBy('postedAt', 'desc')
        );
    }, [firestore]);

    const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <p className="text-slate-400 font-black uppercase text-xs tracking-[0.2em]">Curating Opportunities...</p>
            </div>
        );
    }

    if (!vacancies || vacancies.length === 0) {
        return (
            <div className="text-center py-24 bg-white rounded-[3rem] border-4 border-dashed border-slate-50 shadow-inner">
                <div className="bg-slate-50 p-6 rounded-full w-fit mx-auto mb-6">
                    <Briefcase className="h-16 w-16 text-slate-200" />
                </div>
                <h2 className="text-3xl font-black text-[#1a1c23] tracking-tight">No Active Jobs</h2>
                <p className="text-slate-400 mt-2 font-medium max-w-sm mx-auto">We're currently updating our listings. Check back soon for new career opportunities.</p>
                <Button variant="link" className="mt-6 text-orange-500 font-bold" asChild>
                    <Link href="/">Explore Experts instead</Link>
                </Button>
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

export default function JobsPage() {
    return (
        <div className="min-h-screen bg-[#f8f9fc] p-4 sm:p-8 pb-24">
            <div className="mx-auto max-w-7xl">
                <header className="text-center space-y-6 mb-16">
                    <div className="inline-flex items-center justify-center p-4 bg-orange-500 rounded-[2rem] shadow-2xl shadow-orange-200 mb-2">
                        <Briefcase className="h-12 w-12 text-white" />
                    </div>
                    <div>
                        <h1 className="text-5xl sm:text-7xl font-black text-[#1a1c23] tracking-tighter leading-none mb-4">Explore Jobs</h1>
                        <p className="text-lg sm:text-xl text-slate-400 font-bold max-w-2xl mx-auto leading-relaxed">
                            Discover verified career opportunities with DriveGuru&apos;s trusted professional network.
                        </p>
                    </div>
                    <div className="pt-4">
                        <Button variant="outline" asChild className="rounded-2xl border-none bg-white hover:bg-slate-50 shadow-xl h-12 px-8 font-black text-slate-600 transition-all active:scale-95">
                            <Link href="/"><ChevronLeft className="mr-2 h-5 w-5 text-orange-500" /> Back Home</Link>
                        </Button>
                    </div>
                </header>

                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        </div>
                    }>
                        <JobsList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
