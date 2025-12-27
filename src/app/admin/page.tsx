

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, Timestamp, orderBy, query, doc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useUser, useFirestore, useDoc, useMemoFirebase, useAuth, useCollection } from '@/firebase';
import { deleteDocumentNonBlocking, updateDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield, Ban, Loader, LogOut, Users, MoreHorizontal, Trash2, Edit, CheckCircle2, UserCheck, UserX, Crown, Sparkles, User as UserIcon, Settings, Save, Briefcase, Building, MessageSquare, ThumbsUp, ThumbsDown, Star, Search, PlusCircle, Mail, Edit3, Link as LinkIcon, Download, ExternalLink, IndianRupee, X, Upload, HardDriveDownload, Megaphone, Phone, MapPinIcon, CreditCard, AlertTriangle, Key, Gift, Code, List, Grip, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSeparator,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { PostVacancyForm } from '@/components/auth/post-vacancy-form';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Vacancy } from '@/app/vacancies/page';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { exportAllData } from '@/ai/flows/export-data-flow';
import { importUsers } from '@/ai/flows/import-users-flow';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { processReferral } from '@/ai/flows/process-referral-flow';
import { v4 as uuidv4 } from 'uuid';

type ExpertUser = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
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
    department?: string;
    isAvailable?: boolean;
    companyId?: string;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    referralCode?: string;
    referralPoints?: number;
    referredByCode?: string | null;
    createdAt?: Timestamp;
};

type Payment = {
    id: string;
    userId: string;
    plan: string;
    amount: number;
    currency: string;
    orderId: string;
    status: 'pending' | 'successful' | 'failed';
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

type PlanPrices = {
    daily?: number;
    monthly?: number;
    yearly?: number;
};

export type HomepageCategory = {
    id: string;
    name: string;
    icon: string;
};

type AppConfig = {
    featuredExpertsLimit?: number;
    homepageCategories?: HomepageCategory[];
    departments?: string[];
    pricingModels?: string[];
    premierPaymentLink?: string;
    superPremierPaymentLink?: string;
    verificationPaymentLink?: string;
    premierPlanPrices?: PlanPrices;
    superPremierPlanPrices?: PlanPrices;
    verificationFee?: number;
    isAnnouncementEnabled?: boolean;
    announcementText?: string;
    announcementSpeed?: number;
    availabilityLocationText?: string;
    isPaymentsEnabled?: boolean;
    paymentMethod?: 'API' | 'Link';
    publicApiKey?: string;
    referralRewardPoints?: number;
};

const UserTable = ({ users, allUsers, onTierChange, onVerificationToggle, onDelete, onEdit, onAwardReferral }: { users: ExpertUser[], allUsers: ExpertUser[], onTierChange: (expert: ExpertUser, tier: ExpertUser['tier']) => void, onVerificationToggle: (expert: ExpertUser) => void, onDelete: (expert: ExpertUser) => void, onEdit: (expert: ExpertUser) => void, onAwardReferral: (user: ExpertUser) => void }) => {
    const getInitials = (firstName?: string, lastName?: string) => {
        if (firstName && lastName) {
            return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
        }
        return 'U';
    }

    const renderTierBadge = (tier?: ExpertUser['tier']) => {
        switch (tier) {
            case 'Premier':
                return <Badge variant="outline" className="border-purple-500 text-purple-500"><Crown className="mr-1 h-3 w-3" /> Premier</Badge>;
            case 'Super Premier':
                return <Badge variant="outline" className="border-blue-500 text-blue-500"><Sparkles className="mr-1 h-3 w-3" /> Super Premier</Badge>;
            default:
                return <Badge variant="secondary"><UserIcon className="mr-1 h-3 w-3" /> Standard</Badge>;
        }
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead className="w-[80px]">Avatar</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Referral</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-center">Tier</TableHead>
                <TableHead className="text-center">Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users && users.length > 0 ? (
                users.map((expert) => {
                    const referralCount = expert.referralCode ? allUsers.filter(u => u.referredByCode === expert.referralCode).length : 0;
                    return (
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
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {expert.phoneNumber}
                                </div>
                            )}
                            {expert.referralCode && (
                                <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Code className="h-3 w-3" />
                                    <span>{expert.referralCode}</span>
                                    <Badge variant="secondary" className="ml-1">Used: {referralCount}</Badge>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            {expert.referredByCode ? (
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline">{expert.referredByCode}</Badge>
                                    <Button size="sm" variant="outline" onClick={() => onAwardReferral(expert)}>
                                        <Gift className="mr-2 h-4 w-4" /> Award
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <Badge variant="outline">{expert.referralPoints || 0}</Badge>
                                    <span className="text-muted-foreground text-xs">Points</span>
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <Badge variant="secondary">{expert.role}</Badge>
                            </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                            {expert.createdAt ? formatDistanceToNow(expert.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">{renderTierBadge(expert.tier)}</TableCell>
                        <TableCell className="text-center">
                            <div className='flex items-center justify-center space-x-2'>
                                <Switch id={`verified-switch-${expert.id}`} checked={expert.verified || false} onCheckedChange={() => onVerificationToggle(expert)} />
                                {expert.verified ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <Ban className="h-5 w-5 text-destructive" />}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuSub>
                                        <DropdownMenuSubTrigger><Sparkles className="mr-2 h-4 w-4" /><span>Change Tier</span></DropdownMenuSubTrigger>
                                        <DropdownMenuPortal><DropdownMenuSubContent>
                                            <DropdownMenuItem onClick={() => onTierChange(expert, 'Standard')}><UserIcon className="mr-2 h-4 w-4" />Standard</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onTierChange(expert, 'Premier')}><Crown className="mr-2 h-4 w-4" />Premier</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onTierChange(expert, 'Super Premier')}><Sparkles className="mr-2 h-4 w-4" />Super Premier</DropdownMenuItem>
                                        </DropdownMenuSubContent></DropdownMenuPortal>
                                    </DropdownMenuSub>
                                    <DropdownMenuItem onClick={() => onEdit(expert)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(expert)} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TableCell>
                        </TableRow>
                    )
                })
                ) : ( <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground h-24">No users found for this role.</TableCell></TableRow> )}
            </TableBody>
        </Table>
    )
}

const VacancyTable = ({ vacancies, onEdit, onDelete, onVerifyToggle, onTierToggle }: { vacancies: Vacancy[], onEdit: (vacancy: Vacancy) => void, onDelete: (vacancy: Vacancy) => void, onVerifyToggle: (vacancy: Vacancy) => void, onTierToggle: (vacancy: Vacancy) => void }) => {
  return (
      <Table>
          <TableHeader>
              <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Posted</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
              </TableRow>
          </TableHeader>
          <TableBody>
              {vacancies && vacancies.length > 0 ? (
                  vacancies.map((vacancy) => (
                      <TableRow key={vacancy.id}>
                          <TableCell className="font-medium">{vacancy.title}</TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                                <span>{vacancy.companyName}</span>
                                <div className="flex items-center gap-1 mt-1">
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
                            </div>
                          </TableCell>
                          <TableCell>{vacancy.location}</TableCell>
                          <TableCell><Badge variant="secondary">{vacancy.employmentType}</Badge></TableCell>
                          <TableCell>{vacancy.postedAt ? formatDistanceToNow(vacancy.postedAt.toDate(), { addSuffix: true }) : 'pending...'}</TableCell>
                          <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit(vacancy)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        <span>Edit</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onVerifyToggle(vacancy)}>
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        <span>Toggle Verified</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onTierToggle(vacancy)}>
                                        <Crown className="mr-2 h-4 w-4" />
                                        <span>Toggle Premier</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => onDelete(vacancy)} className="text-destructive focus:text-destructive">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        <span>Delete</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                                </DropdownMenu>
                          </TableCell>
                      </TableRow>
                  ))
              ) : (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No vacancies found.</TableCell></TableRow>
              )}
          </TableBody>
      </Table>
  );
}

const PaymentTable = ({ payments, users }: { payments: Payment[], users: ExpertUser[] }) => {
    const getUserById = (userId: string) => users.find(u => u.id === userId);

    const renderStatusBadge = (status: Payment['status']) => {
        switch(status) {
            case 'successful':
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Successful</Badge>;
            case 'pending':
                return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300">Pending</Badge>;
            case 'failed':
                return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">Failed</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {payments && payments.length > 0 ? (
                    payments.map((payment) => {
                        const user = getUserById(payment.userId);
                        return (
                            <TableRow key={payment.id}>
                                <TableCell>
                                    {user ? (
                                        <Link href={`/expert/${user.id}`} className="font-medium hover:underline">{user.firstName} {user.lastName}</Link>
                                    ) : (
                                        <span className="text-muted-foreground">Unknown User</span>
                                    )}
                                    <div className="text-xs text-muted-foreground">{payment.userId}</div>
                                </TableCell>
                                <TableCell><Badge variant="outline">{payment.plan}</Badge></TableCell>
                                <TableCell>₹{payment.amount.toFixed(2)}</TableCell>
                                <TableCell className="font-mono text-xs">{payment.orderId}</TableCell>
                                <TableCell>{renderStatusBadge(payment.status)}</TableCell>
                                <TableCell>{payment.createdAt ? format(payment.createdAt.toDate(), 'PPp') : 'N/A'}</TableCell>
                            </TableRow>
                        );
                    })
                ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No payments found.</TableCell></TableRow>
                )}
            </TableBody>
        </Table>
    );
};


