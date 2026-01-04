
'use client';

import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, collection, query, where, getDoc, runTransaction, increment, getDocs, orderBy, Timestamp, limit, arrayUnion, arrayRemove, serverTimestamp, addDoc, onSnapshot, QueryDocumentSnapshot } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Briefcase, Loader, Edit, UserCheck, XCircle, MapPin, IndianRupee, Calendar, Book, GraduationCap, School, Info, User as UserIcon, Check, Power, Building, PlusCircle, Crown, Sparkles, Lock, Home, ArrowUpCircle, ShieldCheck, ExternalLink, Gift, Copy, Shield, AlertTriangle, ChevronDown, Link as LinkIcon, MessageCircle, BookOpen, CheckCircle, PenSquare, Factory, Users, Type, UserPlus, UserMinus, Terminal, ArrowLeft, ArrowRight, Send, Search, Rss } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertDialogTrigger } from '@radix-ui/react-alert-dialog';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { Vacancy } from '@/app/vacancies/page';
import Link from 'next/link';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { createPaymentOrder } from '@/ai/flows/payment-flow';
import { processReferral } from '@/ai/flows/process-referral-flow';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PostForm } from '@/components/post-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { formatDistanceToNowStrict } from 'date-fns';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    photoUrl?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    verified?: boolean;
    pricingModel?: string;
    pricingValue?: number;
    experienceYears?: number;
    experienceMonths?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    aboutYourDream?: string;
    associatedProjectsName?: string;
    phoneNumber?: string;
    companyName?: string;
    businessDescription?: string;
    profession?: string;
    department?: string;
    isAvailable?: boolean;
    companyId?: string;
    referralCode?: string;
    referralPoints?: number;
    referredByCode?: string | null;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    following?: string[];
    groups?: string[];
};

type PlanPrices = {
    daily?: number;
    monthly?: number;
    yearly?: number;
};

type AppConfig = {
    premierPlanPrices?: PlanPrices;
    superPremierPlanPrices?: PlanPrices;
    verificationFee?: number;
    referralRewardPoints?: number;
    verificationPaymentLink?: string;
    premierPaymentLink?: string;
    superPremierPaymentLink?: string;
    pricingModels?: string[];
};

type Chat = {
    id: string;
    participantIds: string[];
    lastMessage?: string;
    lastMessageSenderId?: string;
    lastUpdatedAt: Timestamp;
};

type ChatMessage = {
    id: string;
    senderId: string;
    content: string;
    createdAt: Timestamp;
}

function getInitials(firstName?: string, lastName?: string) {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase() || 'U';
}

