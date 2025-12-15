
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, LogIn, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2 } from "lucide-react";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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
import { useAuth, useUser, useFirestore } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  location: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export function RegistrationForm() {
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      location: "",
      phoneNumber: "",
    },
  });

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
        toast({
            variant: 'destructive',
            title: 'Geolocation is not supported by your browser.',
        });
        return;
    }

    setIsDetecting(true);

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await response.json();
                
                const address = data.address;
                const city = address.city || address.town || address.village || address.hamlet;
                const state = address.state;
                
                let detectedLocation = '';
                if (city && state) {
                    detectedLocation = `${city}, ${state}`;
                } else if (city) {
                    detectedLocation = city;
                }

                if (detectedLocation) {
                    form.setValue('location', detectedLocation);
                    toast({
                        title: 'Location Detected',
                        description: `Your location has been set to ${detectedLocation}.`,
                    });
                } else {
                    const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    form.setValue('location', coords);
                     toast({
                        title: 'Coordinates Set',
                        description: 'We could not find a city and state for your coordinates.',
                    });
                }
            } catch (apiError) {
                const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                form.setValue('location', coords);
                toast({
                    variant: 'destructive',
                    title: 'Could not fetch location name.',
                    description: 'Your location is set to coordinates.'
                });
            } finally {
                setIsDetecting(false);
            }
        },
        (error) => {
            setIsDetecting(false);
            toast({
                variant: 'destructive',
                title: 'Unable to retrieve your location.',
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

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      const userDocRef = doc(firestore, "users", newUser.uid);
      
      const userData = {
        id: newUser.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: "User", // Default role for new sign-ups
        location: values.location,
        phoneNumber: values.phoneNumber,
      };

      // Use non-blocking write
      setDocumentNonBlocking(userDocRef, userData, { merge: true });

      toast({
        title: "Account Created",
        description: "Your account has been successfully created. You are now logged in.",
      });

      // Redirect is handled by the useEffect
    } catch (error: any) {
      console.error("Registration failed:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = "This email address is already in use by another account.";
      }
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: errorMessage,
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="John" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Last Name</FormLabel>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Doe" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="+1 555 123 4567" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="e.g. San Francisco, CA" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                     <Button type="button" variant="outline" onClick={handleDetectLocation} disabled={isDetecting}>
                        {isDetecting ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <LocateIcon className="h-4 w-4" />
                        )}
                    </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
                <div className="flex items-center">
                    <FormLabel>Password</FormLabel>
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
          {form.formState.isSubmitting ? 'Creating Account...' : <>
            <Briefcase className="mr-2 h-4 w-4" /> Sign Up as Expert
          </>}
        </Button>

        <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="underline">
                Sign In
            </Link>
        </div>
      </form>
    </Form>
  );
}
