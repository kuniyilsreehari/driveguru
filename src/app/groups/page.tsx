

'use client';

import { Suspense, useState, useMemo } from 'react';
import Link from 'next/link';
import { collection, query, orderBy, serverTimestamp, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, addDocumentNonBlocking, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, ChevronLeft, Users, PlusCircle, ArrowRight, Search, Hash, UserPlus, UserMinus, LogIn, Lock, Globe } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export type Group = {
    id: string;
    name: string;
    description: string;
    creatorId: string;
    privacy: 'public' | 'private';
    members: string[];
    pendingMembers?: string[];
    createdAt: any;
};

type UserProfile = {
    id: string;
    groups?: string[];
}

const createGroupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.').max(50, 'Group name cannot exceed 50 characters.'),
  description: z.string().min(10, 'Description must be at least 10 characters.').max(250, 'Description cannot exceed 250 characters.'),
  privacy: z.enum(['public', 'private'], { required_error: 'You must select a privacy setting.' }),
});


function CreateGroupDialog({ onGroupCreated }: { onGroupCreated: () => void }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isOpen, setIsOpen] = useState(false);

    const form = useForm<z.infer<typeof createGroupSchema>>({
        resolver: zodResolver(createGroupSchema),
        defaultValues: {
            name: '',
            description: '',
            privacy: 'public',
        },
    });

    const onSubmit = async (values: z.infer<typeof createGroupSchema>) => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in to create a group.' });
            return;
        }

        const newGroupData = {
            name: values.name,
            description: values.description,
            privacy: values.privacy,
            creatorId: user.uid,
            members: [user.uid],
            pendingMembers: [],
            createdAt: serverTimestamp(),
        };

        try {
            const groupRef = await addDocumentNonBlocking(collection(firestore, 'groups'), newGroupData);

            if (groupRef) {
                const userDocRef = doc(firestore, 'users', user.uid);
                await updateDoc(userDocRef, {
                    groups: arrayUnion(groupRef.id)
                });
            }

            toast({
                title: 'Group Created!',
                description: `Your group "${values.name}" is now live.`,
            });
            form.reset();
            setIsOpen(false);
            onGroupCreated();
        } catch (error) {
            console.error('Error creating group:', error);
            if ((error as any).name !== 'FirebaseError') {
                 toast({ variant: 'destructive', title: 'Error', description: 'Could not create the group. Please try again.' });
            }
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Group
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create a New Professional Group</DialogTitle>
                    <DialogDescription>Start a community around a profession, skill, or interest.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., React Developers India" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Group Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="What is this group about?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="privacy"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Privacy Settings</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="public" />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center gap-2">
                                            <Globe className="h-4 w-4" /> Public (Anyone can join)
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="private" />
                                        </FormControl>
                                        <FormLabel className="font-normal flex items-center gap-2">
                                            <Lock className="h-4 w-4" /> Private (Owner must approve requests)
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                                ) : 'Create Group'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