function PeopleToFollow({ currentUserProfile }: { currentUserProfile: ExpertUserProfile }) {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    const suggestionsQuery = useMemoFirebase(() => {
        if (!firestore || !currentUserProfile) return null;
        
        const q = query(
            collection(firestore, 'users'),
            where('id', '!=', currentUserProfile.id),
            limit(20)
        );

        return q;
    }, [firestore, currentUserProfile]);
    
    const { data: suggestedUsers, isLoading } = useCollection<ExpertUserProfile>(suggestionsQuery);

    const filteredSuggestions = useMemo(() => {
        if (!suggestedUsers) return [];
        if (!searchQuery) return suggestedUsers;

        const lowercasedQuery = searchQuery.toLowerCase();
        return suggestedUsers.filter(user => 
            `${user.firstName} ${user.lastName}`.toLowerCase().includes(lowercasedQuery) ||
            user.profession?.toLowerCase().includes(lowercasedQuery)
        );
    }, [suggestedUsers, searchQuery]);

    const handleToggleFollow = async (targetUser: ExpertUserProfile) => {
        if (!firestore || !currentUserProfile) return;

        const currentUserDocRef = doc(firestore, 'users', currentUserProfile.id);
        const isFollowing = currentUserProfile.following?.includes(targetUser.id);
        const updateAction = isFollowing ? arrayRemove(targetUser.id) : arrayUnion(targetUser.id);

        try {
            await updateDocumentNonBlocking(currentUserDocRef, { following: updateAction });
            toast({
                title: isFollowing ? 'Unfollowed' : 'Followed',
                description: `You are now ${isFollowing ? 'no longer following' : 'following'} ${targetUser.firstName} ${targetUser.lastName}.`,
            });
        } catch (error) {
            console.error("Failed to toggle follow", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not update your follow status.' });
        }
    };
    
    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>People You May Know</CardTitle>
                </CardHeader>
                <CardContent>
                    <Loader className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }
    
    if (!suggestedUsers || suggestedUsers.length === 0) {
        return null; // Don't render the card if there are no suggestions
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>People You May Know</CardTitle>
                <CardDescription>Expand your network by following other experts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                          placeholder="Search suggestions..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                      />
                  </div>
                </div>

                <Carousel
                    opts={{
                        align: "start",
                    }}
                    className="w-full"
                >
                    <CarouselContent>
                        {filteredSuggestions.map((user) => {
                             const isFollowing = currentUserProfile.following?.includes(user.id);
                            return (
                                <CarouselItem key={user.id} className="md:basis-1/2 lg:basis-1/3">
                                    <div className="p-1">
                                        <Card className="h-full">
                                            <CardContent className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                                                <Link href={`/expert/${user.id}`}>
                                                    <Avatar className="h-16 w-16 text-xl">
                                                        <AvatarImage src={user.photoUrl} />
                                                        <AvatarFallback>{getInitials(user.firstName, user.lastName)}</AvatarFallback>
                                                    </Avatar>
                                                </Link>
                                                <div className="flex-grow">
                                                    <h4 className="font-semibold">{user.firstName} {user.lastName}</h4>
                                                    <p className="text-xs text-muted-foreground">{user.profession || user.role}</p>
                                                </div>
                                                <Button
                                                    variant={isFollowing ? 'secondary' : 'default'}
                                                    className="w-full"
                                                    onClick={() => handleToggleFollow(user)}
                                                >
                                                    {isFollowing ? <UserMinus className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                                    {isFollowing ? 'Unfollow' : 'Follow'}
                                                </Button>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </CarouselItem>
                            )
                        })}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </CardContent>
        </Card>
    );
}

function CompanyVacancies({ userProfile }: { userProfile: ExpertUserProfile }) {
  const firestore = useFirestore();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const isPremium = userProfile.tier === 'Premier' || userProfile.tier === 'Super Premier';
  const canPostVacancy = isPremium && (userProfile.role === 'Company' || !!userProfile.companyId);

  const vacanciesQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile.companyId) return null;
    return query(collection(firestore, 'vacancies'), where('companyId', '==', userProfile.companyId));
  }, [firestore, userProfile.companyId]);

  const { data: vacancies, isLoading } = useCollection<Vacancy>(vacanciesQuery);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Manage Vacancies</CardTitle>
            <CardDescription>Post and view job openings for your company.</CardDescription>
          </div>
           {canPostVacancy ? (
              <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Post New Vacancy
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px]">
                  <DialogHeader>
                    <DialogTitle>Create a New Vacancy</DialogTitle>
                    <DialogDescription>Fill out the details below to post a new job opening.</DialogDescription>
                  </DialogHeader>
                  <PostVacancyForm
                    companyId={userProfile.companyId!}
                    companyName={userProfile.companyName!}
                    companyEmail={userProfile.email!}
                    onSuccess={() => setIsPostDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
           ) : (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button disabled className="w-full sm:w-auto">
                                <Lock className="mr-2 h-4 w-4" />
                                Post New Vacancy
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>This is a Premium feature. Upgrade to post vacancies.</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
           )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader className="h-6 w-6 animate-spin" />
          </div>
        ) : vacancies && vacancies.length > 0 ? (
          <div className="space-y-4">
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className="p-4 border rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-semibold">{vacancy.title}</h4>
                  <p className="text-sm text-muted-foreground">{vacancy.location} &middot; {vacancy.employmentType}</p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/vacancies#${vacancy.id}`}>View</Link>
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8 border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground">You haven&apos;t posted any vacancies yet.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlanManagement({ userProfile, appConfig }: { userProfile: ExpertUserProfile; appConfig: AppConfig | null }) {
    const PlanCard = ({ title, icon, description, features, children, current, link }: { title: string; icon: React.ReactNode; description: string; features: string[]; children?: React.ReactNode, current?: boolean, link?: string }) => (
        <Card className={cn("flex flex-col", current && "border-primary ring-2 ring-primary")}>
            <CardHeader className="text-center">
                <div className={cn("mx-auto w-fit rounded-full p-3 mb-2", current ? "bg-primary/10" : "bg-secondary")}>
                    {icon}
                </div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                <ul className="space-y-2">
                    {features.map((feature, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <Check className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                            <span>{feature}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex-col !pt-4 gap-2">
                {current ? (
                    <Button variant="outline" disabled className="w-full"><ShieldCheck className="mr-2 h-4 w-4" /> Current Plan</Button>
                ) : link ? (
                     <Button asChild className="w-full mt-auto">
                        <Link href={link}>
                            <ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade to {title}
                        </Link>
                    </Button>
                ) : (
                    children
                )}
            </CardFooter>
        </Card>
    );

    return (
        <Card id="plan-management">
            <CardHeader>
                <CardTitle>Manage Your Plan</CardTitle>
                <CardDescription>Upgrade your plan to unlock powerful new features and increase your visibility.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <PlanCard
                        title="Standard"
                        icon={<UserIcon className="h-6 w-6" />}
                        description="Your current free plan."
                        features={["Public profile listing", "Appear in search results", "Earn referral points"]}
                        current={userProfile.tier === 'Standard' || !userProfile.tier}
                     />
                     <PlanCard
                        title="Premier"
                        icon={<Crown className="h-6 w-6" />}
                        description="Enhanced visibility and features."
                        features={["Higher search ranking", "Post job vacancies", "AI-powered bio & skill suggestions"]}
                        current={userProfile.tier === 'Premier'}
                        link={appConfig?.premierPaymentLink || '/payment/premier'}
                     />
                     <PlanCard
                        title="Super Premier"
                        icon={<Sparkles className="h-6 w-6" />}
                        description="Maximum visibility and tools."
                        features={["All Premier features", "Top placement in search results", "AI-powered search access"]}
                        current={userProfile.tier === 'Super Premier'}
                        link={appConfig?.superPremierPaymentLink || '/payment/super-premier'}
                     >
                    </PlanCard>
                </div>
            </CardContent>
        </Card>
    )
}

function FollowerStats({ userId }: { userId: string }) {
    const firestore = useFirestore();

    const followersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), where('following', 'array-contains', userId));
    }, [firestore, userId]);

    const { data: followers, isLoading: isLoadingFollowers } = useCollection(followersQuery);
    
    const userProfileDocRef = useMemoFirebase(() => {
        if (!firestore) return null;
        return doc(firestore, 'users', userId);
    }, [firestore, userId]);

    const { data: userProfile } = useDoc<ExpertUserProfile>(userProfileDocRef);

    if (isLoadingFollowers || !userProfile) {
        return <p className="text-sm text-muted-foreground">Loading stats...</p>;
    }
    
    const followingCount = userProfile.following?.length || 0;

    return (
        <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm"><span className="font-bold text-foreground">{followers?.length || 0}</span> Followers</p>
            </div>
            <div className="flex items-center gap-1">
                <p className="text-sm"><span className="font-bold text-foreground">{followingCount}</span> Following</p>
            </div>
        </div>
    );
}

