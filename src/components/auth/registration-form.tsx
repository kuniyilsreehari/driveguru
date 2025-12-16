
"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User as UserIcon, Mail, Lock, LogIn, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Wrench, Building, Smartphone, Laptop, type LucideIcon } from "lucide-react";
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';

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
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "@/components/icons";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as LucideIcons from 'lucide-react';

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" /> },
    { name: "Company", icon: <Building className="w-8 h-8" /> },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" /> },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters." }),
  location: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().min(1, { message: "Phone number is required." }),
  role: z.string({ required_error: "Please select your expert type." }),
  companyName: z.string().optional(),
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
      countryCode: "+91",
      phoneNumber: "",
      companyName: "",
    },
  });

  const selectedRole = form.watch("role");

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
                const pincode = address.postcode;

                let detectedLocationParts = [];
                if (state) detectedLocationParts.push(state);
                if (city) detectedLocationParts.push(city);
                if (pincode) detectedLocationParts.push(pincode);

                const detectedLocation = detectedLocationParts.join(', ');

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
    if (!auth || !firestore) {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: "Firebase services are not available.",
      });
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const newUser = userCredential.user;

      const userDocRef = doc(firestore, "users", newUser.uid);
      
      const userData = {
        id: newUser.uid,
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        role: values.role,
        location: values.location,
        phoneNumber: values.countryCode && values.phoneNumber ? `${values.countryCode} ${values.phoneNumber}` : "",
        companyName: values.companyName,
        verified: false, // Default verified status to false
        photoUrl: '', // Default photoUrl to empty string
        isAvailable: true, // Default to available
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
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Are you an individual or representing a company?</FormLabel>
                <FormControl>
                    <div className="grid grid-cols-3 gap-2 text-center">
                        {expertTypes.map((type) => (
                            <div 
                                key={type.name} 
                                className={cn(
                                    "p-2 border rounded-lg flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors h-24",
                                    field.value === type.name 
                                        ? "bg-accent/20 border-primary" 
                                        : "hover:bg-accent/10 hover:border-accent"
                                )}
                                onClick={() => form.setValue('role', type.name, { shouldValidate: true })}
                            >
                                {type.icon}
                                <span className="text-xs font-semibold">{type.name}</span>
                            </div>
                        ))}
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />
        {(selectedRole === 'Company' || selectedRole === 'Authorized Pro') && (
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="Your Company Inc." {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>First Name</FormLabel>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                    <UserIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <div className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name="countryCode"
                    render={({ field: countryCodeField }) => (
                      <Select
                        onValueChange={countryCodeField.onChange}
                        defaultValue={countryCodeField.value}
                      >
                        <FormControl>
                          <SelectTrigger className="w-[80px]">
                            <SelectValue placeholder="Code" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="+91">IN</SelectItem>
                          <SelectItem value="+1">USA</SelectItem>
                          <SelectItem value="+44">UK</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <div className="relative flex-grow">
                    <FormControl>
                      <Input placeholder="555 123 4567" {...field} />
                    </FormControl>
                  </div>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="State, City, Pincode" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="button" variant="outline" className="w-full" onClick={handleDetectLocation} disabled={isDetecting}>
                {isDetecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                    <LocateIcon className="mr-2 h-4 w-4" />
                )}
                Detect My Location
            </Button>
          </div>
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
