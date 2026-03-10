'use client';

import { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, where, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, ChevronLeft, Briefcase, MapPin, Calendar, Search, Mail, Phone, Users, CheckCircle2, Crown, Sparkles, Building, Filter, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
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
    isImmediate: boolean;
    positionsAvailable: number;
    isCompanyVerified?: boolean;
    companyTier?: 'Standard' | 'Premier' | 'Super Premier';
    status: 'Pending' | 'Approved' | 'Rejected';
    postedAt: Timestamp;
};

function VacancyCard({ vacancy }: { vacancy: Vacancy }) {
    return (
        <Card className="group overflow-hidden border-none bg-[#24262d] rounded-[2rem] shadow-2xl transition-all hover:scale-[1.02] hover:shadow-orange-500/5">
            <CardHeader className="bg-white/5 border-b border-white/5 pb-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="h-5 px-2 rounded-md border-orange-500/30 bg-orange-500/5 text-orange-500 text-[10px] font-black uppercase tracking-[0.2em]">
                                {vacancy.employmentType}
                            </Badge>
                            {vacancy.isImmediate && (
                                <Badge className="h-5 px-2 rounded-md bg-green-500 text-white text-[10px] font-black uppercase tracking-[0.2em]">
                                    Immediate
                                </Badge>
                            )}
                        </div>
                        <CardTitle className="text-xl font-black text-orange-500 group-hover:text-orange-400 transition-colors uppercase italic tracking-tight">
                            {vacancy.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm font-bold text-white/70">
                            <Building className="h-4 w-4 text-orange-500" />
                            {vacancy.companyName}
                            <div className="flex gap-1 ml-1">
                                {vacancy.isCompanyVerified && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                                {vacancy.companyTier === 'Premier' && <Crown className="h-3.5 w-3.5 text-purple-500" />}
                                {vacancy.companyTier === 'Super Premier' && <Sparkles className="h-3.5 w-3.5 text-blue-500" />}
                            </div>
                        </div>
                    </div>
                    <ShareDialog shareDetails={{ type: 'vacancy', vacancyId: vacancy.id, vacancyTitle: vacancy.title, companyName: vacancy.companyName }}>
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10">
                            <ExternalLink className="h-5 w-5 text-muted-foreground" />
                        </Button>
                    </ShareDialog>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap gap-4 text-sm font-black uppercase tracking-widest text-muted-foreground">
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <MapPin className="h-4 w-4 text-orange-500" />
                        {vacancy.location}
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                        <Users className="h-4 w-4 text-orange-500" />
                        {vacancy.positionsAvailable} Spots
                    </div>
                </div>
                
                <p className="text-sm text-white/60 line-clamp-3 leading-relaxed font-medium">
                    {vacancy.description}
                </p>

                <div className="pt-2">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-orange-500/50 mb-2">Technical Skills</p>
                    <div className="flex flex-wrap gap-2">
                        {vacancy.skillsRequired.split(',').map((skill, i) => (
                            <Badge key={i} variant="secondary" className="bg-white/10 border-none text-white font-bold text-[10px] px-2.5 py-1 rounded-lg">
                                {skill.trim()}
                            </Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="bg-white/5 border-t border-white/5 p-6 flex items-center gap-3">
                <Button className="flex-1 h-16 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xl shadow-2xl shadow-orange-500/30 uppercase tracking-[0.2em] transition-all active:scale-95 group" asChild>
                    <a href={`mailto:${vacancy.companyEmail}?subject=Application: ${vacancy.title}`}>
                        APPLY NOW
                    </a>
                </Button>
                {vacancy.contactPhone && (
                    <Button variant="outline" className="h-16 w-16 px-0 border-white/10 bg-white/5 text-white font-black rounded-2xl hover:bg-white/10 shadow-lg flex items-center justify-center shrink-0" asChild>
                        <a href={`tel:${vacancy.contactPhone}`}>
                            <Phone className="h-6 w-6" />
                        </a>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

function VacanciesContent() {
    const firestore = useFirestore();
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'Full-time' | 'Contract' | 'Internship'>('all');

    const vacanciesQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'vacancies'),
            orderBy('postedAt', 'desc')
        );
    }, [firestore]);

    const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

    const filteredVacancies = useMemo(() => {
        if (!vacancies) return [];
        return vacancies.filter(v => {
            const matchesSearch = 
                v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.skillsRequired.toLowerCase().includes(searchQuery.toLowerCase());
            
            const matchesFilter = filter === 'all' || v.employmentType === filter;

            return matchesSearch && matchesFilter;
        });
    }, [vacancies, searchQuery, filter]);

    if (isLoading) {
        return (
            <div className="flex h-64 w-full flex-col items-center justify-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                <p className="text-white font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">Scanning Opportunities</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-orange-500 transition-colors" />
                    <Input
                        placeholder="Search by role, company, or skills..."
                        className="pl-12 h-14 bg-[#24262d] border-none rounded-2xl text-white text-lg placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-orange-500 shadow-2xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                    {['all', 'Full-time', 'Contract', 'Internship'].map((type) => (
                        <Button
                            key={type}
                            variant={filter === type ? 'default' : 'outline'}
                            onClick={() => setFilter(type as any)}
                            className={cn(
                                "rounded-xl h-14 px-6 font-black uppercase text-[10px] tracking-[0.2em] transition-all whitespace-nowrap",
                                filter === type 
                                    ? "bg-orange-500 hover:bg-orange-600 text-white shadow-xl shadow-orange-500/20 border-none scale-105" 
                                    : "border-white/5 bg-[#24262d] text-muted-foreground hover:bg-white/10 hover:text-white"
                            )}
                        >
                            {type}
                        </Button>
                    ))}
                </div>
            </div>

            {filteredVacancies.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {filteredVacancies.map(vacancy => (
                        <VacancyCard key={vacancy.id} vacancy={vacancy} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-32 bg-[#24262d] rounded-[3rem] border-4 border-dashed border-white/5 shadow-inner">
                    <div className="p-6 bg-orange-500/10 rounded-full w-fit mx-auto mb-6">
                        <Briefcase className="h-16 w-16 text-orange-500/20" />
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2 uppercase italic">No Openings Found</h2>
                    <p className="text-muted-foreground max-w-xs mx-auto font-medium">Try broadening your search or adjusting the filters to discover new roles.</p>
                </div>
            )}
        </div>
    );
}

export default function VacanciesPage() {
    return (
        <div className="min-h-screen bg-[#1a1c23] p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="pb-12 text-center">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <div className="bg-orange-500/10 p-4 rounded-2xl shadow-xl shadow-orange-500/5">
                            <Briefcase className="h-10 w-10 text-orange-500" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tighter uppercase italic">Job Board</h1>
                            <p className="text-orange-500/50 font-black uppercase tracking-[0.3em] text-[10px]">Direct Professional Connections</p>
                        </div>
                    </div>
                </header>
                <main>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
                        </div>
                    }>
                        <VacanciesContent />
                    </Suspense>
                </main>
            </div>
        </div>
    );
}
