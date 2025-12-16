
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Briefcase, ChevronLeft, MapPin, Building, Book } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export type Vacancy = {
    id: string;
    title: string;
    description: string;
    companyId: string;
    companyName: string;
    location: string;
    employmentType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship';
    skillsRequired: string;
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
        <div className="space-y-6">
            {vacancies.map(vacancy => (
                <Card key={vacancy.id} id={vacancy.id}>
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="text-xl">{vacancy.title}</CardTitle>
                                <CardDescription className="flex items-center gap-4 mt-1">
                                    <span className='flex items-center gap-1'><Building className="h-4 w-4" /> {vacancy.companyName}</span>
                                    <span className='flex items-center gap-1'><MapPin className="h-4 w-4" /> {vacancy.location}</span>
                                </CardDescription>
                            </div>
                            <Badge variant="secondary">{vacancy.employmentType}</Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm mb-4">{vacancy.description}</p>
                        
                        <div className="mb-4">
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2"><Book className="h-4 w-4" /> Required Skills</h4>
                            <div className="flex flex-wrap gap-2">
                                {vacancy.skillsRequired.split(',').map((skill, index) => (
                                    <Badge key={index} variant="outline">{skill.trim()}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between items-center text-xs text-muted-foreground">
                            <span>Posted {formatDistanceToNow(vacancy.postedAt.toDate(), { addSuffix: true })}</span>
                            <Button size="sm" asChild>
                                <Link href="#">Apply Now</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

export default function VacanciesPage() {
    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-3xl">
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
