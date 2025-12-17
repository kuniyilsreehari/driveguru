
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
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

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(1, { message: "Password is required." }),
});

export function LoginForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  useEffect(() => {
    if (!isUserLoading && user && firestore) {
      const checkAdminAndRedirect = async () => {
        const superAdminDocRef = doc(firestore, 'roles_super_admin', user.uid);
        try {
            const superAdminDoc = await getDoc(superAdminDocRef);
            if (superAdminDoc.exists()) {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
        } catch (e) {
            console.error("Error checking for admin role, redirecting to default dashboard", e);
            router.push('/dashboard');
        }
      };

      checkAdminAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

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


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if(!auth) return;
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // The useEffect above will handle the redirect after the user state is updated.
    } catch (error: any) {
      console.error("Login failed:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      // Check for specific Firebase auth error codes
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMessage = "Invalid email or password. Please check your credentials and try again.";
      }
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: errorMessage,
      });
    }
  }

  return (
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

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
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
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                  <div className="flex items-center">
                      <FormLabel>Password</FormLabel>
                      <Link
                          href="#"
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
          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing In...' : <>
              <LogIn className="mr-2 h-4 w-4" /> Sign In
            </>}
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
}
