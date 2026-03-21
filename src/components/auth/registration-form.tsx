"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Building, Home, ArrowRight, MessageSquare, Gift, Sparkles, CheckCircle2, Send, ChevronLeft } from "lucide-react";
import { 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo, 
  RecaptchaVerifier, 
  signInWithPhoneNumber 
} from 'firebase/auth';
import { doc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Icons } from "../icons";
import { Checkbox } from "../ui/checkbox";
import { processReferral } from "@/ai/flows/process-referral-flow";

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" />, description: "Individual skills and services." },
    { name: "Company", icon: <Building className="w-8 h-8" />, description: "Business and talent management." },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" />, description: "Organization expert." },
]

const generateReferralCode = () => Math.random().toString(36).substring(2, 10).toUpperCase();

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be 8+ characters." }),
  state: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "10-digit number required." }),
  role: z.string({ required_error: "Role is required." }),
  department: z.string().optional(),
  companyName: z.string().optional(),
  usedReferralCode: z.string().optional(),
  terms: z.boolean().default(false).refine(val => val === true, {
      message: "Accept terms to continue.",
  }),
});

const phoneFormSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  phoneNumber: z.string().min(10, { message: "Enter 10-digit number." }),
  role: z.string({ required_error: "Role is required." }),
  companyName: z.string().optional(),
  usedReferralCode: z.string().optional(),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, { message: "Enter 6-digit OTP." }),
});

type PhoneSignupData = {
    phoneNumber: string;
    role: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    usedReferralCode?: string;
}

