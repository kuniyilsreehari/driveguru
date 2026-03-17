
"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Building, Home, ArrowRight, MessageSquare, Gift, Sparkles, CheckCircle2 } from "lucide-react";
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

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" />, description: "Individual skills and services." },
    { name: "Company", icon: <Building className="w-8 h-8" />, description: "Business and talent management." },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" />, description: "Representing an organization." },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(8, { message: "Password must be 8+ characters." }),
  state: z.string().min(1, { message: "State required." }),
  city: z.string().min(1, { message: "City required." }),
  pincode: z.string().min(1, { message: "Pincode required." }),
  address: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "10-digit number required." }),
  role: z.string({ required_error: "Role is required." }),
  department: z.string().optional(),
  companyName: z.string().optional(),
  referralCode: z.string().optional(),
  terms: z.boolean().default(false).refine(val => val === true, {
      message: "Accept terms to continue.",
  }),
});

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Enter 10-digit number." }),
  referralCode: z.string().optional(),
  role: z.string({ required_error: "Role is required." }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, { message: "Enter 6-digit OTP." }),
});

type AppConfig = {
    departments?: string[];
};

type PhoneSignupData = {
    phoneNumber: string;
    referralCode?: string;
    role: string;
    firstName?: string;
    lastName?: string;
    companyName?: string;
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
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);

  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);
  const departments = appConfig?.departments || [];

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "", lastName: "", email: "", password: "",
      state: "", city: "", pincode: "", address: "",
      countryCode: "+91", phoneNumber: "", companyName: "", department: "",
      referralCode: searchParams.get('ref') || "",
      terms: false,
    },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { 
        phoneNumber: "", referralCode: searchParams.get('ref') || "", 
        role: "Freelancer", firstName: "", lastName: "", companyName: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: "" },
  });

  // Handle Redirect Result for Google Sign-Up
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
                        referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
                        referralPoints: 0,
                        createdAt: serverTimestamp(),
                    };
                    setDocumentNonBlocking(userDocRef, userData, { merge: true });
                }
                toast({ title: "Welcome to DriveGuru!", description: "Account created successfully." });
            }
        }).catch((error) => {
            if (error.code === 'auth/unauthorized-domain') {
                toast({
                    variant: "destructive",
                    title: "Domain Not Authorized",
                    description: "Please add 'driveguru.in' to Authorized Domains in Firebase console settings.",
                });
            } else if (error.code !== 'auth/popup-closed-by-user') {
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

  const selectedRole = form.watch("role");
  const selectedPhoneRole = phoneForm.watch("role");
  const pincodeValue = form.watch("pincode");

  useEffect(() => {
    if (pincodeValue && pincodeValue.length === 6) {
      const fetchPincodeData = async () => {
        setIsFetchingPincode(true);
        try {
          const response = await fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`);
          const data = await response.json();
          if (data && data[0] && data[0].Status === 'Success') {
            const postOffice = data[0].PostOffice[0];
            form.setValue('city', postOffice.District, { shouldValidate: true });
            form.setValue('state', postOffice.State, { shouldValidate: true });
          }
        } finally {
          setIsFetchingPincode(false);
        }
      };
      fetchPincodeData();
    }
  }, [pincodeValue, form]);
  
  const handleDetectLocation = () => {
    if (!navigator.geolocation) return;
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.address;
          if (address.city || address.town) form.setValue('city', address.city || address.town, { shouldValidate: true });
          if (address.state) form.setValue('state', address.state, { shouldValidate: true });
          if (address.postcode) form.setValue('pincode', address.postcode, { shouldValidate: true });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => setIsDetectingLocation(false)
    );
  };

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
                    referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(), referralPoints: 0,
                    createdAt: serverTimestamp(),
                }, { merge: true });
            }
        }
    } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain') {
            toast({ variant: "destructive", title: "Domain Error", description: "Add 'driveguru.in' to Firebase Authorized Domains." });
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
            phoneNumber: `${values.countryCode} ${values.phoneNumber.replace(/\D/g, '').slice(-10)}`,
            verified: false, isAvailable: true,
            referralCode: Math.random().toString(36).substring(2, 10).toUpperCase(),
            referralPoints: 0, createdAt: serverTimestamp(),
        };
        delete (userData as any).password;
        await setDocumentNonBlocking(newUserDocRef, userData);
        toast({ title: "Account Active", description: "Welcome to the expert registry." });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Registration Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      <div className="mb-10 text-center sm:text-left">
        <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-2">Register</h2>
        <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest text-[10px]">Create Expert Profile</p>
      </div>

      {view === 'email' && (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
                <Button onClick={handleGoogleSignUp} type="button" variant="outline" className="h-14 rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 font-bold"><Icons.google className="mr-2 h-5 w-5" />Google</Button>
                <Button onClick={() => setView('phone')} type="button" className="bg-[#22c55e] text-white hover:bg-[#1eb054] rounded-2xl h-14 font-bold border-none"><Phone className="mr-2 h-5 w-5" />Phone</Button>
            </div>

            <div className="relative my-8">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/5" /></div>
                <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]"><span className="bg-[#24262d] px-4 text-muted-foreground">Detailed Signup</span></div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-5">
                    <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Account Type</FormLabel>
                            <div className="grid grid-cols-1 gap-3">
                                {expertTypes.map((type) => (
                                    <Card key={type.name} className={cn("cursor-pointer transition-all border-none bg-[#1a1c23] rounded-2xl shadow-inner", field.value === type.name ? "ring-2 ring-orange-500 bg-orange-500/5" : "hover:bg-white/5")} onClick={() => form.setValue('role', type.name, { shouldValidate: true })}>
                                        <CardHeader className="flex flex-row items-center gap-4 p-4">
                                            <div className={cn("p-2 rounded-full", field.value === type.name ? "bg-orange-500 text-white" : "bg-white/5 text-muted-foreground")}>{React.cloneElement(type.icon as React.ReactElement, { className: "w-5 h-5" })}</div>
                                            <div className="flex-1"><CardTitle className="text-xs font-black uppercase italic">{type.name}</CardTitle></div>
                                            {field.value === type.name && <CheckCircle2 className="h-5 w-5 text-orange-500" />}
                                        </CardHeader>
                                    </Card>
                                ))}
                            </div>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField control={form.control} name="firstName" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">First Name</FormLabel>
                            <FormControl><Input placeholder="John" {...field} className="h-12 bg-[#1a1c23] border-none rounded-xl font-bold text-white shadow-inner" /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="lastName" render={({ field }) => (
                            <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Last Name</FormLabel>
                            <FormControl><Input placeholder="Doe" {...field} className="h-12 bg-[#1a1c23] border-none rounded-xl font-bold text-white shadow-inner" /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <FormField control={form.control} name="email" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Email Address</FormLabel>
                        <FormControl><Input type="email" placeholder="name@example.com" {...field} className="h-12 bg-[#1a1c23] border-none rounded-xl font-bold text-white shadow-inner" /></FormControl><FormMessage /></FormItem>
                    )} />

                    <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem><FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Password</FormLabel>
                        <div className="relative"><FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="h-12 bg-[#1a1c23] border-none rounded-xl font-bold text-white shadow-inner" /></FormControl>
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                        </div><FormMessage /></FormItem>
                    )} />

                    <div className="pt-4 space-y-4">
                        <FormField control={form.control} name="terms" render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-2xl bg-[#1a1c23] p-4 shadow-inner">
                                <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="border-white/20 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"/></FormControl>
                                <div className="space-y-1"><FormLabel className="text-[10px] font-black uppercase tracking-widest">Agree to <Link href="/terms" target="_blank" className="underline text-orange-500">Terms & Policies</Link></FormLabel></div>
                            </FormItem>
                        )} />

                        <Button type="submit" className="w-full h-16 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg shadow-[0_15px_35px_-5px_rgba(249,115,22,0.4)] rounded-2xl uppercase tracking-widest transition-all active:scale-95" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : <><Sparkles className="mr-2 h-6 w-6" /> COMPLETE SIGNUP</>}
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      )}
    </div>
  );
}
