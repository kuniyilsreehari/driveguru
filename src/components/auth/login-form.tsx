
"use client";

import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff, Phone, MessageSquare } from "lucide-react";
import { 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  getAdditionalUserInfo,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp } from 'firebase/firestore';

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

const emailFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
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
    defaultValues: { email: "", password: "" },
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
  
  useEffect(() => {
    if (view === 'phone' && auth && recaptchaContainerRef.current) {
        if (!(window as any).recaptchaVerifier) {
            (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
                'size': 'invisible',
                'callback': (response: any) => {
                    // reCAPTCHA solved, allow signInWithPhoneNumber.
                }
            });
        }
    }
  }, [view, auth]);


  async function handleGoogleSignIn() {
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
                createdAt: serverTimestamp(),
            };
            setDocumentNonBlocking(userDocRef, userData, { merge: true });
            toast({
                title: "Welcome!",
                description: "Your account has been created. Please complete your profile.",
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


  async function onEmailSubmit(values: z.infer<typeof emailFormSchema>) {
    if(!auth) return;
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // The useEffect above will handle the redirect after the user state is updated.
    } catch (error: any) {
      console.error("Login failed:", error);
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
    setPhoneNumberForSignup(fullPhoneNumber); // Save for potential new user profile
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
                email: null, // No email with phone signup
                phoneNumber: phoneNumberForSignup,
                role: 'Freelancer',
                verified: false,
                isAvailable: true,
                createdAt: serverTimestamp(),
            };
            await setDocumentNonBlocking(userDocRef, userData, { merge: true });
            toast({
                title: "Welcome!",
                description: "Your account has been created with your phone number. Please complete your profile in the dashboard.",
            });
        } else {
             toast({
                title: "Signed In",
                description: "You have successfully signed in.",
            });
        }
        // Redirect is handled by the main useEffect
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
      <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
        <Icons.google className="mr-2 h-4 w-4" />
        Sign in with Google
      </Button>

       <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
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
                <FormLabel>Email</FormLabel>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      {...field}
                      className="pl-10"
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
                      <FormLabel>Password</FormLabel>
                      <Link
                          href="/forgot-password"
                          className="ml-auto inline-block text-sm underline"
                      >
                          Forgot password?
                      </Link>
                  </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input type={showPassword ? "text" : "password"} placeholder="••••••••" {...field} className="pl-10 pr-10" />
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'Signing In...' : <>
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </>}
          </Button>

           <Button variant="outline" className="w-full bg-green-600 text-white hover:bg-green-700 transition-transform duration-150 ease-in-out hover:scale-[1.02] active:scale-[0.98]" onClick={() => setView('phone')}>
                <Phone className="mr-2 h-4 w-4" />
                Sign in with Phone
            </Button>

          <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup/role" className="underline">
                  Sign up
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
                        <FormLabel>Mobile Number</FormLabel>
                        <div className="flex items-center gap-2">
                           <div className="relative flex-grow">
                             <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">+91</span>
                             <FormControl>
                                <Input type="tel" placeholder="98765 43210" {...field} className="pl-10"/>
                             </FormControl>
                           </div>
                        </div>
                         <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send OTP'}
            </Button>
            <Button variant="link" className="w-full" onClick={() => setView('email')}>
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
                        <FormLabel>Enter OTP</FormLabel>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <FormControl>
                                <Input type="text" placeholder="123456" {...field} className="pl-10" />
                            </FormControl>
                        </div>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Verifying...' : 'Verify OTP & Sign In'}
            </Button>
            <Button variant="link" className="w-full" onClick={() => setView('phone')}>
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
