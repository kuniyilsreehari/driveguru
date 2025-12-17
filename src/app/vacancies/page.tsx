
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Book, Calendar, Phone, Share2, UserCheck, Crown, Sparkles, AlertTriangle, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

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
    postedAt: Timestamp;
};

function VacanciesList() {
    const firestore = useFirestore();

    const vacanciesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc'));
    }, [firestore]);

    const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading vacancies...</p>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vacancies.map(vacancy => {
                const mailtoLink = `mailto:${vacancy.companyEmail}?subject=Application for ${encodeURIComponent(vacancy.title)}`;
                const callLink = `tel:${vacancy.contactPhone}`;

                return (
                    <Card key={vacancy.id} id={vacancy.id} className="flex flex-col">
                        <CardContent className="p-6 flex flex-col flex-grow">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {vacancy.isImmediate && (
                                        <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3" />Immediate</Badge>
                                    )}
                                    {vacancy.isCompanyVerified && (
                                        <Badge variant="outline" className="border-green-500 text-green-500"><UserCheck className="mr-1 h-3 w-3" />Verified</Badge>
                                    )}
                                    {vacancy.companyTier === 'Premier' && (
                                        <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" />Premier</Badge>
                                    )}
                                    {vacancy.companyTier === 'Super Premier' && (
                                        <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" />Super Premier</Badge>
                                    )}
                                </div>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Share2 className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <h3 className="text-2xl font-bold">{vacancy.title}</h3>

                            <div className="space-y-3 text-muted-foreground mt-4 text-sm flex-grow">
                                <div className="flex items-center gap-3"><Building className="h-4 w-4" /> <span>{vacancy.companyName}</span></div>
                                <div className="flex items-center gap-3"><Calendar className="h-4 w-4" /> <span>Posted: {vacancy.postedAt ? format(vacancy.postedAt.toDate(), 'PPp') : 'just now'}</span></div>
                                <div className="flex items-center gap-3"><MapPin className="h-4 w-4" /> <span>{vacancy.location}</span></div>
                                <div className="flex items-center gap-3"><Briefcase className="h-4 w-4" /> <Badge variant="secondary">{vacancy.employmentType}</Badge></div>
                                <div className="flex items-center gap-3"><Users className="h-4 w-4" /> <span>Positions Available: {vacancy.positionsAvailable}</span></div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <Button size="sm" asChild className="flex-1 bg-orange-500 hover:bg-orange-600">
                                    <a href={mailtoLink}>Apply Now</a>
                                </Button>
                                {vacancy.contactPhone && (
                                    <Button size="sm" asChild variant="outline" className="flex-1">
                                        <a href={callLink}><Phone className="mr-2 h-4 w-4"/> Call</a>
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
    );
}

export default function VacanciesPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="pb-8 text-center">
                     <div className="flex items-center justify-center gap-3 mb-4">
                        <Briefcase className="h-10 w-10 text-primary" />
                        <h1 className="text-4xl sm:text-5xl font-bold">Job Vacancies</h1>
                    </div>
                    <p className="text-muted-foreground">Find your next career opportunity with our trusted companies.</p>
                </header>
                <main>
                     <Button variant="outline" asChild className="mb-6">
                        <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                    </Button>
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
