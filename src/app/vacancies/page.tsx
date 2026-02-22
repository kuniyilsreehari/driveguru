
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Calendar, Phone, Share2, UserCheck, Crown, Sparkles, MoreHorizontal, Mail, Copy, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
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
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                     <div className="grid gap-2">
                        <Label htmlFor="subject">Email Subject</Label>
                        <div className="flex items-center gap-2">
                            <Input id="subject" value={subject} readOnly />
                            <Button variant="outline" size="icon" onClick={() => copyToClipboard(subject, 'Subject')}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <a href={`mailto:${vacancy.companyEmail}?subject=${encodeURIComponent(subject)}`} className="w-full">
                      <Button className="w-full">Open Email Client</Button>
                    </a>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading job board...</p>
            </div>
        );
    }

    if (!vacancies || vacancies.length === 0) {
        return (
            <div className="text-center py-16">
                <h2 className="text-2xl font-semibold">No Job Openings Found</h2>
                <p className="text-muted-foreground mt-2">Check back later for new opportunities.</p>
            </div>
        );
    }

    return (
        <Card className="border-none bg-white rounded-2xl overflow-hidden shadow-sm">
            <CardHeader className="pb-6 px-8 pt-8 border-b border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="bg-white border-2 border-black p-3 rounded-xl shadow-sm">
                        <Briefcase className="h-6 w-6 text-black" />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black text-[#1a1c23] tracking-tight">Active Opportunities</CardTitle>
                        <CardDescription className="text-muted-foreground text-sm font-medium">Find your next career move with verified companies.</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="px-0 pb-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-b border-slate-100">
                                <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider h-14 pl-8">Title</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider h-14">Company</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider h-14">Location</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider h-14 text-center">Type</TableHead>
                                <TableHead className="font-bold text-slate-500 text-xs uppercase tracking-wider h-14">Posted</TableHead>
                                <TableHead className="text-right font-bold text-slate-500 text-xs uppercase tracking-wider h-14 pr-8">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vacancies.map(vacancy => (
                                <TableRow key={vacancy.id} className="hover:bg-slate-50/30 transition-colors border-b border-slate-50 h-24">
                                    <TableCell className="py-4 pl-8">
                                        <div className="font-bold text-[#1a1c23] text-base">{vacancy.title}</div>
                                    </TableCell>
                                    <TableCell className="py-4">
                                        <div className="space-y-1.5">
                                            <div className="text-sm font-bold text-[#1a1c23]">{vacancy.companyName}</div>
                                            <div className="flex items-center gap-2">
                                                {vacancy.isCompanyVerified && (
                                                    <Badge variant="outline" className="h-5 px-2 rounded-md border-green-500/30 bg-green-50/50 text-green-600 text-[10px] font-bold flex items-center gap-1">
                                                        <UserCheck className="h-2.5 w-2.5" /> Verified
                                                    </Badge>
                                                )}
                                                {vacancy.companyTier === 'Premier' && (
                                                    <Badge variant="outline" className="h-5 px-2 rounded-md border-purple-500/30 bg-purple-50/50 text-purple-600 text-[10px] font-bold flex items-center gap-1">
                                                        <Crown className="h-2.5 w-2.5" /> Premier
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="py-4 text-slate-600 font-medium">
                                        {vacancy.location}
                                    </TableCell>
                                    <TableCell className="text-center py-4">
                                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 rounded-full px-3 py-0.5 text-[11px] font-bold">
                                            {vacancy.employmentType}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="py-4 text-slate-500 text-sm">
                                        {vacancy.postedAt ? formatDistanceToNow(vacancy.postedAt.toDate(), { addSuffix: true }) : 'just now'}
                                    </TableCell>
                                    <TableCell className="text-right py-4 pr-8">
                                        <div className="flex items-center justify-end gap-2">
                                            <ShareDialog shareDetails={{ type: 'vacancy', vacancyId: vacancy.id, vacancyTitle: vacancy.title, companyName: vacancy.companyName }}>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-slate-100 text-slate-400">
                                                    <Share2 className="h-4 w-4" />
                                                </Button>
                                            </ShareDialog>
                                            <ApplyDialog vacancy={vacancy}>
                                                <Button variant="outline" size="sm" className="h-9 rounded-xl font-bold border-slate-200 text-[#1a1c23] hover:bg-slate-50">
                                                    Apply
                                                </Button>
                                            </ApplyDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function VacanciesPage() {
    return (
        <div className="min-h-screen bg-[#f8f9fc] p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="pb-8">
                     <Button variant="outline" asChild className="rounded-xl border-slate-200 bg-white shadow-sm">
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
                </header>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <VacanciesList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