export function RegistrationForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'email' | 'phone' | 'otp'>('email');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [phoneSignupData, setPhoneSignupData] = useState<PhoneSignupData | null>(null);

  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", password: "",
      state: "", city: "", pincode: "", address: "",
      countryCode: "+91", phoneNumber: "", companyName: "", department: "",
      usedReferralCode: searchParams.get('ref') || "",
      terms: false,
      role: "Freelancer",
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { 
        phoneNumber: "", usedReferralCode: searchParams.get('ref') || "", 
        role: "Freelancer", firstName: "", lastName: "", companyName: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (auth && firestore) {
        getRedirectResult(auth).then(async (result) => {
            if (result) {
                const additionalInfo = getAdditionalUserInfo(result);
                if (additionalInfo?.isNewUser) {
                    const userDocRef = doc(firestore, "users", result.user.uid);
                    const nameParts = result.user.displayName?.split(' ') || [];
                    const userData = {
                        id: result.user.uid,
                        firstName: nameParts[0] || 'New',
                        lastName: nameParts.slice(1).join(' ') || 'User',
                        email: result.user.email,
                        photoUrl: result.user.photoURL || '',
                        role: 'Freelancer',
                        verified: false,
                        isAvailable: true,
                        referralCode: generateReferralCode(),
                        referralPoints: 0,
                        referralCount: 0,
                        createdAt: serverTimestamp(),
                    };
                    await setDocumentNonBlocking(userDocRef, userData, { merge: true });
                }
                toast({ title: "Welcome!", description: "Account created successfully." });
            }
        }).catch((error) => {
            if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Auth redirect error:", error);
            }
        });
    }
  }, [auth, firestore, toast]);

  useEffect(() => {
    if (view === 'phone' && auth && recaptchaContainerRef.current) {
        if (!(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
            });
        }
    }
  }, [view, auth]);

  async function handleGoogleSignUp() {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    try {
        if (isMobile) {
            await signInWithRedirect(auth, provider);
        } else {
            const result = await signInWithPopup(auth, provider);
            if (getAdditionalUserInfo(result)?.isNewUser) {
                const userDocRef = doc(firestore!, "users", result.user.uid);
                const nameParts = result.user.displayName?.split(' ') || [];
                setDocumentNonBlocking(userDocRef, {
                    id: result.user.uid, firstName: nameParts[0] || 'New', lastName: nameParts.slice(1).join(' ') || 'User',
                    email: result.user.email, role: 'Freelancer', verified: false, isAvailable: true,
                    referralCode: generateReferralCode(), referralPoints: 0, referralCount: 0,
                    createdAt: serverTimestamp(),
                }, { merge: true });
            }
        }
    } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    }
  }

  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUserDocRef = doc(firestore, "users", userCredential.user.uid);
        const userData = {
            ...values,
            phoneNumber: `+91 ${values.phoneNumber.replace(/\D/g, '').slice(-10)}`,
            verified: false, isAvailable: true,
            referralCode: generateReferralCode(),
            referralPoints: 0,
            referralCount: 0,
            referredByCode: values.usedReferralCode || null,
            createdAt: serverTimestamp(),
        };
        delete (userData as any).password;
        delete (userData as any).usedReferralCode;
        
        await setDocumentNonBlocking(newUserDocRef, userData);
        
        if (values.usedReferralCode) {
            await processReferral({ newUserUid: userCredential.user.uid, referralCode: values.usedReferralCode });
        }

        toast({ title: "Account Active", description: "Welcome to DriveGuru." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    const fullPhoneNumber = `+91${values.phoneNumber.replace(/\D/g, '').slice(-10)}`;
    setPhoneSignupData({
        phoneNumber: fullPhoneNumber,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role,
        companyName: values.companyName,
        usedReferralCode: values.usedReferralCode,
    });

    try {
        const verifier = (window as any).recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(result);
        setView('otp');
        toast({ title: "OTP Sent", description: `Verification code sent to ${fullPhoneNumber}` });
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Failed to Send OTP",
            description: error.message,
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    if (!confirmationResult || !firestore || !phoneSignupData) return;
    setIsSubmitting(true);
    try {
        const result = await confirmationResult.confirm(values.otp);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);

        if (additionalInfo?.isNewUser) {
            const userDocRef = doc(firestore, "users", user.uid);
            const userData = {
                id: user.uid,
                firstName: phoneSignupData.firstName,
                lastName: phoneSignupData.lastName,
                email: null,
                phoneNumber: phoneSignupData.phoneNumber,
                role: phoneSignupData.role,
                companyName: phoneSignupData.companyName || '',
                verified: false,
                isAvailable: true,
                referralCode: generateReferralCode(),
                referralPoints: 0,
                referralCount: 0,
                referredByCode: phoneSignupData.usedReferralCode || null,
                createdAt: serverTimestamp(),
            };
            await setDocumentNonBlocking(userDocRef, userData);

            if (phoneSignupData.usedReferralCode) {
                await processReferral({ newUserUid: user.uid, referralCode: phoneSignupData.usedReferralCode });
            }
        }
        toast({ title: "Registration Complete", description: "Identity verified successfully." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Invalid OTP", description: "Please check the code and try again." });
    } finally {
        setIsSubmitting(false);
    }
  }

  const selectedRole = form.watch("role");
  const selectedPhoneRole = phoneForm.watch("role");

  const inputClass = "h-14 bg-background border-none rounded-2xl font-bold text-foreground shadow-inner focus-visible:ring-2 focus-visible:ring-orange-500 transition-all";
  const labelClass = "text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 mb-1.5 block";

  return (
    <div className="w-full">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-foreground mb-2">Register</h2>
        <p className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-orange-500">CREATE EXPERT PROFILE</p>
      </div>

      {view === 'email' && (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleGoogleSignUp} type="button" variant="outline" className="h-14 rounded-2xl border-border bg-background hover:bg-muted font-bold"><Icons.google className="mr-2 h-5 w-5" />Google</Button>
                <Button onClick={() => setView('phone')} type="button" className="bg-[#22c55e] text-white hover:bg-[#1eb054] rounded-2xl h-14 font-bold border-none shadow-lg shadow-[#22c55e]/20"><Phone className="mr-2 h-5 w-5" />Phone</Button>
            </div>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]"><span className="bg-card px-4 text-muted-foreground">Or Secure Details</span></div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-6">
                    <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={labelClass}>Account Type</FormLabel>
                            <div className="grid grid-cols-1 gap-3">
                                {expertTypes.map((type) => (
                                    <Card key={type.name} className={cn("cursor-pointer transition-all border-none bg-background rounded-2xl shadow-inner", field.value === type.name ? "ring-2 ring-orange-500 bg-orange-500/5" : "hover:bg-muted/50")} onClick={() => form.setValue('role', type.name, { shouldValidate: true })}>
                                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                                            <div className={cn("p-2.5 rounded-full shadow-sm", field.value === type.name ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground")}>{React.cloneElement(type.icon as React.ReactElement, { className: "w-5 h-5" })}</div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm font-black uppercase italic truncate">{type.name}</CardTitle>
                                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter truncate">{type.description}</p>
                                            </div>
                                            {field.value === type.name && <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />}
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>First Name</FormLabel>
                                <FormControl><Input placeholder="John" {...field} className={inputClass} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Last Name</FormLabel>
                                <FormControl><Input placeholder="Doe" {...field} className={inputClass} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={labelClass}>Email Address</FormLabel>
                            <FormControl><Input type="email" placeholder="name@example.com" {...field} className={inputClass} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={labelClass}>Password</FormLabel>
                            <div className="relative">
                                <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className={inputClass} /></FormControl>
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={labelClass}>Mobile Number</FormLabel>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-orange-500/50">+91</span>
                                <FormControl><Input type="tel" placeholder="98765 43210" {...field} className={cn(inputClass, "pl-14")} /></FormControl>
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="pt-2 space-y-6">
                        <FormField control={form.control} name="usedReferralCode" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Referral Code (Optional)</FormLabel>
                                <div className="relative">
                                    <Gift className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-500/30" />
                                    <FormControl><Input placeholder="e.g. 5GTYZ4BI" {...field} className={cn(inputClass, "pl-12 font-mono text-orange-500")} /></FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="terms" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-2xl bg-background p-4 shadow-inner border border-border/50">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-border data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/></FormControl>
                                <div className="space-y-1">
                                    <FormLabel className="text-[10px] font-black uppercase tracking-widest leading-none">
                                        Agree to <Link href="/terms" target="_blank" className="underline text-orange-500 hover:text-orange-400">Terms & Policies</Link>
                                    </FormLabel>
                                </div>
                            </FormItem>
                        )} />

                        <Button type="submit" className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] rounded-2xl uppercase tracking-widest transition-all active:scale-95 mt-4" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Sparkles className="mr-2 h-6 w-6" /> COMPLETE SIGNUP</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      )}

      {view === 'phone' && (
        <div className="space-y-6">
            <Button onClick={() => setView('email')} variant="ghost" className="p-0 text-muted-foreground hover:text-foreground mb-4 font-black uppercase text-[10px] tracking-widest">
                <ChevronLeft className="mr-1 h-4 w-4" /> Back to Email
            </Button>
            
            <Form {...phoneForm}>
                <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-6">
                    <FormField control={phoneForm.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel className={labelClass}>Account Type</FormLabel>
                            <div className="grid grid-cols-1 gap-3">
                                {expertTypes.map((type) => (
                                    <Card key={type.name} className={cn("cursor-pointer transition-all border-none bg-background rounded-2xl shadow-inner", field.value === type.name ? "ring-2 ring-orange-500 bg-orange-500/5" : "hover:bg-muted/50")} onClick={() => phoneForm.setValue('role', type.name, { shouldValidate: true })}>
                                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                                            <div className={cn("p-2.5 rounded-full shadow-sm", field.value === type.name ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground")}>{React.cloneElement(type.icon as React.ReactElement, { className: "w-5 h-5" })}</div>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className="text-sm font-black uppercase italic truncate">{type.name}</CardTitle>
                                                <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter truncate">{type.description}</p>
                                            </div>
                                            {field.value === type.name && <CheckCircle2 className="h-5 w-5 text-orange-500 shrink-0" />}
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={phoneForm.control} name="firstName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelClass}>First Name</FormLabel>
                                    <FormControl><Input placeholder="John" {...field} className={inputClass} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={phoneForm.control} name="lastName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelClass}>Last Name</FormLabel>
                                    <FormControl><Input placeholder="Doe" {...field} className={inputClass} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        {(selectedPhoneRole === 'Company' || selectedPhoneRole === 'Authorized Pro') && (
                            <FormField control={phoneForm.control} name="companyName" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelClass}>Organization Name</FormLabel>
                                    <div className="relative">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                        <FormControl><Input placeholder="Acme Corp" {...field} className={cn(inputClass, "pl-12")} /></FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        )}

                        <FormField control={phoneForm.control} name="phoneNumber" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Mobile Number</FormLabel>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-orange-500/50">+91</span>
                                    <FormControl><Input type="tel" placeholder="98765 43210" {...field} className={cn(inputClass, "pl-14 text-lg")} /></FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={phoneForm.control} name="usedReferralCode" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelClass}>Referral Code (Optional)</FormLabel>
                                <div className="relative">
                                    <Gift className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-orange-500/30" />
                                    <FormControl><Input placeholder="e.g. 5GTYZ4BI" {...field} className={cn(inputClass, "pl-12 font-mono text-orange-500")} /></FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </div>

                    <Button type="submit" className="w-full h-16 bg-[#22c55e] hover:bg-[#1eb054] text-white font-black text-lg rounded-2xl shadow-xl shadow-[#22c55e]/20 uppercase tracking-widest transition-all active:scale-95" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Send className="mr-2 h-5 w-5" /> SEND ACTIVATION CODE</>}
                    </Button>
                </form>
            </Form>
        </div>
      )}

      {view === 'otp' && (
         <Form {...otpForm}>
            <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-8 text-center animate-in fade-in zoom-in-95 duration-500">
                <div className="space-y-2">
                    <h3 className="text-xl font-black uppercase italic text-foreground">Enter Security Code</h3>
                    <p className="text-xs text-muted-foreground font-medium">We sent a 6-digit verification code to your device.</p>
                </div>
                
                <FormField
                    control={otpForm.control}
                    name="otp"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Input type="text" placeholder="000000" {...field} className="h-20 bg-background border-none rounded-[1.5rem] font-black tracking-[0.8em] text-center text-3xl text-orange-500 shadow-inner" maxLength={6} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="space-y-4 pt-4">
                    <Button type="submit" className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] uppercase tracking-widest transition-all active:scale-95" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'VERIFY & REGISTER'}
                    </Button>
                    <Button variant="link" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground" onClick={() => setView('phone')} type="button">
                        Change phone number?
                    </Button>
                </div>
            </form>
        </Form>
      )}
    </div>
  );
}
