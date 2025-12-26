
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { collection, query, where, doc, Timestamp } from 'firebase/firestore';
import { Loader, User, LogOut, Eye, UserX, UserCheck, Phone, Briefcase, Calendar, GraduationCap, School, Book, Info, MapPin } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';


type ExpertUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    photoUrl?: string;
    phoneNumber?: string;
    city?: string;
    state?: string;
    pincode?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    experienceYears?: number;
    experienceMonths?: number;
    createdAt?: Timestamp;
};

const ExpertProfileView = ({ expert }: { expert: ExpertUser }) => {
    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    };

    const locationString = [expert.city, expert.state, expert.pincode].filter(Boolean).join(', ');
    const experienceString = [
      expert.experienceYears ? `${expert.experienceYears} years` : null,
      expert.experienceMonths ? `${expert.experienceMonths} months` : null,
    ].filter(Boolean).join(' ') || 'Not specified';


    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Avatar className="h-24 w-24 text-3xl">
                    <AvatarImage src={expert.photoUrl} alt={`${expert.firstName} ${expert.lastName}`} />
                    <AvatarFallback>{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                </Avatar>
                <div className="text-center sm:text-left">
                    <h3 className="text-2xl font-bold">{expert.firstName} {expert.lastName}</h3>
                    <p className="text-muted-foreground">{expert.email}</p>
                    <p className="text-muted-foreground">{expert.phoneNumber}</p>
                </div>
            </div>
            <Separator />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /> <strong>Role:</strong> <Badge variant="secondary">{expert.role}</Badge></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /> <strong>Location:</strong> {locationString || 'N/A'}</div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> <strong>Experience:</strong> {experienceString}</div>
                <div className="flex items-center gap-2"><GraduationCap className="h-4 w-4 text-muted-foreground" /> <strong>Qualification:</strong> {expert.qualification || 'N/A'}</div>
                <div className="flex items-center gap-2"><School className="h-4 w-4 text-muted-foreground" /> <strong>College:</strong> {expert.collegeName || 'N/A'}</div>
            </div>
            <Separator />
             <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2"><Info className="h-5 w-5" /> About</h4>
                <p className="text-muted-foreground text-sm pl-7">{expert.aboutMe || 'No information provided.'}</p>
            </div>
            <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2"><Book className="h-5 w-5" /> Skills</h4>
                <div className="flex flex-wrap gap-2 pl-7">
                    {expert.skills ? expert.skills.split(',').map((skill, index) => (
                        <Badge key={index} variant="secondary">{skill.trim()}</Badge>
                    )) : <p className="text-sm text-muted-foreground">No skills specified.</p>}
                </div>
            </div>
        </div>
    )
}

function UnverifiedExpertsList({ onVerify, onViewProfile }: { onVerify: (expert: ExpertUser) => void, onViewProfile: (expert: ExpertUser) => void }) {
    const firestore = useFirestore();

    const unverifiedUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('verified', '==', false));
    }, [firestore]);

    const { data: users, isLoading } = useCollection<ExpertUser>(unverifiedUsersQuery);

    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading unverified experts...</p>
            </div>
        );
    }
    
    if (!users || users.length === 0) {
        return (
             <div className="text-center p-8 border-2 border-dashed rounded-lg">
                <p className="text-muted-foreground">No unverified experts found at this time.</p>
            </div>
        )
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[80px]">Avatar</TableHead>
                    <TableHead>Contact Info</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((expert) => (
                    <TableRow key={expert.id}>
                        <TableCell>
                            <Avatar>
                                <AvatarImage src={expert.photoUrl} alt={`${expert.firstName} ${expert.lastName}`} />
                                <AvatarFallback>{getInitials(expert.firstName, expert.lastName)}</AvatarFallback>
                            </Avatar>
                        </TableCell>
                        <TableCell>
                            <div className="font-medium">{expert.firstName} {expert.lastName}</div>
                            <div className="text-xs text-muted-foreground">{expert.email}</div>
                            {expert.phoneNumber && (
                                <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                                    <span>{expert.phoneNumber}</span>
                                    <Button asChild variant="outline" size="sm" className="h-6 px-2">
                                        <a href={`tel:${expert.phoneNumber}`}><Phone className="mr-1 h-3 w-3"/>Call</a>
                                    </Button>
                                </div>
                            )}
                        </TableCell>
                         <TableCell>
                            <Badge variant="secondary">{expert.role}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {expert.createdAt ? formatDistanceToNow(expert.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                           <Button variant="outline" size="sm" onClick={() => onViewProfile(expert)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Profile
                           </Button>
                           <Button variant="outline" size="sm" onClick={() => onVerify(expert)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Verify
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    )
}

export default function ManagerDashboardPage() {
    const { user, isUserLoading } = useUser();
    const router = useRouter();
    const auth = useAuth();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [selectedExpert, setSelectedExpert] = useState<ExpertUser | null>(null);
    const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);

    useEffect(() => {
        if (!isUserLoading && !user) {
            router.push('/login');
        }
    }, [user, isUserLoading, router]);

    const handleLogout = () => {
        if (auth) {
            signOut(auth);
        }
    };
    
    const handleVerifyUser = (expert: ExpertUser) => {
        if (!firestore) return;
        const userDocRef = doc(firestore, 'users', expert.id);
        updateDocumentNonBlocking(userDocRef, { verified: true });
        toast({
            title: "Expert Verified",
            description: `${expert.firstName} ${expert.lastName} is now verified.`,
        });
    };

    const handleViewProfile = (expert: ExpertUser) => {
        setSelectedExpert(expert);
        setIsProfileDialogOpen(true);
    }

    if (isUserLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <Loader className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading Manager Dashboard...</p>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-background p-4 sm:p-8">
                <div className="mx-auto max-w-4xl">
                    <header className="flex items-center justify-between pb-8">
                        <div className="flex items-center gap-4">
                            <User className="h-10 w-10 text-primary" />
                            <div>
                                <h1 className="text-4xl font-bold">Manager Dashboard</h1>
                                <p className="text-muted-foreground">Welcome, {user?.displayName || 'Manager'}.</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log Out
                        </Button>
                    </header>
                    <main>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <UserX className="h-6 w-6"/>
                                    <div>
                                        <CardTitle>Unverified Experts</CardTitle>
                                        <CardDescription>
                                            Review the profiles of experts who are pending verification.
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                            <UnverifiedExpertsList onVerify={handleVerifyUser} onViewProfile={handleViewProfile} />
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>

            <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>Expert Profile</DialogTitle>
                        <DialogDescription>
                            Review the details of the unverified expert.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedExpert && <ExpertProfileView expert={selectedExpert} />}
                </DialogContent>
            </Dialog>
        </>
    );
}
