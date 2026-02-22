
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Calendar, Share2, Mail, Users, FileText, ChevronDown } from 'lucide-react';
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Apply for {vacancy.title}</DialogTitle>
                    <DialogDescription>
                        To apply, please send your resume and a cover letter to the email address below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="company-email">Company Email</Label>
                        <div className="flex items-center gap-2">
                            <Input id="company-email" value={vacancy.companyEmail} readOnly />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(vacancy.companyEmail, 'Email')}>
                                <Mail className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <a href={`mailto:${vacancy.companyEmail}?subject=${encodeURIComponent(subject)}`} className="w-full">
                      <Button className="w-full bg-orange-500 hover:bg-orange-600">Open Email Client</Button>
                    </a>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
    return (
        <Card className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white">
            <CardContent className="p-6 space-y-6">
                {/* Badges and Share */}
                <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-2">
                        {vacancy.isImmediate && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 text-[10px] font-bold py-1 px-3 rounded-md flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Immediate
                            </Badge>
                        )}
                        {vacancy.isCompanyVerified && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px] font-bold py-1 px-3 rounded-md flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Verified
                            </Badge>
                        )}
                        {vacancy.companyTier === 'Premier' && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 text-[10px] font-bold py-1 px-3 rounded-md flex items-center gap-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-purple-500" /> Premier
                            </Badge>
                        )}
                    </div>
                    <ShareDialog shareDetails={{ type: 'vacancy', vacancyId: vacancy.id, vacancyTitle: vacancy.title, companyName: vacancy.companyName }}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600">
                            <Share2 className="h-4 w-4" />
                        </Button>
                    </ShareDialog>
                </div>

                {/* Job Title */}
                <h3 className="text-2xl font-black text-[#1a1c23] tracking-tight">{vacancy.title}</h3>

                {/* Expandable Description */}
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="description" className="border-none">
                        <AccordionTrigger className="flex items-center gap-2 hover:no-underline text-slate-500 text-sm font-medium py-0">
                            <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                <span>View Job Description</span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pt-4 text-slate-600 leading-relaxed text-sm whitespace-pre-wrap">
                            {vacancy.description}
                            <div className="mt-4 pt-4 border-t border-slate-100">
                                <p className="font-bold text-slate-900 mb-1">Required Skills:</p>
                                <p className="text-slate-500">{vacancy.skillsRequired}</p>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3 text-slate-500">
                        <Building className="h-4 w-4 shrink-0" />
                        <span className="text-sm font-bold text-slate-700">{vacancy.companyName}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span className="text-sm">Posted: {vacancy.postedAt ? format(vacancy.postedAt.toDate(), 'MMM d, yyyy') : 'Recently'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="text-sm">{vacancy.location}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                        <Briefcase className="h-4 w-4 shrink-0" />
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 text-[11px] font-bold px-3 py-0.5 rounded-full">
                            {vacancy.employmentType}
                        </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-slate-500">
                        <Users className="h-4 w-4 shrink-0" />
                        <span className="text-sm">Positions Available: {vacancy.positionsAvailable}</span>
                    </div>
                </div>

                <ApplyDialog vacancy={vacancy}>
                    <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-black h-12 rounded-xl shadow-lg shadow-orange-500/20">
                        <Mail className="mr-2 h-5 w-5" /> Apply Now
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
            where('status', '==', 'Approved'),
            orderBy('postedAt', 'desc')
        );
    }, [firestore]);

    const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                <p className="ml-4 text-muted-foreground font-medium">Loading opportunities...</p>
            </div>
        );
    }

    if (!vacancies || vacancies.length === 0) {
        return (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Briefcase className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-slate-900">No Job Openings Found</h2>
                <p className="text-slate-500 mt-2 font-medium">Check back later for new career opportunities.</p>
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
        <div className="min-h-screen bg-[#f8f9fc] p-4 sm:p-8 pb-20">
            <div className="mx-auto max-w-7xl">
                <header className="text-center space-y-4 mb-12">
                    <div className="flex items-center justify-center gap-4">
                        <div className="bg-orange-500 p-3 rounded-2xl shadow-xl shadow-orange-500/20">
                            <Briefcase className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-black text-[#1a1c23] tracking-tighter">Job Vacancies</h1>
                    </div>
                    <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
                        Find your next career opportunity with our trusted companies.
                    </p>
                    <div className="pt-4">
                        <Button variant="outline" asChild className="rounded-xl border-slate-200 bg-white hover:bg-slate-50 shadow-sm">
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                </header>

                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    }>
                        <VacanciesList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