type ProfilePrompt = {
    field: keyof ExpertUserProfile;
    label: string;
    question: string;
    type: 'select' | 'text' | 'number-group';
    options?: { value: string; label: string }[];
    subFields?: { name: keyof ExpertUserProfile; label: string }[];
}

const ProfilePromptDialog = ({ prompt, isOpen, onOpenChange, userProfile, appConfig, onNext, onPrevious, hasNext, hasPrevious }: { prompt: ProfilePrompt | null, isOpen: boolean, onOpenChange: (open: boolean) => void, userProfile: ExpertUserProfile, appConfig: AppConfig | null, onNext: (currentField: keyof ExpertUserProfile, value: any, subValue?: any) => void, onPrevious: () => void, hasNext: boolean, hasPrevious: boolean }) => {
    const [value, setValue] = useState<any>('');
    const [subValue, setSubValue] = useState<any>(undefined);
    const { toast } = useToast();

    useEffect(() => {
        if (prompt) {
            setValue(userProfile[prompt.field] || '');
            if (prompt.type === 'number-group' && prompt.subFields) {
                setSubValue(userProfile[prompt.subFields[0].name] || undefined);
            }
        } else {
            setValue('');
            setSubValue(undefined);
        }
    }, [prompt, userProfile]);

    const handleSaveAndNext = async () => {
        if (!prompt) return;
        onNext(prompt.field, value, subValue);
    };

    if (!prompt) return null;

    const renderInput = () => {
        switch (prompt.type) {
            case 'select':
                return (
                    <Select onValueChange={setValue} value={value}>
                        <SelectTrigger><SelectValue placeholder={`Select your ${prompt.label.toLowerCase()}`} /></SelectTrigger>
                        <SelectContent>
                            {prompt.options?.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                        </SelectContent>
                    </Select>
                );
            case 'number-group':
                return (
                    <div className="flex items-center gap-2">
                         <Select onValueChange={setValue} value={String(value || '')}>
                            <SelectTrigger><SelectValue placeholder={prompt.label} /></SelectTrigger>
                            <SelectContent>
                                {[...Array(51).keys()].map(i => <SelectItem key={i} value={String(i)}>{i} {prompt.label}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        {prompt.subFields && (
                            <Select onValueChange={(val) => setSubValue(val)} value={String(subValue || '')}>
                                <SelectTrigger><SelectValue placeholder={prompt.subFields[0].label} /></SelectTrigger>
                                <SelectContent>
                                    {[...Array(12).keys()].map(i => <SelectItem key={i} value={String(i)}>{i} {prompt.subFields![0].label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                );
            case 'text':
            default:
                return <Input value={value} onChange={e => setValue(e.target.value)} placeholder={`Enter your ${prompt.label.toLowerCase()}`} />;
        }
    };
    

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Complete Your Profile</DialogTitle>
                    <DialogDescription>{prompt.question}</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor={prompt.field}>{prompt.label}</Label>
                    {renderInput()}
                </div>
                <DialogFooter className="justify-between">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={onPrevious} disabled={!hasPrevious}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>
                        <Button onClick={handleSaveAndNext}>
                             {hasNext ? 'Save & Next' : 'Save & Finish'} <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const postFormSchema = z.object({
  content: z.string().min(2, 'Post must be at least 2 characters.').max(500, 'Post cannot exceed 500 characters.'),
});

function MessagingSection({ currentUser }: { currentUser: ExpertUserProfile }) {
    const firestore = useFirestore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [chatPartner, setChatPartner] = useState<ExpertUserProfile | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const messageEndRef = useRef<HTMLDivElement>(null);

    const chatsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'chats'),
            where('participantIds', 'array-contains', currentUser.id),
            orderBy('lastUpdatedAt', 'desc')
        );
    }, [firestore, currentUser.id]);

    const { data: chats, isLoading: isLoadingChats } = useCollection<Chat>(chatsQuery);

    const chatPartnersQuery = useMemoFirebase(() => {
        if (!firestore || !chats || chats.length === 0) return null;
        const partnerIds = chats.map(c => c.participantIds.find(id => id !== currentUser.id)).filter(Boolean);
        if (partnerIds.length === 0) return null;
        return query(collection(firestore, 'users'), where('id', 'in', partnerIds));
    }, [firestore, chats, currentUser.id]);

    const { data: chatPartners, isLoading: isLoadingPartners } = useCollection<ExpertUserProfile>(chatPartnersQuery);
    
    useEffect(() => {
        const chatParam = searchParams.get('chat');
        if (chatParam && chats && chatPartners) {
            const partner = chatPartners.find(p => p.id === chatParam);
            if (partner) {
                const chat = chats.find(c => c.participantIds.includes(chatParam));
                if (chat) {
                    setSelectedChatId(chat.id);
                    setChatPartner(partner);
                }
            }
        }
    }, [searchParams, chats, chatPartners]);


    useEffect(() => {
        if (selectedChatId && firestore) {
            const messagesQuery = query(
                collection(firestore, 'chats', selectedChatId, 'messages'),
                orderBy('createdAt', 'asc')
            );
            const unsubscribe = onSnapshot(messagesQuery, (querySnapshot) => {
                const newMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
                setMessages(newMessages);
            });
            return () => unsubscribe();
        }
    }, [selectedChatId, firestore]);
    
    useEffect(() => {
        messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChatId || !firestore) return;
        setIsSending(true);

        const chatRef = doc(firestore, 'chats', selectedChatId);
        const messagesColRef = collection(chatRef, 'messages');

        try {
            await addDoc(messagesColRef, {
                senderId: currentUser.id,
                content: newMessage,
                createdAt: serverTimestamp()
            });
            await updateDocumentNonBlocking(chatRef, {
                lastMessage: newMessage,
                lastMessageSenderId: currentUser.id,
                lastUpdatedAt: serverTimestamp()
            });
            setNewMessage('');
        } catch (error) {
            console.error("Failed to send message", error);
        } finally {
            setIsSending(false);
        }
    };
    
     const handleSelectChat = (chat: Chat) => {
        const partnerId = chat.participantIds.find(id => id !== currentUser.id);
        const partner = chatPartners?.find(p => p.id === partnerId);
        if (partner) {
            setSelectedChatId(chat.id);
            setChatPartner(partner);
        }
    };


    return (
        <Card className="h-[70vh]">
            <CardContent className="p-0 grid grid-cols-1 md:grid-cols-3 h-full">
                <div className="col-span-1 border-r flex flex-col">
                    <div className="p-4 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search messages..." className="pl-10" />
                        </div>
                    </div>
                    {isLoadingChats || isLoadingPartners ? (
                        <div className="p-4 flex items-center justify-center flex-grow"><Loader className="h-5 w-5 animate-spin" /></div>
                    ) : chats && chats.length > 0 && chatPartners ? (
                         <div className="flex-grow overflow-y-auto">
                            {chats.map(chat => {
                                const partner = chatPartners.find(p => chat.participantIds.includes(p.id) && p.id !== currentUser.id);
                                if (!partner) return null;

                                return (
                                    <div key={chat.id} onClick={() => handleSelectChat(chat)}
                                        className={cn("p-4 flex items-center gap-3 cursor-pointer hover:bg-accent", selectedChatId === chat.id && "bg-accent")}>
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={partner.photoUrl} />
                                            <AvatarFallback>{getInitials(partner.firstName, partner.lastName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-grow overflow-hidden">
                                            <p className="font-semibold truncate">{partner.firstName} {partner.lastName}</p>
                                            <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                                        </div>
                                         <p className="text-xs text-muted-foreground self-start shrink-0">
                                            {chat.lastUpdatedAt ? formatDistanceToNowStrict(chat.lastUpdatedAt.toDate()) : ''}
                                        </p>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                         <div className="p-4 flex flex-col items-center justify-center text-center flex-grow">
                             <Image src="/no_messages.svg" width={150} height={120} alt="No messages illustration" className="mb-4" />
                            <h4 className="font-semibold text-lg">No messages yet</h4>
                            <p className="text-muted-foreground text-sm">Reach out and start a conversation.</p>
                             <Button size="sm" className="mt-4" onClick={() => router.push('/')}>
                                Send a message
                            </Button>
                        </div>
                    )}
                </div>

                <div className="col-span-2 hidden md:flex flex-col h-full">
                    {selectedChatId && chatPartner ? (
                        <>
                            <div className="p-4 border-b flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                    <AvatarImage src={chatPartner.photoUrl} />
                                    <AvatarFallback>{getInitials(chatPartner.firstName, chatPartner.lastName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-semibold">{chatPartner.firstName} {chatPartner.lastName}</p>
                                    <p className="text-xs text-muted-foreground">{chatPartner.profession || chatPartner.role}</p>
                                </div>
                            </div>
                            <div className="flex-grow p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 space-y-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={cn("flex items-end gap-2", msg.senderId === currentUser.id ? "justify-end" : "justify-start")}>
                                         {msg.senderId !== currentUser.id && (
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={chatPartner.photoUrl} />
                                                <AvatarFallback>{getInitials(chatPartner.firstName, chatPartner.lastName)}</AvatarFallback>
                                            </Avatar>
                                         )}
                                        <div className={cn("max-w-xs lg:max-w-md p-3 rounded-lg", msg.senderId === currentUser.id ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary rounded-bl-none")}>
                                            <p className="text-sm">{msg.content}</p>
                                        </div>
                                    </div>
                                ))}
                                <div ref={messageEndRef} />
                            </div>
                            <div className="p-4 border-t">
                                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                    <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
                                    <Button type="submit" size="icon" disabled={isSending}>
                                        {isSending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </form>
                            </div>
                        </>
                    ) : (
                         <div className="p-4 flex flex-col items-center justify-center text-center h-full">
                             <Image src="/no_messages.svg" width={150} height={120} alt="No messages illustration" className="mb-4" />
                            <h4 className="font-semibold text-lg">Select a conversation</h4>
                            <p className="text-muted-foreground text-sm">Or start a new one by messaging an expert.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function ExpertDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();
  
  const [incompletePrompts, setIncompletePrompts] = useState<ProfilePrompt[]>([]);
  const [promptIndex, setPromptIndex] = useState(0);
  const [isPromptDialogOpen, setIsPromptDialogOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  const postForm = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { content: '' },
    mode: 'onChange',
  });

  const userDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);

  const { data: userProfile, isLoading: isProfileLoading, error: profileError } = useDoc<ExpertUserProfile>(userDocRef);

  const appConfigDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);
  
  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = superAdminData !== null;
  
  const referralsUsedQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile?.referralCode) return null;
    return query(collection(firestore, 'users'), where('referredByCode', '==', userProfile.referralCode));
  }, [firestore, userProfile?.referralCode]);

  const { data: referredUsers, isLoading: isLoadingReferrals } = useCollection(referralsUsedQuery);
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'messages') {
        setActiveTab('messages');
    }
  }, [searchParams]);


  // Logic for the profile completion prompt
  useEffect(() => {
    if (typeof window !== 'undefined' && userProfile && !isProfileLoading && !isAppConfigLoading) {
        if (sessionStorage.getItem('profilePromptShown')) {
            return;
        }
  
        const allPrompts: ProfilePrompt[] = [
            { field: 'gender', label: 'Gender', question: 'What is your gender?', type: 'select', options: [{value: 'Male', label: 'Male'}, {value: 'Female', label: 'Female'}, {value: 'Other', label: 'Other'}] },
            { field: 'pricingModel', label: 'Pricing Model', question: 'How do you typically charge for your services?', type: 'select', options: (appConfig?.pricingModels || []).map(m => ({value: m, label: m})) },
            { field: 'experienceYears', label: 'Years', question: 'How many years of experience do you have?', type: 'number-group', subFields: [{name: 'experienceMonths', label: 'Months'}] },
            { field: 'qualification', label: 'Qualification', question: 'What is your highest qualification?', type: 'text' },
            { field: 'skills', label: 'Skills', question: 'What are some of your key skills? (comma-separated)', type: 'text' },
        ];
  
        const filteredPrompts = allPrompts.filter(p => {
            const value = userProfile[p.field];
             // Treat empty string as incomplete, but allow 0 for numerical fields
            if (typeof value === 'number') {
                return value === null || value === undefined;
            }
            return value === null || value === undefined || value === '';
        });

        if (filteredPrompts.length > 0) {
            setIncompletePrompts(filteredPrompts);
            const timer = setTimeout(() => {
                setPromptIndex(0);
                setIsPromptDialogOpen(true);
                sessionStorage.setItem('profilePromptShown', 'true');
            }, 2000); // 2-second delay
            
            return () => clearTimeout(timer);
        }
    }
  }, [userProfile, isProfileLoading, appConfig, isAppConfigLoading]);

  const handleNextPrompt = async (field: keyof ExpertUserProfile, value: any, subValue?: any) => {
    if (!userDocRef) return;
    
    let dataToUpdate: Partial<ExpertUserProfile> = { [field]: value };
    const currentPrompt = incompletePrompts[promptIndex];
    
    if (currentPrompt.type === 'number-group' && currentPrompt.subFields) {
        dataToUpdate[field] = Number(value) || 0;
        dataToUpdate[currentPrompt.subFields[0].name] = Number(subValue) || 0;
    }
    
    try {
      await updateDocumentNonBlocking(userDocRef, dataToUpdate);
      if (promptIndex < incompletePrompts.length - 1) {
          setPromptIndex(prev => prev + 1);
      } else {
          setIsPromptDialogOpen(false);
          toast({ title: "Profile Complete!", description: "All missing information has been added." });
      }
    } catch(e) {
      if ((e as any).name !== 'FirebaseError') {
        toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not update your profile.' });
      }
    }
  };

  const handlePreviousPrompt = () => {
    if (promptIndex > 0) {
        setPromptIndex(prev => prev + 1);
    }
  };


  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
   useEffect(() => {
    if (isSuperAdmin) {
      router.push('/admin');
    }
  }, [isSuperAdmin, router]);
  

  const handleLogout = () => {
    if (auth) {
        signOut(auth);
    }
  };

  const handleAvailabilityToggle = (isAvailable: boolean) => {
    if (!userDocRef) return;
    updateDocumentNonBlocking(userDocRef, { isAvailable });
    toast({
        title: "Availability Updated",
        description: `You are now set as ${isAvailable ? 'Available' : 'Unavailable'}.`,
    });
  }

  const calculateProfileCompletion = (profile: ExpertUserProfile | null): number => {
    if (!profile) return 0;

    const fields = [
        profile.city,
        profile.state,
        profile.pincode,
        profile.phoneNumber,
        profile.pricingValue,
        profile.experienceYears,
        profile.gender,
        profile.qualification,
        profile.skills,
        profile.aboutMe,
        profile.photoUrl,
    ];
    
    if (profile.collegeName) fields.push(profile.collegeName);
    
    if (profile.role === 'Company' || profile.role === 'Authorized Pro') {
        fields.push(profile.companyName);
        fields.push(profile.department);
        fields.push(profile.address);
    }

    const filledFields = fields.filter(field => {
        if (typeof field === 'number') {
            return field !== null && field !== undefined; // Handles 0 as a valid entry
        }
        return field !== null && field !== undefined && field !== '';
    }).length;
    const totalFields = fields.length;
    
    return Math.round((filledFields / totalFields) * 100);
  }

  const copyReferralLink = () => {
    if (!userProfile?.referralCode) return;
    const baseUrl = window.location.origin;
    const signupUrl = new URL('/signup', baseUrl);
    signupUrl.searchParams.set('ref', userProfile.referralCode);
    navigator.clipboard.writeText(signupUrl.toString());
    toast({
      title: 'Referral Link Copied',
      description: 'Your unique signup link has been copied to your clipboard.',
    });
  };
  
  const shareOnWhatsApp = () => {
    if (!userProfile?.referralCode) return;
    const baseUrl = window.location.origin;
    const signupUrl = new URL('/signup', baseUrl);
    signupUrl.searchParams.set('ref', userProfile.referralCode);
    const text = `Join me on DriveGuru! Use my referral code to sign up: ${signupUrl.toString()}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleAwardReferral = async (userToReward: ExpertUserProfile) => {
    if (!userToReward.referredByCode) {
      toast({
        variant: "destructive",
        title: "No Referral Code",
        description: "This user did not sign up with a referral code.",
      });
      return;
    }
  
    try {
      const result = await processReferral({
        newUserUid: userToReward.id,
        referralCode: userToReward.referredByCode
      });
  
      if (result.success) {
        toast({
          title: "Referral Points Awarded",
          description: result.message,
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error("Failed to award referral points:", error);
      toast({
        variant: "destructive",
        title: "Award Failed",
        description: error.message || "Could not award points. Please check the referral code and try again.",
      });
    }
  };

  async function onPostSubmit(values: z.infer<typeof postFormSchema>) {
    if (!firestore || !user || !userProfile) return;

    setIsSubmittingPost(true);
    const postsCollectionRef = collection(firestore, 'posts');

    try {
      await addDocumentNonBlocking(postsCollectionRef, {
        content: values.content,
        authorId: user.uid,
        authorName: `${userProfile.firstName} ${userProfile.lastName}`,
        authorPhotoUrl: userProfile.photoUrl || '',
        createdAt: serverTimestamp(),
        likes: [],
      });
      toast({
        title: 'Post Published!',
        description: 'Your update is now live on the public feed.',
      });
      postForm.reset();
    } catch (error) {
      if ((error as any).name !== 'FirebaseError') {
        toast({
          variant: 'destructive',
          title: 'Failed to Post',
          description: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setIsSubmittingPost(false);
    }
  }


  const profileCompletion = calculateProfileCompletion(userProfile);
  const paymentQueryParam = searchParams.get('payment');
  const isLoading = isUserLoading || isProfileLoading || isAppConfigLoading || isRoleLoading || isLoadingReferrals;
  const referralsCount = referredUsers?.length || 0;
  const pointsPerReferral = appConfig?.referralRewardPoints || 0;
  const totalPoints = referralsCount * pointsPerReferral;


  if (isLoading) {
    let message = "Finalizing session...";
    if (paymentQueryParam === 'success') {
      message = "Payment successful! Please wait while we update your dashboard...";
    }
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">{message}</p>
      </div>
    );
  }

  if (profileError) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md border-destructive">
                <CardHeader className="text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                        <AlertTriangle className="h-6 w-6 text-destructive" />
                    </div>
                    <CardTitle className="mt-4 text-2xl text-destructive">Error Loading Profile</CardTitle>
                </CardHeader>
                <CardContent className="text-center text-muted-foreground">
                    <p>We couldn&apos;t load your dashboard. Please try again later or contact support.</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  if (!user || !userProfile) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Finalizing session...</p>
      </div>
    );
  }
  
  const locationString = [userProfile.city, userProfile.state, userProfile.pincode].filter(Boolean).join(', ');
  const verificationFee = appConfig?.verificationFee;
  const experienceString = [
    userProfile.experienceYears ? `${userProfile.experienceYears} years` : null,
    userProfile.experienceMonths ? `${userProfile.experienceMonths} months` : null,
  ].filter(Boolean).join(' ') || 'Not specified';
  
  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Expert Dashboard</h1>
            <Button variant="outline" onClick={handleLogout} className="flex-grow-0">
                <LogOut className="mr-2 h-4 w-4" />
                Log Out
            </Button>
        </div>
        
        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                <TabsTrigger value="feed">Feed</TabsTrigger>
                <TabsTrigger value="messages">Messages</TabsTrigger>
                <TabsTrigger value="plan">My Plan</TabsTrigger>
            </TabsList>
            <TabsContent value="dashboard" className="mt-6 space-y-6">
                <Card>
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <Avatar className="h-16 w-16 sm:h-24 sm:w-24 text-3xl">
                                <AvatarImage src={userProfile.photoUrl} alt={`${userProfile.firstName} ${userProfile.lastName}`} />
                                <AvatarFallback>{getInitials(userProfile.firstName, userProfile.lastName)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-2xl sm:text-4xl font-bold">Welcome, {userProfile.firstName}!</CardTitle>
                                    <FollowerStats userId={userProfile.id} />
                                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                                        {userProfile.verified ? (
                                            <Badge variant="outline" className="border-green-500 text-green-500">
                                                <UserCheck className="mr-1 h-3 w-3" />
                                                Verified
                                            </Badge>
                                        ) : (
                                            <Badge variant="destructive">
                                                <XCircle className="mr-1 h-3 w-3" />
                                                Not Verified
                                            </Badge>
                                        )}
                                        <Badge variant="secondary">{userProfile.role}</Badge>
                                        {userProfile.companyName && <Badge variant="secondary">{userProfile.companyName}</Badge>}
                                        {userProfile.tier === 'Premier' && <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>}
                                        {userProfile.tier === 'Super Premier' && <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex w-full sm:w-auto items-center gap-2 self-start sm:self-auto">
                                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="flex-grow">
                                            <Edit className="mr-2 h-4 w-4" />
                                            Edit Profile
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                                        <DialogHeader>
                                            <DialogTitle>Edit Your Profile</DialogTitle>
                                            <DialogDescription>
                                                Update your personal and professional information. Click save when you're done.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <EditProfileForm 
                                            userProfile={userProfile} 
                                            onSuccess={() => setIsEditDialogOpen(false)} 
                                        />
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="availability-mode" 
                                checked={userProfile.isAvailable} 
                                onCheckedChange={handleAvailabilityToggle}
                                aria-label="Availability status"
                            />
                            <Label htmlFor="availability-mode" className="flex items-center gap-2 text-sm">
                                {userProfile.isAvailable ? (
                                    <><Check className="h-4 w-4 text-green-500"/> I am currently available.</>
                                ) : (
                                    <><Power className="h-4 w-4 text-red-500"/> I am not available.</>
                                )}
                            </Label>
                        </div>
        
                        {!userProfile.verified && (
                            <div className="bg-blue-900/20 border border-blue-700 text-blue-200 p-4 rounded-lg mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <Shield className="h-8 w-8 text-blue-400 flex-shrink-0" />
                                    <div>
                                        <h4 className="font-bold">Become a Verified Expert</h4>
                                        <p className="text-sm text-blue-300">
                                            Unlock contact features and gain client trust.
                                            {verificationFee ? ` Verify your profile for a one-time fee of ₹${verificationFee}.` : ' Verify your profile for a one-time fee.'}
                                        </p>
                                    </div>
                                </div>
                                <Button asChild size="default" className="mt-auto w-full sm:w-auto bg-green-600 hover:bg-green-700">
                                    <Link href={appConfig?.verificationPaymentLink || '/payment/verification'}>
                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                        Get Verified {verificationFee && verificationFee > 0 ? ` for ₹${verificationFee}` : ''}
                                    </Link>
                                </Button>
                            </div>
                        )}
                        
                        <div className="my-6">
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-sm">Profile Completion</h4>
                            <span className="text-sm font-bold text-primary">{profileCompletion}%</span>
                        </div>
                        <Progress value={profileCompletion} className="h-2" />
                        {profileCompletion < 100 && (
                            <Alert className="mt-4">
                                <Terminal className="h-4 w-4" />
                                <AlertTitle>Complete Your Profile!</AlertTitle>
                                <AlertDescription>
                                A complete profile helps you stand out. Click the button below to add your missing details and attract more clients.
                                <Button 
                                    size="sm" 
                                    className="mt-3 w-full sm:w-auto"
                                    onClick={() => setIsEditDialogOpen(true)}
                                >
                                    <Edit className="mr-2 h-4 w-4" /> Update Profile
                                </Button>
                                </AlertDescription>
                            </Alert>
                        )}
                        </div>
        
                        <Separator className="my-6" />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex items-center gap-3">
                                <UserIcon className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Gender:</span> {userProfile.gender || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <IndianRupee className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Rate:</span> {userProfile.pricingValue ? `₹${userProfile.pricingValue}` : <span className="text-destructive">Not specified</span>}{userProfile.pricingModel && ` / ${userProfile.pricingModel}`}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Experience:</span> {experienceString}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <MapPin className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Location:</span> {locationString || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <GraduationCap className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">Qualification:</span> {userProfile.qualification || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <School className="h-5 w-5 text-muted-foreground" />
                                <p><span className="font-semibold">College:</span> {userProfile.collegeName || <span className="text-destructive">Not specified</span>}</p>
                            </div>
                            {(userProfile.role === 'Company' || userProfile.role === 'Authorized Pro') && (
                                <>
                                    {userProfile.businessDescription && (
                                        <div className="flex items-start gap-3 md:col-span-2">
                                            <Type className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                            <p><span className="font-semibold">Business:</span> {userProfile.businessDescription}</p>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <Building className="h-5 w-5 text-muted-foreground" />
                                        <p><span className="font-semibold">Department:</span> {userProfile.department || <span className="text-destructive">Not specified</span>}</p>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Home className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
                                        <p><span className="font-semibold">Address:</span> {userProfile.address || <span className="text-destructive">Not specified</span>}</p>
                                    </div>
                                </>
                            )}
                        </div>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><Info className="h-5 w-5" /> About Me</h4>
                                <p className="text-muted-foreground text-sm">{userProfile.aboutMe || <span className="text-destructive">No information provided.</span>}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><PenSquare className="h-5 w-5" /> About My Dream</h4>
                                <p className="text-muted-foreground text-sm">{userProfile.aboutYourDream || <span className="text-destructive">No information provided.</span>}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><Factory className="h-5 w-5" /> Associated Projects</h4>
                                <p className="text-muted-foreground text-sm">{userProfile.associatedProjectsName || <span className="text-destructive">No projects listed.</span>}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold flex items-center gap-2 mb-2"><Book className="h-5 w-5" /> Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                    {userProfile.skills ? userProfile.skills.split(',').map((skill, index) => (
                                        <Badge key={index} variant="secondary">{skill.trim()}</Badge>
                                    )) : <p className="text-sm text-destructive">No skills specified.</p>}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                {userProfile.referralCode && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Gift className="h-6 w-6 text-primary" />
                                <div>
                                    <CardTitle>Referral Rewards</CardTitle>
                                    <CardDescription>Invite others and earn rewards.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-secondary">
                                <div className="text-center sm:text-left">
                                    <p className="text-sm text-muted-foreground">Your Referral Code</p>
                                    <p className="text-2xl font-mono tracking-widest text-secondary-foreground">{userProfile.referralCode}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={copyReferralLink}>
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        Copy Link
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={shareOnWhatsApp} className="bg-green-500/10 border-green-500/50 text-green-500 hover:bg-green-500/20 hover:text-green-500">
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        WhatsApp
                                    </Button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-4">
                                <div className="p-4 rounded-lg border text-center">
                                    <p className="text-sm font-medium text-muted-foreground">Total Points Earned</p>
                                    <p className="text-3xl font-bold">{totalPoints}</p>
                                </div>
                                <div className="p-4 rounded-lg border text-center">
                                    <p className="text-sm font-medium text-muted-foreground">Referrals Used</p>
                                    <p className="text-3xl font-bold">{referralsCount}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
        
                <PeopleToFollow currentUserProfile={userProfile} />
                
                {userProfile.role === 'Company' && <CompanyVacancies userProfile={userProfile} />}
            </TabsContent>
            <TabsContent value="feed" className="mt-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Rss className="h-5 w-5"/>Post to the Public Feed</CardTitle>
                        <CardDescription>Share an update with the community. Your post will be visible to everyone on the platform.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <PostForm 
                        form={postForm}
                        onSubmit={onPostSubmit}
                        isSubmitting={isSubmittingPost}
                        />
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="messages" className="mt-6">
                <MessagingSection currentUser={userProfile} />
            </TabsContent>
            <TabsContent value="plan" className="mt-6">
                <PlanManagement userProfile={userProfile} appConfig={appConfig} />
            </TabsContent>
        </Tabs>

        <ProfilePromptDialog 
            prompt={incompletePrompts[promptIndex]}
            isOpen={isPromptDialogOpen}
            onOpenChange={setIsPromptDialogOpen}
            userProfile={userProfile}
            appConfig={appConfig}
            onNext={handleNextPrompt}
            onPrevious={handlePreviousPrompt}
            hasNext={promptIndex < incompletePrompts.length - 1}
            hasPrevious={promptIndex > 0}
        />
      </div>
    </div>
  );
}


export default function DashboardPageWrapper() {
  return (
    <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Loading Dashboard...</p>
        </div>
    }>
        <ExpertDashboardPage />
    </Suspense>
  )
}