function GroupsList() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState<string | null>(null);

    const userDocRef = useMemoFirebase(() => {
        if (!user) return null;
        return doc(firestore, 'users', user.uid);
    }, [user, firestore]);
    const { data: userProfile } = useDoc<UserProfile>(userDocRef);

    const groupsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'groups'), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: allGroups, isLoading, error } = useCollection<Group>(groupsQuery);
    
    const filteredGroups = allGroups?.filter(group => 
        group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleToggleMembership = async (group: Group) => {
        if (!user || !firestore) {
            toast({ variant: 'destructive', title: 'You must be logged in.' });
            return;
        }

        setIsSubmitting(group.id);
        const groupDocRef = doc(firestore, 'groups', group.id);
        const userDocRef = doc(firestore, 'users', user.uid);
        const isMember = userProfile?.groups?.includes(group.id);
        
        try {
            if (group.privacy === 'public') {
                const groupUpdateAction = isMember ? arrayRemove(user.uid) : arrayUnion(user.uid);
                const userUpdateAction = isMember ? arrayRemove(group.id) : arrayUnion(group.id);
                
                await Promise.all([
                    updateDocumentNonBlocking(groupDocRef, { members: groupUpdateAction }),
                    updateDocumentNonBlocking(userDocRef, { groups: userUpdateAction })
                ]);

                 toast({
                    title: isMember ? 'Left Group' : 'Joined Group',
                    description: `You are now ${isMember ? 'no longer a member of' : 'a member of'} ${group.name}.`,
                });
            } else { // Private group
                 if (isMember) { // Leaving
                    const groupUpdateAction = arrayRemove(user.uid);
                    const userUpdateAction = arrayRemove(group.id);
                     await Promise.all([
                        updateDocumentNonBlocking(groupDocRef, { members: groupUpdateAction }),
                        updateDocumentNonBlocking(userDocRef, { groups: userUpdateAction })
                    ]);
                    toast({ title: 'Left Group' });
                } else { // Request to join
                    toast({ title: 'Coming Soon', description: 'The ability to request to join private groups is under development.' });
                }
            }
        } catch (error) {
            if ((error as any).name !== 'FirebaseError') {
                toast({ variant: 'destructive', title: 'Error', description: 'Could not update your membership.' });
            }
        } finally {
            setIsSubmitting(null);
            // No need to manually mutate, useCollection handles real-time updates.
            // mutateGroups(); 
            // mutateUserProfile(); // This will trigger a re-render automatically.
        }
    };

    if (isLoading || isUserLoading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading groups...</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="text-center py-16 text-destructive">
                <h2 className="text-2xl font-semibold">Error Loading Groups</h2>
                <p className="text-sm mt-2">{error.message}</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search for groups..."
                    className="pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredGroups && filteredGroups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGroups.map(group => {
                        const isMember = userProfile?.groups?.includes(group.id);
                        const isCreator = user?.uid === group.creatorId;

                        const getButtonContent = () => {
                            if (isSubmitting === group.id) return <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Processing</>;
                            if (isMember) return <><UserMinus className="mr-2 h-4 w-4"/> Leave</>;
                            if (group.privacy === 'private') return <><UserPlus className="mr-2 h-4 w-4"/> Request to Join</>;
                            return <><UserPlus className="mr-2 h-4 w-4"/> Join</>;
                        };

                        return (
                            <Card key={group.id} className="flex flex-col hover:shadow-lg transition-shadow">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        {group.privacy === 'private' ? <Lock className="h-5 w-5 text-muted-foreground"/> : <Globe className="h-5 w-5 text-muted-foreground"/>}
                                        <CardTitle className="flex items-center gap-2">
                                            <Hash className="h-5 w-5 text-primary"/>
                                            {group.name}
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="line-clamp-2 h-[40px]">{group.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="flex-grow">
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Users className="h-4 w-4" />
                                        <span>{group.members.length} {group.members.length === 1 ? 'member' : 'members'}</span>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row gap-2">
                                    <Button asChild className="w-full" variant="outline">
                                        <Link href={`/groups/${group.id}`}>
                                            View Group <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                    {user && !isCreator && (
                                        <Button 
                                            className="w-full" 
                                            variant={isMember ? 'secondary' : 'default'}
                                            onClick={() => handleToggleMembership(group)}
                                            disabled={isSubmitting === group.id}
                                        >
                                           {getButtonContent()}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-16">
                    <h2 className="text-2xl font-semibold">No Groups Found</h2>
                    <p className="text-muted-foreground mt-2">
                        {allGroups && allGroups.length > 0 
                            ? "No groups match your search. Try a different query." 
                            : "Be the first to create a group and start a community!"}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function GroupsPage() {
    const { user } = useUser();
    const [_, setRender] = useState(0);


    return (
        <div className="min-h-screen bg-background p-4 sm:p-8">
            <div className="mx-auto max-w-6xl">
                <header className="pb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Users className="h-10 w-10 text-primary" />
                                <h1 className="text-4xl sm:text-5xl font-bold">Professional Groups</h1>
                            </div>
                            <p className="text-muted-foreground">Connect, share, and grow with experts in your field.</p>
                        </div>
                        {user ? (
                           <CreateGroupDialog onGroupCreated={() => setRender(r => r + 1)} />
                        ) : (
                            <Button asChild>
                                <Link href="/login">
                                    <LogIn className="mr-2 h-4 w-4" /> Login to Create a Group
                                </Link>
                            </Button>
                        )}
                    </div>
                </header>
                <main>
                    <div className="mb-6">
                        <Button variant="outline" asChild>
                            <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Home</Link>
                        </Button>
                    </div>
                    <Suspense fallback={
                        <div className="flex h-64 w-full items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    }>
                        <GroupsList />
                    </Suspense>
                </main>
            </div>
        </div>
    )
}
