'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { doc, collection, serverTimestamp, orderBy, query, where } from 'firebase/firestore';
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking, useCollection } from '@/firebase';
import { Button } from '@/components/ui/button';
import { LogOut, Loader, Edit, UserCheck, XCircle, Crown, Sparkles, User as UserIcon, Check, ShieldCheck, Link as LinkIcon, Rss, Settings, Users, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { EditProfileForm } from '@/components/auth/edit-profile-form';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { PostForm } from '@/components/post-form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserList } from '@/components/user-list';

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    photoUrl?: string;
    verified?: boolean;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    isAvailable?: boolean;
    referralCode?: string;
    referralPoints?: number;
    following?: string[];
};

const postFormSchema = z.object({
  title: z.string().min(3).max(100),
  content: z.string().min(2).max(1000),
  link: z.string().url().optional().or(z.literal('')),
});

function PlanManagement({ userProfile }: { userProfile: ExpertUserProfile }) {
    const PlanCard = ({ title, icon, description, features, current, link }: any) => (
        <Card className={cn("flex flex-col h-full", current && "border-primary ring-2 ring-primary")}>
            <CardHeader className="text-center">
                <div className={cn("mx-auto w-fit rounded-full p-3 mb-2", current ? "bg-primary/10 text-primary" : "bg-secondary")}>{icon}</div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-3 text-sm">
                <ul className="space-y-2">
                    {features.map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-2"><Check className="h-4 w-4 mt-0.5 text-green-500" /><span>{f}</span></li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="pt-4">
                {current ? (
                    <Button variant="outline" disabled className="w-full"><ShieldCheck className="mr-2 h-4 w-4" /> Current Plan</Button>
                ) : (
                    <Button asChild className="w-full mt-auto">
                        <Link href={link || '#'}><ArrowUpCircle className="mr-2 h-4 w-4" /> Upgrade</Link>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );

    return (
        <div id="plan-management" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <PlanCard title="Standard" icon={<UserIcon />} description="Basic listing." features={["Public profile", "Search results"]} current={!userProfile.tier || userProfile.tier === 'Standard'} />
            <PlanCard title="Premier" icon={<Crown />} description="Enhanced visibility." features={["Priority search", "AI suggestions"]} current={userProfile.tier === 'Premier'} link="/payment/premier" />
            <PlanCard title="Super Premier" icon={<Sparkles />} description="Ultimate status." features={["Top ranking", "AI search access"]} current={userProfile.tier === 'Super Premier'} link="/payment/super-premier" />
        </div>
    );
}

function ArrowUpCircle({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>;
}

export default function ExpertDashboardPage() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  const userDocRef = useMemoFirebase(() => user ? doc(firestore, 'users', user.uid) : null, [user, firestore]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<ExpertUserProfile>(userDocRef);

  const postForm = useForm<z.infer<typeof postFormSchema>>({
    resolver: zodResolver(postFormSchema),
    defaultValues: { title: '', content: '', link: '' },
  });

  const profileCompletion = useMemo(() => {
    if (!userProfile) return 0;
    const fields = [userProfile.firstName, userProfile.photoUrl, userProfile.referralCode];
    const filled = fields.filter(f => !!f).length;
    return Math.round((filled / fields.length) * 100);
  }, [userProfile]);

  async function onPostSubmit(values: z.infer<typeof postFormSchema>) {
    if (!firestore || !user) return;
    setIsSubmittingPost(true);
    try {
      await addDocumentNonBlocking(collection(firestore, 'posts'), {
        ...values,
        authorId: user.uid,
        authorName: `${userProfile?.firstName} ${userProfile?.lastName}`,
        createdAt: serverTimestamp(),
        likes: [],
      });
      toast({ title: "Post Published!" });
      postForm.reset();
    } finally {
      setIsSubmittingPost(false);
    }
  }

  if (isUserLoading || isProfileLoading) return <div className="flex h-screen items-center justify-center"><Loader className="animate-spin" /></div>;
  if (!user || !userProfile) { router.push('/login'); return null; }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Expert Dashboard</h1>
          <Button variant="outline" onClick={() => signOut(auth!).then(() => router.push('/'))}><LogOut className="mr-2 h-4 w-4" /> Log Out</Button>
        </header>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="feed">My Feed</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
            <TabsTrigger value="plans">Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-20 w-20"><AvatarImage src={userProfile.photoUrl} /><AvatarFallback>{userProfile.firstName[0]}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <CardTitle className="text-2xl">Welcome, {userProfile.firstName}!</CardTitle>
                  <div className="flex gap-2 mt-2">
                    {userProfile.verified && <Badge className="bg-green-500"><UserCheck className="h-3 w-3 mr-1" /> Verified</Badge>}
                    <Badge variant="secondary">{userProfile.tier || 'Standard'}</Badge>
                  </div>
                </div>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit Profile</Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span>Profile Strength</span><span>{profileCompletion}%</span></div>
                  <Progress value={profileCompletion} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-sm">Referral Status</CardTitle></CardHeader>
                <CardContent className="text-center">
                  <div className="text-3xl font-bold text-primary">{userProfile.referralPoints || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Reward Points</p>
                  <Button variant="ghost" size="sm" className="mt-4 w-full" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/signup?ref=${userProfile.referralCode}`); toast({ title: "Copied!" }); }}><LinkIcon className="h-4 w-4 mr-2" /> Copy Referral Link</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Availability</CardTitle></CardHeader>
                <CardContent className="flex items-center justify-between">
                  <span className="text-sm font-medium">{userProfile.isAvailable ? 'Publicly Available' : 'Currently Hidden'}</span>
                  <Switch checked={userProfile.isAvailable} onCheckedChange={v => updateDocumentNonBlocking(userDocRef!, { isAvailable: v })} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="feed" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Publish Update</CardTitle><CardDescription>Share your recent work or news with the community.</CardDescription></CardHeader>
              <CardContent>
                <PostForm form={postForm} onSubmit={onPostSubmit} isSubmitting={isSubmittingPost} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="network" className="mt-6">
            <Card>
              <CardHeader><CardTitle>Connections</CardTitle></CardHeader>
              <CardContent>
                <UserList userIds={userProfile.following || []} emptyStateMessage="You aren't following any experts yet." />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans" className="mt-6">
            <PlanManagement userProfile={userProfile} />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>Professional Profile</DialogTitle></DialogHeader>
          <EditProfileForm userProfile={userProfile} onSuccess={() => setIsEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}