
"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff, Phone, MessageSquare, Loader2, Sparkles } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  getAdditionalUserInfo,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  setPersistence,
  browserSessionPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';

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
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from "@/firebase";
import { Icons } from "../icons";
import { Separator } from "../ui/separator";
import { Checkbox } from "../ui/checkbox";

const emailFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
  rememberMe: z.boolean().default(false),
});

const phoneFormSchema = z.object({
  phoneNumber: z.string().min(10, { message: "Please enter a valid phone number." }),
});

const otpFormSchema = z.object({
  otp: z.string().length(6, { message: "OTP must be 6 digits." }),
});


export function LoginForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState<'email' | 'phone' | 'otp'>('email');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const [phoneNumberForSignup, setPhoneNumberForSignup] = useState('');
  
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: "", password: "", rememberMe: true },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phoneNumber: "" },
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

  // Handle Redirect Result for Google Sign-In
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
            }
        }).catch((error) => {
            if (error.code === 'auth/unauthorized-domain') {
                toast({
                    variant: "destructive",
                    title: "Security Restriction",
                    description: "This domain is not authorized. Please add it in the Firebase Console.",
                });
            } else if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Redirect auth error:", error);
            }
        });
    }
  }, [auth, firestore, toast]);
  
  useEffect(() => {
    if (view === 'phone' && auth && recaptchaContainerRef.current) {
        const verifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
            'size': 'invisible',
        });
        (window as any).recaptchaVerifier = verifier;
        return () => {
            verifier.clear();
            delete (window as any).recaptchaVerifier;
        };
    }
  }, [view, auth]);


  async function handleGoogleSignIn() {
    if (!auth || !firestore) return;
    const provider = new GoogleAuthProvider();
    try {
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        if (isMobile) {
            await signInWithRedirect(auth, provider);
        } else {
            const result = await signInWithPopup(auth, provider);
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
        }
    } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain') {
            toast({
                variant: "destructive",
                title: "Login Blocked",
                description: "This domain is not authorized in Firebase Console Settings.",
            });
        } else if (error.code !== 'auth/popup-closed-by-user') {
            toast({
                variant: "destructive",
                title: "Google Sign-In Failed",
                description: error.message,
            });
        }
    }
  }


  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    if(!auth) return;
    setIsSubmitting(true);
    try {
      const persistence = values.rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, values.email, values.password);
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onPhoneSubmit(values: z.infer<typeof phoneFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    const fullPhoneNumber = `+91${values.phoneNumber}`;
    setPhoneNumberForSignup(fullPhoneNumber);
    try {
        const verifier = (window as any).recaptchaVerifier;
        const result = await signInWithPhoneNumber(auth, fullPhoneNumber, verifier);
        setConfirmationResult(result);
        setView('otp');
        toast({
            title: "OTP Sent",
            description: `An OTP has been sent to ${fullPhoneNumber}.`,
        });
    } catch (error: any) {
        console.error("OTP send failed:", error);
        toast({
            variant: "destructive",
            title: "Failed to Send OTP",
            description: error.message || "Please check the phone number and try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  async function onOtpSubmit(values: z.infer<typeof otpFormSchema>) {
    if (!confirmationResult || !firestore) return;
    setIsSubmitting(true);
    try {
        const result = await confirmationResult.confirm(values.otp);
        const user = result.user;
        const additionalInfo = getAdditionalUserInfo(result);

        if (additionalInfo?.isNewUser) {
            const userDocRef = doc(firestore, "users", user.uid);
            
            const userData = {
                id: user.uid,
                firstName: 'New',
                lastName: 'User',
                email: null,
                phoneNumber: phoneNumberForSignup,
                role: 'Freelancer',
                verified: false,
                isAvailable: true,
                createdAt: serverTimestamp(),
            };
            setDocumentNonBlocking(userDocRef, userData, { merge: true });
            toast({
                title: "Welcome!",
                description: "Your account has been created with your phone number.",
            });
        } else {
             toast({
                title: "Signed In",
                description: "You have successfully signed in.",
            });
        }
    } catch (error: any) {
        console.error("OTP verification failed:", error);
        toast({
            variant: "destructive",
            title: "OTP Verification Failed",
            description: "The OTP you entered is incorrect. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  }

  const renderEmailForm = () => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 rounded-xl border-white/10 bg-white/5 hover:bg-white/10" onClick={handleGoogleSignIn}>
            <Icons.google className="mr-2 h-4 w-4" />
            Google
        </Button>
        <Button variant="outline" className="h-12 rounded-xl bg-[#22c55e] text-white hover:bg-[#1eb054] border-none" onClick={() => setView('phone')}>
            <Phone className="mr-2 h-4 w-4" />
            Phone
        </Button>
      </div>

       <div className="relative my-8">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/5" />
        </div>
        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest">
            <span className="bg-[#1a1c23] px-4 text-muted-foreground">
            Or continue with
            </span>
        </div>
      </div>

      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Email Address</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                      className="pl-10 h-12 bg-white/5 border-none rounded-xl font-bold"
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={emailForm.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                  <div className="flex items-center">
                      <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Password</FormLabel>
                  </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10 h-12 bg-white/5 border-none rounded-xl font-bold" />
                  </FormControl>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff /> : <Eye />}
                  </button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between py-2">
            <FormField
              control={emailForm.control}
              name="rememberMe"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-white/20"
                    />
                  </FormControl>
                  <FormLabel className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Keep me signed in
                  </FormLabel>
                </FormItem>
              )}
            />
             <Link
                href="/forgot-password"
                className="text-[10px] font-bold uppercase tracking-widest text-orange-500 hover:text-orange-400"
            >
                Forgot password?
            </Link>
          </div>


          <Button type="submit" className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-[0_10px_25px_-5px_rgba(249,115,22,0.4)] uppercase tracking-widest transition-all active:scale-95" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><LogIn className="mr-2 h-5 w-5" /> Sign In</>}
          </Button>

          <div className="mt-6 text-center text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link href="/signup/role" className="text-white hover:text-orange-500 underline underline-offset-4">
                  Register
              </Link>
          </div>
        </form>
      </Form>
    </>
  );

  const renderPhoneForm = () => (
    <Form {...phoneForm}>
        <form onSubmit={phoneForm.handleSubmit(onPhoneSubmit)} className="space-y-4">
            <FormField
                control={phoneForm.control}
                name="phoneNumber"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Mobile Number</FormLabel>
                        <div className="flex items-center gap-2">
                           <div className="relative flex-grow">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-black">+91</span>
                             <FormControl>
                                <Input type="tel" placeholder="98765 43210" {...field} className="pl-12 h-12 bg-white/5 border-none rounded-xl font-bold"/>
                             </FormControl>
                           </div>
                        </div>
                         <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full h-14 bg-[#22c55e] hover:bg-[#1eb054] text-white font-black text-lg rounded-2xl shadow-xl uppercase tracking-widest" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Activation Code'}
            </Button>
            <Button variant="link" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setView('email')}>
                Sign in with Email instead
            </Button>
        </form>
    </Form>
  );

  const renderOtpForm = () => (
     <Form {...otpForm}>
        <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} className="space-y-4">
            <FormField
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Activation Code</FormLabel>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl>
                                <Input type="text" placeholder="123456" {...field} className="pl-10 h-12 bg-white/5 border-none rounded-xl font-bold tracking-[0.5em] text-center" />
                            </FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full h-14 bg-orange-500 hover:bg-orange-600 text-white font-black text-lg rounded-2xl shadow-xl uppercase tracking-widest" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify & Continue'}
            </Button>
            <Button variant="link" className="w-full text-[10px] font-bold uppercase tracking-widest text-muted-foreground" onClick={() => setView('phone')}>
                Change phone number
            </Button>
        </form>
    </Form>
  );


  return (
    <>
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      {view === 'email' && renderEmailForm()}
      {view === 'phone' && renderPhoneForm()}
      {view === 'otp' && renderOtpForm()}
    </>
  );
}