export default function AdminDashboardPage() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [installPrompt, setInstallPrompt] = useState<Event | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) {
      return;
    }
    (installPrompt as any).prompt();
    (installPrompt as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      setInstallPrompt(null);
    });
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVacancyDeleteDialogOpen, setIsVacancyDeleteDialogOpen] = useState(false);
  const [isVacancyPostDialogOpen, setIsVacancyPostDialogOpen] = useState(false);
  const [isVacancyEditDialogOpen, setIsVacancyEditDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState<ExpertUser | null>(null);
  const [selectedVacancy, setSelectedVacancy] = useState<Vacancy | null>(null);

  const [featuredExpertsLimit, setFeaturedExpertsLimit] = useState(3);
  const [premierPaymentLink, setPremierPaymentLink] = useState('');
  const [superPremierPaymentLink, setSuperPremierPaymentLink] = useState('');
  const [verificationPaymentLink, setVerificationPaymentLink] = useState('');
  
  const [premierPrices, setPremierPrices] = useState<PlanPrices>({ daily: 0, monthly: 0, yearly: 0 });
  const [superPremierPrices, setSuperPremierPrices] = useState<PlanPrices>({ daily: 0, monthly: 0, yearly: 0 });

  const [verificationFee, setVerificationFee] = useState(0);
  const [availabilityLocationText, setAvailabilityLocationText] = useState('');
  const [publicApiKey, setPublicApiKey] = useState('');
  const [referralRewardPoints, setReferralRewardPoints] = useState(0);

  const [isAnnouncementEnabled, setIsAnnouncementEnabled] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSpeed, setAnnouncementSpeed] = useState(20);

  const [isPaymentsEnabled, setIsPaymentsEnabled] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<'API' | 'Link'>('API');
  
  const [homepageCategories, setHomepageCategories] = useState<HomepageCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');

  const [departments, setDepartments] = useState<string[]>([]);
  const [newDepartment, setNewDepartment] = useState('');
  
  const [pricingModels, setPricingModels] = useState<string[]>([]);
  const [newPricingModel, setNewPricingModel] = useState('');

  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);


  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const superAdminDocRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'roles_super_admin', user.uid);
  }, [firestore, user]);

  const { data: superAdminData, isLoading: isRoleLoading } = useDoc(superAdminDocRef);
  const isSuperAdmin = !!superAdminData;

  const usersCollectionRef = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isSuperAdmin]);

  const vacanciesCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return query(collection(firestore, 'vacancies'), orderBy('postedAt', 'desc'));
  }, [firestore, isSuperAdmin]);
  
  const paymentsCollectionQuery = useMemoFirebase(() => {
    if (!firestore || !isSuperAdmin) return null;
    return query(collection(firestore, 'payments'), orderBy('createdAt', 'desc'));
  }, [firestore, isSuperAdmin]);


  const { data: usersData, isLoading: isUsersLoading } = useCollection<ExpertUser>(usersCollectionRef);
  const { data: vacancies, isLoading: isVacanciesLoading } = useCollection<Vacancy>(vacanciesCollectionQuery);
  const { data: payments, isLoading: isPaymentsLoading } = useCollection<Payment>(paymentsCollectionQuery);
  
  const appConfigDocRef = useMemoFirebase(() => {
      if (!firestore) return null;
      return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig, isLoading: isAppConfigLoading } = useDoc<AppConfig>(appConfigDocRef);

  useEffect(() => {
    if (!isAppConfigLoading && appConfig) {
        setFeaturedExpertsLimit(appConfig.featuredExpertsLimit || 3);
        setHomepageCategories(appConfig.homepageCategories || []);
        setDepartments(appConfig.departments || []);
        setPricingModels(appConfig.pricingModels || []);
        setPremierPaymentLink(appConfig.premierPaymentLink || '');
        setSuperPremierPaymentLink(appConfig.superPremierPaymentLink || '');
        setVerificationPaymentLink(appConfig.verificationPaymentLink || '');
        setPremierPrices(appConfig.premierPlanPrices || { daily: 0, monthly: 0, yearly: 0 });
        setSuperPremierPrices(appConfig.superPremierPlanPrices || { daily: 0, monthly: 0, yearly: 0 });
        setVerificationFee(appConfig.verificationFee || 0);
        setAvailabilityLocationText(appConfig.availabilityLocationText || '');
        setPublicApiKey(appConfig.publicApiKey || '');
        setReferralRewardPoints(appConfig.referralRewardPoints || 0);
        setIsAnnouncementEnabled(appConfig.isAnnouncementEnabled || false);
        setAnnouncementText(appConfig.announcementText || '');
        setAnnouncementSpeed(appConfig.announcementSpeed || 20);
        setIsPaymentsEnabled(appConfig.isPaymentsEnabled === undefined ? true : appConfig.isPaymentsEnabled);
        setPaymentMethod(appConfig.paymentMethod || 'API');
    }
  }, [appConfig, isAppConfigLoading]);

  const verifiedCount = usersData?.filter(u => u.verified).length || 0;
  const unverifiedCount = usersData?.filter(u => !u.verified).length || 0;
  const premierCount = usersData?.filter(u => u.tier === 'Premier').length || 0;
  const superPremierCount = usersData?.filter(u => u.tier === 'Super Premier').length || 0;
  const totalReferralsUsed = usersData?.filter(u => u.referredByCode).length || 0;

  const handleLogout = () => {
    if (auth) {
      signOut(auth);
    }
  };
  
  const openDeleteDialog = (user: ExpertUser) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const openEditDialog = (user: ExpertUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleDeleteUser = () => {
    if (!selectedUser || !firestore) return;
    
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    deleteDocumentNonBlocking(userDocRef);
    
    toast({
        title: "User Deleted",
        description: `${selectedUser.firstName} ${selectedUser.lastName} has been removed.`,
    });

    setIsDeleteDialogOpen(false);
    setSelectedUser(null);
  }

  const handleTierChange = (expert: ExpertUser, tier: ExpertUser['tier']) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', expert.id);
    updateDocumentNonBlocking(userDocRef, { tier });

    let toastDescription = `${expert.firstName} ${expert.lastName}'s tier is now ${tier}.`;

    if (tier === 'Super Premier' && appConfig?.superPremierPaymentLink) {
        toastDescription += ` Payment Link: ${appConfig.superPremierPaymentLink}`;
    }

    toast({
        title: "Expert Tier Updated",
        description: (
            <div>
                <p>{expert.firstName} {expert.lastName}&apos;s tier is now {tier}.</p>
                {tier === 'Super Premier' && appConfig?.superPremierPaymentLink && (
                    <p className="mt-2">Payment Link: <a href={appConfig.superPremierPaymentLink} target="_blank" rel="noopener noreferrer" className="underline">{appConfig.superPremierPaymentLink}</a></p>
                )}
            </div>
        )
    });
  }

  const handleVerificationToggle = (expert: ExpertUser) => {
    if (!firestore) return;
    const userDocRef = doc(firestore, 'users', expert.id);
    const newVerifiedStatus = !expert.verified;
    updateDocumentNonBlocking(userDocRef, { verified: newVerifiedStatus });
    toast({
        title: `Expert ${newVerifiedStatus ? 'Verified' : 'Unverified'}`,
        description: `${expert.firstName} ${expert.lastName} is now ${newVerifiedStatus ? 'verified' : 'unverified'}.`
    });
  }

  const handleSaveSettings = () => {
    if (!appConfigDocRef) return;
    setIsSavingSettings(true);

    const settingsToSave: AppConfig = {
        featuredExpertsLimit: Number(featuredExpertsLimit),
        homepageCategories,
        departments,
        pricingModels,
        premierPaymentLink,
        superPremierPaymentLink,
        verificationPaymentLink,
        premierPlanPrices: {
            daily: Number(premierPrices.daily) || 0,
            monthly: Number(premierPrices.monthly) || 0,
            yearly: Number(premierPrices.yearly) || 0,
        },
        superPremierPlanPrices: {
            daily: Number(superPremierPrices.daily) || 0,
            monthly: Number(superPremierPrices.monthly) || 0,
            yearly: Number(superPremierPrices.yearly) || 0,
        },
        verificationFee: Number(verificationFee),
        availabilityLocationText: availabilityLocationText,
        publicApiKey: publicApiKey,
        referralRewardPoints: Number(referralRewardPoints),
        isAnnouncementEnabled: isAnnouncementEnabled,
        announcementText: announcementText,
        announcementSpeed: Number(announcementSpeed),
        isPaymentsEnabled,
        paymentMethod,
    };
    
    setDocumentNonBlocking(appConfigDocRef, settingsToSave, { merge: true }).then(() => {
        toast({
            title: "Settings Saved",
            description: "Application settings have been updated.",
        });
    }).catch(error => {
        if (error.name !== 'FirebaseError') {
             toast({
                variant: "destructive",
                title: "Error saving settings",
                description: "Could not save settings. Please try again.",
            });
        }
    }).finally(() => {
        setIsSavingSettings(false);
    });
  }
  
  const handleAddCategory = () => {
      if (newCategoryName.trim() && newCategoryIcon.trim()) {
          setHomepageCategories(prev => [...prev, { id: uuidv4(), name: newCategoryName, icon: newCategoryIcon }]);
          setNewCategoryName('');
          setNewCategoryIcon('');
      } else {
          toast({
              variant: 'destructive',
              title: 'Missing Information',
              description: 'Please provide both a name and a Lucide icon name for the new category.'
          });
      }
  };

  const handleUpdateCategory = (id: string, field: 'name' | 'icon', value: string) => {
      setHomepageCategories(prev => prev.map(cat => cat.id === id ? { ...cat, [field]: value } : cat));
  };
  
  const handleDeleteCategory = (id: string) => {
      setHomepageCategories(prev => prev.filter(cat => cat.id !== id));
  };

  const handleMoveCategory = (index: number, direction: 'up' | 'down') => {
      setHomepageCategories(prev => {
          const newCategories = [...prev];
          const item = newCategories[index];
          const newIndex = direction === 'up' ? index - 1 : index + 1;
          
          if (newIndex < 0 || newIndex >= newCategories.length) {
              return newCategories; // Out of bounds
          }

          newCategories.splice(index, 1); // Remove item from original position
          newCategories.splice(newIndex, 0, item); // Insert item at new position

          return newCategories;
      });
  };

  const handleAddDepartment = () => {
      if (newDepartment.trim() && !departments.includes(newDepartment.trim())) {
          setDepartments(prev => [...prev, newDepartment.trim()]);
          setNewDepartment('');
      } else {
          toast({
              variant: 'destructive',
              title: 'Invalid Department',
              description: 'Please enter a unique department name.'
          });
      }
  };
  
  const handleDeleteDepartment = (departmentToDelete: string) => {
      setDepartments(prev => prev.filter(dep => dep !== departmentToDelete));
  };

  const handleAddPricingModel = () => {
    if (newPricingModel.trim() && !pricingModels.includes(newPricingModel.trim())) {
        setPricingModels(prev => [...prev, newPricingModel.trim()]);
        setNewPricingModel('');
    } else {
        toast({
            variant: 'destructive',
            title: 'Invalid Pricing Model',
            description: 'Please enter a unique pricing model name (e.g., Hourly, Per-Day).'
        });
    }
  };

  const handleDeletePricingModel = (modelToDelete: string) => {
      setPricingModels(prev => prev.filter(model => model !== modelToDelete));
  };

  const openVacancyEditDialog = (vacancy: Vacancy) => {
      setSelectedVacancy(vacancy);
      setIsVacancyEditDialogOpen(true);
  }

  const openVacancyDeleteDialog = (vacancy: Vacancy) => {
      setSelectedVacancy(vacancy);
      setIsVacancyDeleteDialogOpen(true);
  };

  const handleDeleteVacancy = () => {
      if (!selectedVacancy || !firestore) return;
      const vacancyDocRef = doc(firestore, 'vacancies', selectedVacancy.id);
      deleteDocumentNonBlocking(vacancyDocRef);
      toast({
          title: "Vacancy Deleted",
          description: `The vacancy "${selectedVacancy.title}" has been removed.`,
      });
      setIsVacancyDeleteDialogOpen(false);
      setSelectedVacancy(null);
  };

  const handleVacancyVerifyToggle = (vacancy: Vacancy) => {
    if (!firestore) return;
    const vacancyDocRef = doc(firestore, 'vacancies', vacancy.id);
    const newStatus = !vacancy.isCompanyVerified;
    updateDocumentNonBlocking(vacancyDocRef, { isCompanyVerified: newStatus });
    toast({
        title: `Vacancy Company ${newStatus ? 'Verified' : 'Unverified'}`,
        description: `Company for "${vacancy.title}" is now ${newStatus ? 'verified' : 'unverified'}.`
    });
  };

  const handleVacancyTierToggle = (vacancy: Vacancy) => {
    if (!firestore) return;
    const vacancyDocRef = doc(firestore, 'vacancies', vacancy.id);
    const newTier = vacancy.companyTier === 'Premier' ? 'Standard' : 'Premier';
    updateDocumentNonBlocking(vacancyDocRef, { companyTier: newTier });
     toast({
        title: "Vacancy Company Tier Updated",
        description: `Company tier for "${vacancy.title}" is now ${newTier}.`
    });
  };

  const handleFilterClick = (filter: string | null) => {
    if (activeFilter === filter) {
        setActiveFilter(null); // Toggle off if clicked again
    } else {
        setActiveFilter(filter);
    }
  };

  const handleAwardReferral = async (userToReward: ExpertUser) => {
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

  const handleExportData = async () => {
    setIsExporting(true);
    try {
        const data = await exportAllData();
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = "drive-guru-backup.json";
        link.click();
        toast({
            title: "Export Successful",
            description: "Your data has been downloaded as a JSON file.",
        });
    } catch (error) {
        console.error("Export failed:", error);
        toast({
            variant: "destructive",
            title: "Export Failed",
            description: "Could not export data. Please check the console.",
        });
    } finally {
        setIsExporting(false);
    }
  };
  
    const handleExportUsersCsv = () => {
        if (!usersData) {
            toast({ variant: 'destructive', title: 'No users to export.' });
            return;
        }

        const headers = ['id', 'firstName', 'lastName', 'email', 'role', 'companyName', 'department', 'phoneNumber', 'city', 'state', 'pincode', 'address', 'verified', 'tier', 'isAvailable', 'pricingModel', 'pricingValue', 'yearsOfExperience', 'qualification', 'skills', 'aboutMe', 'referralCode', 'referredByCode'];
        const csvRows = [headers.join(',')];

        for (const user of usersData) {
            const values = headers.map(header => {
                const value = (user as any)[header];
                if (value === undefined || value === null) return '';
                if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
                return value;
            });
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'expert_users_template.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        toast({ title: 'Users Exported', description: 'A CSV template has been downloaded.' });
    };

  const handleImportUsersCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target?.result as string;
                const result = await importUsers({ csvData: content });
                toast({
                    title: "Import Complete",
                    description: `${result.processedCount} users were processed. ${result.createdCount} created, ${result.updatedCount} updated.`,
                });
                if (result.errors.length > 0) {
                     toast({
                        variant: 'destructive',
                        title: "Import had some issues",
                        description: `${result.errors.length} rows had errors. Check console for details.`,
                    });
                    console.error("Import errors:", result.errors);
                }
            };
            reader.readAsText(file);
        } catch (error) {
            console.error("Import failed:", error);
            toast({
                variant: 'destructive',
                title: 'Import Failed',
                description: 'An unexpected error occurred during import.',
            });
        } finally {
            setIsImporting(false);
            if (event.target) event.target.value = '';
        }
    }
  };


  const areTablesLoading = isSuperAdmin && (isUsersLoading || isVacanciesLoading || isPaymentsLoading);
  
  const filteredUsers = useMemo(() => {
    if (!usersData) return [];
    
    let sortedUsers = [...usersData].sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));

    return sortedUsers.filter(user => {
        if (!user) return false;
        const searchMatch = searchQuery.length > 0 ? 
              (user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
               user.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
               user.referralCode?.toLowerCase().includes(searchQuery.toLowerCase())) 
            : true;

        const filterMatch = activeFilter ? {
            'verified': user.verified === true,
            'unverified': user.verified === false,
            'premier': user.tier === 'Premier',
            'super-premier': user.tier === 'Super Premier'
        }[activeFilter] : true;

        return searchMatch && filterMatch;
    });
}, [usersData, searchQuery, activeFilter]);

  const freelancers = filteredUsers?.filter(user => user.role === 'Freelancer');
  const companies = filteredUsers?.filter(user => user.role === 'Company');
  const authorizedPros = filteredUsers?.filter(user => user.role === 'Authorized Pro');
  
  const isLoading = isUserLoading || isRoleLoading;


  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying Super Admin permissions...</p>
      </div>
    );
  }

  // Once loading is complete, we decide what to render.
  // This check prevents a flash of content if the user is not a super admin.
  if (!isSuperAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Redirecting...</p>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background p-4 sm:p-8">
        <div className="mx-auto max-w-7xl">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-8 gap-4">
            <div className="flex items-center gap-4">
              <Shield className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold">Super Admin</h1>
                <p className="text-muted-foreground">Welcome, {user?.email || 'Admin'}.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
                {installPrompt && (
                  <Button onClick={handleInstallClick} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Install App
                  </Button>
                )}
                <Button variant="outline" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Log Out
                </Button>
            </div>
          </header>

          <main>
            <Tabs defaultValue="dashboard" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                    <TabsTrigger value="data">Data Management</TabsTrigger>
                </TabsList>
                <TabsContent value="dashboard" className="mt-4">
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6 mb-8">
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Total Experts</CardTitle>
                          <Users className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{usersData?.length || 0}</div>
                          <p className="text-xs text-muted-foreground">Total registered users</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Verified Experts</CardTitle>
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{verifiedCount}</div>
                          <p className="text-xs text-muted-foreground">Total verified experts</p>
                        </CardContent>
                      </Card>
                       <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Unverified Experts</CardTitle>
                          <UserX className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{unverifiedCount}</div>
                          <p className="text-xs text-muted-foreground">Pending verification</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Premier Experts</CardTitle>
                          <Crown className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{premierCount}</div>
                          <p className="text-xs text-muted-foreground">Total Premier experts</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Super Premier</CardTitle>
                          <Sparkles className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{superPremierCount}</div>
                          <p className="text-xs text-muted-foreground">Total Super Premier</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Referrals Used</CardTitle>
                          <Gift className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold">{totalReferralsUsed}</div>
                          <p className="text-xs text-muted-foreground">Total signups via referral</p>
                        </CardContent>
                      </Card>
                    </div>
                     <Tabs defaultValue="users">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="users">User Management</TabsTrigger>
                            <TabsTrigger value="vacancies">Vacancy Management</TabsTrigger>
                            <TabsTrigger value="payments">Payment Management</TabsTrigger>
                        </TabsList>
                        <TabsContent value="users" className="mt-4">
                            <Card>
                                <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Users className="h-6 w-6" />
                                    <div>
                                    <CardTitle>Expert Users</CardTitle>
                                    <CardDescription>Manage all registered users in the system.</CardDescription>
                                    </div>
                                </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-col sm:flex-row items-stretch gap-4 mb-6">
                                        <div className="relative flex-grow">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Search by name, email, or referral code..."
                                                className="pl-10"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Button variant={activeFilter === 'verified' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('verified')}>Verified</Button>
                                            <Button variant={activeFilter === 'unverified' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('unverified')}>Unverified</Button>
                                            <Button variant={activeFilter === 'premier' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('premier')}>Premier</Button>
                                            <Button variant={activeFilter === 'super-premier' ? 'default' : 'outline'} size="sm" onClick={() => handleFilterClick('super-premier')}>Super Premier</Button>
                                        </div>
                                    </div>
                                {areTablesLoading ? (
                                    <div className="flex justify-center items-center p-8">
                                    <Loader className="h-6 w-6 animate-spin text-primary" />
                                    <p className="ml-3 text-muted-foreground">Loading users...</p>
                                    </div>
                                ) : (
                                    <Tabs defaultValue="all">
                                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                                            <TabsTrigger value="all">All Users</TabsTrigger>
                                            <TabsTrigger value="freelancers">Freelancers</TabsTrigger>
                                            <TabsTrigger value="companies">Companies</TabsTrigger>
                                            <TabsTrigger value="authorizedPros">Authorized Pros</TabsTrigger>
                                        </TabsList>
                                        <TabsContent value="all" className="mt-4">
                                            <UserTable users={filteredUsers} allUsers={usersData || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} onEdit={openEditDialog} onAwardReferral={handleAwardReferral} />
                                        </TabsContent>
                                        <TabsContent value="freelancers" className="mt-4">
                                            <UserTable users={freelancers || []} allUsers={usersData || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} onEdit={openEditDialog} onAwardReferral={handleAwardReferral} />
                                        </TabsContent>
                                        <TabsContent value="companies" className="mt-4">
                                            <UserTable users={companies || []} allUsers={usersData || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} onEdit={openEditDialog} onAwardReferral={handleAwardReferral} />
                                        </TabsContent>
                                        <TabsContent value="authorizedPros" className="mt-4">
                                            <UserTable users={authorizedPros || []} allUsers={usersData || []} onTierChange={handleTierChange} onVerificationToggle={handleVerificationToggle} onDelete={openDeleteDialog} onEdit={openEditDialog} onAwardReferral={handleAwardReferral} />
                                        </TabsContent>
                                    </Tabs>
                                )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="vacancies" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <Briefcase className="h-6 w-6" />
                                        <div>
                                        <CardTitle>Vacancy Management</CardTitle>
                                        <CardDescription>Manage all job vacancies in the system.</CardDescription>
                                        </div>
                                    </div>
                                    <Dialog open={isVacancyPostDialogOpen} onOpenChange={setIsVacancyPostDialogOpen}>
                                        <DialogTrigger asChild>
                                        <Button className="w-full sm:w-auto">
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Post New Vacancy
                                        </Button>
                                        </DialogTrigger>
                                        <DialogContent className="sm:max-w-[600px]">
                                        <DialogHeader>
                                            <DialogTitle>Create a New Vacancy</DialogTitle>
                                            <DialogDescription>As a Super Admin, you can post a job for any company.</DialogDescription>
                                        </DialogHeader>
                                        <PostVacancyForm
                                            onSuccess={() => setIsVacancyPostDialogOpen(false)}
                                            isAdmin={true}
                                        />
                                        </DialogContent>
                                    </Dialog>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isVacanciesLoading ? (
                                        <div className="flex justify-center items-center p-8">
                                            <Loader className="h-6 w-6 animate-spin text-primary" />
                                            <p className="ml-3 text-muted-foreground">Loading vacancies...</p>
                                        </div>
                                    ) : (
                                        <VacancyTable vacancies={vacancies || []} onEdit={openVacancyEditDialog} onDelete={openVacancyDeleteDialog} onVerifyToggle={handleVacancyVerifyToggle} onTierToggle={handleVacancyTierToggle} />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                        <TabsContent value="payments" className="mt-4">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-3">
                                        <CreditCard className="h-6 w-6" />
                                        <div>
                                            <CardTitle>Payment Management</CardTitle>
                                            <CardDescription>View and manage all transactions.</CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isPaymentsLoading || isUsersLoading ? (
                                         <div className="flex justify-center items-center p-8">
                                            <Loader className="h-6 w-6 animate-spin text-primary" />
                                            <p className="ml-3 text-muted-foreground">Loading payments...</p>
                                        </div>
                                    ) : (
                                        <PaymentTable payments={payments || []} users={usersData || []} />
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </TabsContent>
                <TabsContent value="settings" className="mt-4 space-y-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Key className="h-6 w-6" />
                                <div>
                                    <CardTitle>Manage API Keys</CardTitle>
                                    <CardDescription>Manage public-facing API keys and view instructions for secret keys.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                             <div>
                                <Label htmlFor="public-api-key">Public API Key / App ID (e.g., Cashfree)</Label>
                                <Input
                                    id="public-api-key"
                                    value={publicApiKey}
                                    onChange={(e) => setPublicApiKey(e.target.value)}
                                    className="mt-1"
                                    placeholder="Enter public-facing key"
                                />
                                <p className="text-xs text-muted-foreground mt-1">This key will be used for client-side operations where needed.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <CreditCard className="h-6 w-6" />
                                <div>
                                    <CardTitle>Manage Payment Method</CardTitle>
                                    <CardDescription>Globally enable or disable payments and choose the method for expert activation.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                             <div className="space-y-6">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div>
                                        <Label htmlFor="payments-enabled">Payments Enabled</Label>
                                        <p className="text-sm text-muted-foreground">Turn all payment functionalities on or off.</p>
                                    </div>
                                    <Switch id="payments-enabled" checked={isPaymentsEnabled} onCheckedChange={setIsPaymentsEnabled} />
                                </div>
                                <RadioGroup value={paymentMethod} onValueChange={(value: 'API' | 'Link') => setPaymentMethod(value)} disabled={!isPaymentsEnabled}>
                                    <Label>Payment Method</Label>
                                    <div className="flex items-center space-x-2 mt-2">
                                        <RadioGroupItem value="API" id="api" />
                                        <Label htmlFor="api">API (Cashfree Popup)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="Link" id="link" />
                                        <Label htmlFor="link">Payment Link</Label>
                                    </div>
                                </RadioGroup>
                             </div>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Gift className="h-6 w-6" />
                                <div>
                                    <CardTitle>Referral Settings</CardTitle>
                                    <CardDescription>Configure points for successful referrals.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div>
                                <Label htmlFor="referral-points">Points Awarded per Referral</Label>
                                <div className="relative mt-1">
                                    <Input
                                        id="referral-points"
                                        type="number"
                                        value={referralRewardPoints}
                                        onChange={(e) => setReferralRewardPoints(Number(e.target.value))}
                                        className="pl-4"
                                        placeholder="e.g., 100"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">Set the number of points awarded to a user for each successful referral.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Settings className="h-6 w-6" />
                                <div>
                                    <CardTitle>Global Settings</CardTitle>
                                    <CardDescription>Control content, pricing, and payment links.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isAppConfigLoading ? (
                                <div className="flex items-center space-x-2">
                                    <Loader className="h-4 w-4 animate-spin" />
                                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2"><List className="h-5 w-5" />Homepage Categories</CardTitle>
                                            <CardDescription>Manage and reorder the categories displayed on the homepage.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                {homepageCategories.map((cat, index) => (
                                                    <div key={cat.id} className="flex items-center gap-2 p-2 border rounded-lg">
                                                        <Input 
                                                            value={cat.name} 
                                                            onChange={(e) => handleUpdateCategory(cat.id, 'name', e.target.value)}
                                                            placeholder="Category Name"
                                                            className="flex-1"
                                                        />
                                                        <Input 
                                                            value={cat.icon} 
                                                            onChange={(e) => handleUpdateCategory(cat.id, 'icon', e.target.value)}
                                                            placeholder="Lucide Icon Name"
                                                            className="flex-1"
                                                        />
                                                        <div className="flex flex-col">
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveCategory(index, 'up')} disabled={index === 0}>
                                                                <ArrowUp className="h-4 w-4" />
                                                            </Button>
                                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveCategory(index, 'down')} disabled={index === homepageCategories.length - 1}>
                                                                <ArrowDown className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Label htmlFor="new-cat-name">New Category Name</Label>
                                                    <Input id="new-cat-name" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. 'Marketing'" />
                                                </div>
                                                <div className="flex-1">
                                                    <Label htmlFor="new-cat-icon">Icon Name</Label>
                                                    <Input id="new-cat-icon" value={newCategoryIcon} onChange={(e) => setNewCategoryIcon(e.target.value)} placeholder="e.g. 'Megaphone'" />
                                                </div>
                                                <Button onClick={handleAddCategory}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2"><Building className="h-5 w-5" />Department Management</CardTitle>
                                            <CardDescription>Create and manage company departments.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                {departments.map((dep, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                                                        <p className="flex-1 text-sm">{dep}</p>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteDepartment(dep)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Label htmlFor="new-department">New Department Name</Label>
                                                    <Input id="new-department" value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="e.g., 'Human Resources'" />
                                                </div>
                                                <Button onClick={handleAddDepartment}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-lg flex items-center gap-2"><IndianRupee className="h-5 w-5" />Pricing Model Management</CardTitle>
                                            <CardDescription>Define the types of pricing experts can select (e.g., Hourly, Fixed).</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                {pricingModels.map((model, index) => (
                                                    <div key={index} className="flex items-center gap-2 p-2 border rounded-lg">
                                                        <p className="flex-1 text-sm">{model}</p>
                                                        <Button variant="ghost" size="icon" onClick={() => handleDeletePricingModel(model)}>
                                                            <Trash2 className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <div className="flex-1">
                                                    <Label htmlFor="new-pricing-model">New Pricing Model Name</Label>
                                                    <Input id="new-pricing-model" value={newPricingModel} onChange={(e) => setNewPricingModel(e.target.value)} placeholder="e.g., Per-Day" />
                                                </div>
                                                <Button onClick={handleAddPricingModel}>
                                                    <PlusCircle className="mr-2 h-4 w-4" /> Add Model
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div>
                                        <Label htmlFor="availability-location">Footer Location Text</Label>
                                        <div className="relative mt-1">
                                            <MapPinIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                            <Input
                                                id="availability-location"
                                                value={availabilityLocationText}
                                                onChange={(e) => setAvailabilityLocationText(e.target.value)}
                                                className="pl-10"
                                                placeholder="e.g., Kozhikode - Kerala"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div>
                                                <Label htmlFor="featured-limit">Featured Experts Limit</Label>
                                                <Input 
                                                    id="featured-limit"
                                                    type="number" 
                                                    value={featuredExpertsLimit}
                                                    onChange={(e) => setFeaturedExpertsLimit(Number(e.target.value))}
                                                    min="1"
                                                    max="12"
                                                    className="mt-1"
                                                />
                                            </div>
                                            <div>
                                                <Label htmlFor="verification-fee">Verification Fee (INR)</Label>
                                                <div className="relative mt-1">
                                                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                    <Input
                                                        id="verification-fee"
                                                        type="number"
                                                        value={verificationFee}
                                                        onChange={(e) => setVerificationFee(Number(e.target.value))}
                                                        className="pl-10"
                                                        placeholder="e.g., 199"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Premier Plan Prices (INR)</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input type="number" placeholder="Daily" value={premierPrices.daily || ''} onChange={e => setPremierPrices(p => ({ ...p, daily: Number(e.target.value) }))} />
                                                    <Input type="number" placeholder="Monthly" value={premierPrices.monthly || ''} onChange={e => setPremierPrices(p => ({ ...p, monthly: Number(e.target.value) }))} />
                                                    <Input type="number" placeholder="Yearly" value={premierPrices.yearly || ''} onChange={e => setPremierPrices(p => ({ ...p, yearly: Number(e.target.value) }))} />
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Super Premier Plan Prices (INR)</Label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <Input type="number" placeholder="Daily" value={superPremierPrices.daily || ''} onChange={e => setSuperPremierPrices(p => ({ ...p, daily: Number(e.target.value) }))} />
                                                    <Input type="number" placeholder="Monthly" value={superPremierPrices.monthly || ''} onChange={e => setSuperPremierPrices(p => ({ ...p, monthly: Number(e.target.value) }))} />
                                                    <Input type="number" placeholder="Yearly" value={superPremierPrices.yearly || ''} onChange={e => setSuperPremierPrices(p => ({ ...p, yearly: Number(e.target.value) }))} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <h4 className="font-medium text-sm">Static Payment Paths (Fallback)</h4>
                                        <p className="text-xs text-muted-foreground -mt-2">
                                            If the Payment Method is set to 'Payment Link', these internal app paths will be used.
                                        </p>
                                        <div>
                                            <Label htmlFor="verification-payment-link">Verification Payment Path</Label>
                                            <div className="relative mt-1 flex items-center gap-2">
                                                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="verification-payment-link"
                                                    value={verificationPaymentLink}
                                                    onChange={(e) => setVerificationPaymentLink(e.target.value)}
                                                    className="pl-10"
                                                    placeholder="/payment/verification"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="premier-payment-link">Premier Payment Path</Label>
                                            <div className="relative mt-1 flex items-center gap-2">
                                                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="premier-payment-link"
                                                    value={premierPaymentLink}
                                                    onChange={(e) => setPremierPaymentLink(e.target.value)}
                                                    className="pl-10"
                                                    placeholder="/payment/premier"
                                                />
                                            </div>
                                        </div>
                                         <div>
                                            <Label htmlFor="super-premier-payment-link">Super Premier Payment Path</Label>
                                            <div className="relative mt-1 flex items-center gap-2">
                                                <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                                <Input
                                                    id="super-premier-payment-link"
                                                    value={superPremierPaymentLink}
                                                    onChange={(e) => setSuperPremierPaymentLink(e.target.value)}
                                                    className="pl-10"
                                                    placeholder="/payment/super-premier"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                        <div className="flex items-center gap-3">
                            <Megaphone className="h-6 w-6" />
                            <div>
                            <CardTitle>Announcement Banner</CardTitle>
                            <CardDescription>Display a scrolling banner at the top of the site.</CardDescription>
                            </div>
                        </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                            <Switch id="announcement-enabled" checked={isAnnouncementEnabled} onCheckedChange={setIsAnnouncementEnabled} />
                            <Label htmlFor="announcement-enabled">Enable Announcement Banner</Label>
                        </div>
                        <div>
                                <Label htmlFor="announcement-text">Announcement Text</Label>
                                <Input
                                    id="announcement-text"
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    placeholder="e.g. 🎉 New features just launched!"
                                    disabled={!isAnnouncementEnabled}
                                />
                            </div>
                            <div>
                                <Label htmlFor="announcement-speed">Scroll Speed: {announcementSpeed}s</Label>
                                <Slider
                                    id="announcement-speed"
                                    min={5}
                                    max={60}
                                    step={1}
                                    value={[announcementSpeed]}
                                    onValueChange={(value) => setAnnouncementSpeed(value[0])}
                                    disabled={!isAnnouncementEnabled}
                                />
                                <p className="text-xs text-muted-foreground">Higher value means slower scroll speed.</p>
                            </div>
                        </CardContent>
                    </Card>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                            {isSavingSettings ? (
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save All Settings
                        </Button>
                    </div>
                </TabsContent>
                <TabsContent value="data" className="mt-4 space-y-8">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Users className="h-6 w-6" />
                                <div>
                                    <CardTitle>Expert User Management</CardTitle>
                                    <CardDescription>Bulk import and export expert users using a CSV template.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className='flex-1'>
                                    <h4 className="font-semibold text-sm">Export Users as CSV</h4>
                                    <p className="text-xs text-muted-foreground mb-2">Download a CSV template with all current expert users. Use this file for bulk updates.</p>
                                    <Button onClick={handleExportUsersCsv} disabled={!usersData || usersData.length === 0} className="w-full">
                                        <Download className="mr-2 h-4 w-4" />
                                        Export Users (CSV)
                                    </Button>
                                </div>
                                <div className='flex-1'>
                                    <h4 className="font-semibold text-sm">Import Users from CSV</h4>
                                    <p className="text-xs text-muted-foreground mb-2">Upload a CSV file to bulk create or update users. Matches based on 'id' or 'email'.</p>
                                    <div className="relative">
                                        <Button asChild variant="outline" className="w-full" disabled={isImporting}>
                                            <label htmlFor="import-users-csv">
                                                {isImporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                                {isImporting ? 'Importing...' : 'Select CSV to Import'}
                                            </label>
                                        </Button>
                                        <Input id="import-users-csv" type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept=".csv" onChange={handleImportUsersCsv} disabled={isImporting} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <HardDriveDownload className="h-6 w-6" />
                                <div>
                                    <CardTitle>Full Application Backup</CardTitle>
                                    <CardDescription>Export all application data (users, vacancies, etc.) as a single JSON file.</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                           <Button onClick={handleExportData} disabled={isExporting} className="w-full">
                                {isExporting ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                                {isExporting ? 'Exporting...' : 'Export All Data (JSON)'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
          </main>
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user account
              for <span className="font-bold">{selectedUser?.firstName} {selectedUser?.lastName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
       <AlertDialog open={isVacancyDeleteDialogOpen} onOpenChange={setIsVacancyDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Vacancy?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the vacancy &quot;{selectedVacancy?.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteVacancy} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isVacancyEditDialogOpen} onOpenChange={setIsVacancyEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Vacancy</DialogTitle>
            <DialogDescription>Update the details for this job opening.</DialogDescription>
          </DialogHeader>
          {selectedVacancy && (
            <PostVacancyForm
              vacancy={selectedVacancy}
              onSuccess={() => {
                setIsVacancyEditDialogOpen(false);
                setSelectedVacancy(null);
              }}
              isAdmin={true}
            />
          )}
        </DialogContent>
      </Dialog>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Expert Profile</DialogTitle>
            <DialogDescription>
                Modify the profile for {selectedUser?.firstName} {selectedUser?.lastName}.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
             <EditProfileForm 
                userProfile={selectedUser}
                onSuccess={() => {
                    setIsEditDialogOpen(false);
                    setSelectedUser(null);
                }} 
            />
          )}
        </DialogContent>
      </Dialog>

    </>
  );
}
