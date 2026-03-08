"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Building, Home, ArrowRight, MessageSquare, Gift } from "lucide-react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
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
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Icons } from "../icons";
import { Checkbox } from "../ui/checkbox";

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" />, description: "Offer your individual skills and services directly to clients." },
    { name: "Company", icon: <Building className="w-8 h-8" />, description: "Represent your business and manage company-wide talent." },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" />, description: "A professional authorized to work for a company." },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  state: z.string().min(1, { message: "State is required." }),
  city: z.string().min(1, { message: "City is required." }),
  pincode: z.string().min(1, { message: "Pincode is required." }),
  address: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().min(10, { message: "Phone number is required." }),
  role: z.string({ required_error: "Please select your expert type." }),
  department: z.string().optional(),
  companyName: z.string().optional(),
  referralCode: z.string().optional(),
  terms: z.boolean().default(false).refine(val => val === true, {
      message: "You must accept the terms and conditions to continue.",
  }),
}).refine(data => {
    if (data.role === 'Company' || data.role === 'Authorized Pro') {
        return !!data.companyName;
    }
    return true;
}, {
    message: "Company name is required.",
    path: ["companyName"],
}).refine(data => {
    if (data.role === 'Company' || data.role === 'Authorized Pro') {
        return !!data.address;
    }
    return true;
}, {
    message: "Address is required.",
    path: ["address"],
});

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Please enter a valid 10-digit phone number." }),
  referralCode: z.string().optional(),
  role: z.string({ required_error: "Please select your expert type." }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
}).refine(data => {
    if (data.role === 'Freelancer') {
        return !!data.firstName && !!data.lastName;
    }
    return true;
}, {
    message: "First and last name are required for Freelancers.",
    path: ["firstName"],
}).refine(data => {
    if (data.role === 'Company' || data.role === 'Authorized Pro') {
        return !!data.companyName;
    }
    return true;
}, {
    message: "Company name is required for this role.",
    path: ["companyName"],
});


const otpFormSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
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
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      state: "",
      city: "",
      pincode: "",
      address: "",
      countryCode: "+91",
      phoneNumber: "",
      companyName: "",
      department: "",
      referralCode: searchParams.get('ref') || "",
      terms: false,
    },
  });

   const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { 
        phoneNumber: "", 
        referralCode: searchParams.get('ref') || "", 
        role: "Freelancer",
        firstName: "",
        lastName: "",
        companyName: "",
    },
  });

  const otpForm = useForm<z.infer<typeof otpFormSchema>>({
    resolver: zodResolver(otpFormSchema),
    defaultValues: { otp: "" },
  });

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
            toast({
              title: "Location Fetched",
              description: "City and State have been auto-filled from your pincode.",
            });
          } else {
            toast({
              variant: "destructive",
              title: "Invalid Pincode",
              description: "Could not find location details for this pincode.",
            });
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Pincode Lookup Failed",
            description: "Could not fetch location details. Please enter manually.",
          });
        } finally {
          setIsFetchingPincode(false);
        }
      };
      fetchPincodeData();
    }
  }, [pincodeValue, form, toast]);
  
  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      toast({
        variant: 'destructive',
        title: 'Geolocation Not Supported',
        description: 'Your browser does not support geolocation.',
      });
      return;
    }

    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await response.json();
          const address = data.address;

          if (address.city || address.town || address.village) {
            form.setValue('city', address.city || address.town || address.village, { shouldValidate: true });
          }
          if (address.state) {
            form.setValue('state', address.state, { shouldValidate: true });
          }
          if (address.postcode) {
            form.setValue('pincode', address.postcode, { shouldValidate: true });
          }
          
          toast({
            title: 'Location Detected',
            description: 'Your city, state, and pincode have been filled.',
          });
        } catch (error) {
          toast({
            variant: 'destructive',
            title: 'Detection Failed',
            description: 'Could not fetch address details. Please enter manually.',
          });
        } finally {
          setIsDetectingLocation(false);
        }
      },
      (error) => {
        setIsDetectingLocation(false);
        toast({
          variant: 'destructive',
          title: 'Location Access Denied',
          description: error.message,
        });
      }
    );
  };

  useEffect(() => {
    if (!isUserLoading && user) {
        router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  async function getCoordinates(address: string): Promise<{ lat: number; lon: number } | null> {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        }
        return null;
    } catch (error) {
        console.error("Geocoding failed:", error);
        return null;
    }
  }

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  }

  async function handleGoogleSignUp() {
    if (!auth || !firestore) return;
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);

        if (additionalInfo?.isNewUser) {
            const userDocRef = doc(firestore, "users", user.uid);
            const nameParts = user.displayName?.split(' ') || [];
            const firstName = nameParts[0] || 'New';
            const lastName = nameParts.slice(1).join(' ') || 'User';

            const userData = {
                id: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                photoUrl: user.photoURL || '',
                role: 'Freelancer',
                verified: false,
                isAvailable: true,
                referralCode: generateReferralCode(),
                referralPoints: 0,
                createdAt: serverTimestamp(),
            };
            setDocumentNonBlocking(userDocRef, userData, { merge: true });
            toast({
                title: "Welcome!",
                description: "Your account has been created. Please complete your profile in the dashboard.",
            });
        } else {
            toast({
                title: "Signed In",
                description: "You have successfully signed in with Google.",
            });
        }
    } catch (error: any) {
        console.error("Google sign-in failed:", error);
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message,
        });
    }
  }

  async function getReferringUser(referralCode: string) {
    if (!firestore || !referralCode) return null;
    const usersRef = collection(firestore, 'users');
    const q = query(usersRef, where('referralCode', '==', referralCode), limit(1));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
        return querySnapshot.docs[0];
    }
    return null;
  }

  const sanitizePhone = (phoneNumber: string) => {
    const digits = phoneNumber.trim().replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    
    try {
        if (values.referralCode) {
            const referringUserDoc = await getReferringUser(values.referralCode);
            if (!referringUserDoc) {
                form.setError("referralCode", { type: "manual", message: "Invalid referral code." });
                setIsSubmitting(false);
                return;
            }
        }
        
        const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
        const newUser = userCredential.user;
        
        const fullAddress = [values.address, values.city, values.state, values.pincode].filter(Boolean).join(', ');
        const coords = await getCoordinates(fullAddress);
        
        const newUserDocRef = doc(firestore, "users", newUser.uid);
        const cleanPhone = sanitizePhone(values.phoneNumber);

        const userData: any = {
            id: newUser.uid,
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            role: values.role,
            department: values.department,
            state: values.state,
            city: values.city,
            pincode: values.pincode,
            address: values.address,
            latitude: coords?.lat || null,
            longitude: coords?.lon || null,
            phoneNumber: `+91 ${cleanPhone}`,
            companyName: values.companyName,
            verified: false,
            photoUrl: '',
            isAvailable: true,
            referralCode: generateReferralCode(),
            referralPoints: 0,
            referredByCode: values.referralCode || null,
            createdAt: serverTimestamp(),
        };

        setDocumentNonBlocking(newUserDocRef, userData);
        toast({ title: "Account Created", description: "Successfully joined DriveGuru." });

    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            form.setError("email", { type: "manual", message: "Email already registered." });
        } else if (error.name !== 'FirebaseError') {
            toast({ variant: "destructive", title: "Registration Failed", description: error.message });
        }
    } finally {
        setIsSubmitting(false);
    }
  }

   async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);

    if (values.referralCode) {
        const referringUserDoc = await getReferringUser(values.referralCode);
        if (!referringUserDoc) {
            phoneForm.setError("referralCode", { type: "manual", message: "Invalid referral code." });
            setIsSubmitting(false);
            return;
        }
    }

    const cleanPhone = sanitizePhone(values.phoneNumber);
    const fullPhoneNumber = `+91${cleanPhone}`;
    
    setPhoneSignupData({
      phoneNumber: fullPhoneNumber,
      referralCode: values.referralCode,
      role: values.role,
      firstName: values.firstName,
      lastName: values.lastName,
      companyName: values.companyName
    });

    try {
        const verifier = (window as any).recaptchaVerifier;
        await verifier.render();
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(result);
        setView('otp');
        toast({ title: "OTP Sent", description: `Sent to ${fullPhoneNumber}.` });
    } catch (error: any) {
        toast({ variant: "destructive", title: "Failed to Send OTP", description: error.message });
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
                firstName: phoneSignupData.firstName || 'New',
                lastName: phoneSignupData.lastName || 'User',
                companyName: phoneSignupData.companyName || '',
                email: null,
                phoneNumber: phoneSignupData.phoneNumber,
                role: phoneSignupData.role,
                verified: false,
                isAvailable: true,
                referralCode: generateReferralCode(),
                referredByCode: phoneSignupData.referralCode || null,
                referralPoints: 0,
                createdAt: serverTimestamp(),
            };
            await setDocumentNonBlocking(userDocRef, userData, { merge: true });
            toast({ title: "Welcome!", description: "Account created successfully." });
        } else {
             toast({ title: "Signed In", description: "Phone number already registered." });
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "OTP Failed", description: "Incorrect OTP code." });
    } finally {
        setIsSubmitting(false);
    }
  }


  const renderEmailForm = () => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onEmailSubmit)} className="space-y-4">
        
        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Sign up with</span></div>
        </div>

        <div className="grid grid-cols-2 gap-2">
            <Button onClick={handleGoogleSignUp} type="button"><Icons.google className="mr-2 h-4 w-4" />Google</Button>
             <Button onClick={() => setView('phone')} type="button" className="bg-green-600 text-white hover:bg-green-700 transition-transform hover:scale-[1.02] active:scale-[0.98]"><Phone className="mr-2 h-4 w-4" />Phone</Button>
        </div>


        <div className="relative my-4">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Or email details</span></div>
        </div>
        
        <FormField
          control={form.control}
          name="referralCode"
          render={({ field }) => (
              <FormItem>
                  <FormLabel>Referral Code (Optional)</FormLabel>
                  <div className="relative">
                      <Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl><Input placeholder="Enter a referral code" {...field} className="pl-10" disabled={!!searchParams.get('ref')} /></FormControl>
                  </div>
                  <FormMessage />
              </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
                <FormItem>
                <FormLabel>First Name</FormLabel>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input placeholder="John" {...field} className="pl-10" /></FormControl>
                </div>
                <FormMessage />
                </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
                <FormItem>
                <FormLabel>Last Name</FormLabel>
                <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input placeholder="Doe" {...field} className="pl-10" /></FormControl>
                </div>
                <FormMessage />
                </FormItem>
            )} />
        </div>

        <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input type="email" placeholder="name@example.com" {...field} className="pl-10" /></FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )} />
        
        <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl><Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10" /></FormControl>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )} />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Professional Role</FormLabel>
              <FormControl>
                  <div className="grid grid-cols-1 gap-4">
                      {expertTypes.map((type) => (
                          <Card 
                              key={type.name} 
                              className={cn("cursor-pointer transition-all hover:-translate-y-1", field.value === type.name ? "border-primary ring-2 ring-primary" : "hover:border-primary/50")}
                              onClick={() => form.setValue('role', type.name, { shouldValidate: true })}
                          >
                              <CardHeader className="flex flex-row items-center gap-4 p-4">
                                  <div className={cn("p-3 rounded-full", field.value === type.name ? "bg-primary/10 text-primary" : "bg-secondary text-secondary-foreground")}>{type.icon}</div>
                                  <div><CardTitle className="text-lg">{type.name}</CardTitle><CardDescription className="text-xs">{type.description}</CardDescription></div>
                                  <ArrowRight className={cn("ml-auto h-5 w-5 text-muted-foreground transition-transform", field.value === type.name && "translate-x-1")}/>
                              </CardHeader>
                          </Card>
                      ))}
                  </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {selectedRole && (
            <div className="space-y-4">
              <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <div className="flex items-center gap-2">
                      <FormField control={form.control} name="countryCode" render={({ field: codeField }) => (
                          <Select onValueChange={codeField.onChange} defaultValue={codeField.value}><FormControl><SelectTrigger className="w-[80px]"><SelectValue placeholder="Code" /></SelectTrigger></FormControl><SelectContent><SelectItem value="+91">IN</SelectItem><SelectItem value="+1">USA</SelectItem><SelectItem value="+44">UK</SelectItem></SelectContent></Select>
                      )} />
                      <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                          <div className="relative flex-grow"><FormControl><Input placeholder="9876543210" {...field} /></FormControl></div>
                      )} />
                  </div>
                  <FormMessage />
              </FormItem>
              <div className="space-y-2">
                  <div className="flex items-center justify-between mb-2">
                      <FormLabel>Location</FormLabel>
                      <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation}>{isDetectingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateIcon className="mr-2 h-4 w-4" />}Detect</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      <FormField control={form.control} name="city" render={({ field }) => (<FormItem><FormControl><Input placeholder="City" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="state" render={({ field }) => (<FormItem><FormControl><Input placeholder="State" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
                  <FormField control={form.control} name="pincode" render={({ field }) => (
                    <FormItem className="mt-2 text-center"><div className="relative"><FormControl><Input placeholder="Pincode" {...field} /></FormControl>{isFetchingPincode && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}</div><FormMessage /></FormItem>
                  )} />
              </div>

              {(selectedRole === 'Company' || selectedRole === 'Authorized Pro') && (
                <div className="space-y-4">
                  <FormField control={form.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><div className="relative"><Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input placeholder="Company name" {...field} className="pl-10" /></FormControl></div><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="department" render={({ field }) => (<FormItem><FormLabel>Department</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger></FormControl><SelectContent>{departments.map(dep => <SelectItem key={dep} value={dep}>{dep}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><div className="relative"><Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><FormControl><Textarea placeholder="Full address" {...field} className="pl-10" /></FormControl></div><FormMessage /></FormItem>)} />
                </div>
              )}
                
                <FormField control={form.control} name="terms" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange}/></FormControl><div className="space-y-1 leading-none"><FormLabel>Agree to <Link href="/terms" target="_blank" className="underline text-primary">Terms & Conditions</Link></FormLabel><FormMessage /></div></FormItem>
                  )} />

                <Button type="submit" className="w-full h-12 bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-lg" disabled={form.formState.isSubmitting || isSubmitting}>
                    {form.formState.isSubmitting || isSubmitting ? 'Processing...' : <><Briefcase className="mr-2 h-4 w-4" /> Create Expert Profile</>}
                </Button>
            </div>
        )}

        <div className="mt-4 text-center text-sm">Already have an account? <Link href="/login" className="underline">Sign In</Link></div>
      </form>
    </Form>
  );

  const renderPhoneForm = () => (
    <Form {...phoneForm}>
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
            <FormField control={phoneForm.control} name="phoneNumber" render={({ field }) => (
                    <FormItem><FormLabel>Mobile Number</FormLabel><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span><FormControl><Input type="tel" placeholder="9876543210" {...field} className="pl-10"/></FormControl></div><FormMessage /></FormItem>
                )} />
            <FormField control={phoneForm.control} name="referralCode" render={({ field }) => (
                  <FormItem><FormLabel>Referral Code (Optional)</FormLabel><div className="relative"><Gift className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input placeholder="Referral code" {...field} className="pl-10" disabled={!!searchParams.get('ref')} /></FormControl></div><FormMessage /></FormItem>
              )} />
            <FormField control={phoneForm.control} name="role" render={({ field }) => (
                <FormItem><FormLabel>Role</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger></FormControl><SelectContent>{expertTypes.map(t => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
            {selectedPhoneRole === 'Freelancer' && (
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={phoneForm.control} name="firstName" render={({ field }) => (<FormItem><FormLabel>First Name</FormLabel><FormControl><Input placeholder="John" {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={phoneForm.control} name="lastName" render={({ field }) => (<FormItem><FormLabel>Last Name</FormLabel><FormControl><Input placeholder="Doe" {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
            )}
            {(selectedPhoneRole === 'Company' || selectedPhoneRole === 'Authorized Pro') && (
                 <FormField control={phoneForm.control} name="companyName" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input placeholder="Company" {...field} /></FormControl><FormMessage /></FormItem>)} />
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Sending...' : 'Send OTP'}</Button>
            <Button variant="link" className="w-full" onClick={() => setView('email')}>Email Sign Up</Button>
        </form>
    </Form>
  );

  const renderOtpForm = () => (
     <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <FormField control={otpForm.control} name="otp" render={({ field }) => (
                    <FormItem><FormLabel>Enter OTP</FormLabel><div className="relative"><MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><FormControl><Input type="text" placeholder="123456" {...field} className="pl-10" /></FormControl></div><FormMessage /></FormItem>
                )} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? 'Verifying...' : 'Verify & Sign Up'}</Button>
            <Button variant="link" className="w-full" onClick={() => setView('phone')}>Change phone number</Button>
        </form>
    </Form>
  );


  return (
    <div className="w-full">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      {view === 'email' && renderEmailForm()}
      {view === 'phone' && renderPhoneForm()}
      {view === 'otp' && renderOtpForm()}
    </div>
  );
}