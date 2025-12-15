
"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User as UserIcon, Mail, MapPin, Phone, LocateIcon, Loader2, Wrench, Building, Smartphone, Laptop, Briefcase, IndianRupee, Calendar, Book, School, GraduationCap, Info } from "lucide-react";
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
import { useFirestore } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icons } from "../icons";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

const categories = [
    { name: "MEDICAL HELP", icon: <Icons.medical className="w-8 h-8" /> },
    { name: "ELECTRICAL SERVICE", icon: <Wrench className="w-8 h-8" /> },
    { name: "SECURITY GUARDS", icon: <Building className="w-8 h-8" /> },
    { name: "MOBILE PHONE SERVICE", icon: <Smartphone className="w-8 h-8" /> },
    { name: "LAPTOP SERVICE", icon: <Laptop className="w-8 h-8" /> },
];

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" /> },
    { name: "Company", icon: <Building className="w-8 h-8" /> },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" /> },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  location: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  category: z.string({ required_error: "Please select a category." }),
  role: z.string({ required_error: "Please select your expert type." }),
  companyName: z.string().optional(),
  hourlyRate: z.coerce.number().min(0, "Hourly rate cannot be negative.").optional(),
  yearsOfExperience: z.coerce.number().min(0, "Years of experience cannot be negative.").optional(),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  collegeName: z.string().optional(),
  skills: z.string().optional(),
  aboutMe: z.string().optional(),
});

type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    location?: string;
    phoneNumber?: string;
    category?: string;
    companyName?: string;
    hourlyRate?: number;
    yearsOfExperience?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
};

interface EditProfileFormProps {
    userProfile: ExpertUserProfile;
    onSuccess: () => void;
}

export function EditProfileForm({ userProfile, onSuccess }: EditProfileFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isDetecting, setIsDetecting] = useState(false);

  const extractPhoneNumberParts = (fullNumber?: string) => {
    if (!fullNumber) return { countryCode: "+91", phoneNumber: "" };

    const parts = fullNumber.split(' ');
    if (parts.length > 1 && parts[0].startsWith('+')) {
      const countryCode = parts[0];
      const phoneNumber = parts.slice(1).join(' ');
      if (['+91', '+1', '+44'].includes(countryCode)) {
        return { countryCode, phoneNumber };
      }
    }
    
    // Fallback if format is unexpected
    return { countryCode: "+91", phoneNumber: fullNumber };
  }

  const { countryCode, phoneNumber } = extractPhoneNumberParts(userProfile.phoneNumber);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      location: userProfile.location || "",
      countryCode: countryCode,
      phoneNumber: phoneNumber,
      category: userProfile.category || "",
      role: userProfile.role || "",
      companyName: userProfile.companyName || "",
      hourlyRate: userProfile.hourlyRate || 0,
      yearsOfExperience: userProfile.yearsOfExperience || 0,
      gender: userProfile.gender || "",
      qualification: userProfile.qualification || "",
      collegeName: userProfile.collegeName || "",
      skills: userProfile.skills || "",
      aboutMe: userProfile.aboutMe || "",
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

                let detectedLocation = '';
                if (city && state) {
                    detectedLocation = `${city}, ${state}`;
                } else if (city) {
                    detectedLocation = city;
                }

                if (detectedLocation) {
                    form.setValue('location', detectedLocation, { shouldValidate: true });
                    toast({
                        title: 'Location Detected',
                        description: `Your location has been set to ${detectedLocation}.`,
                    });
                } else {
                    const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                    form.setValue('location', coords, { shouldValidate: true });
                     toast({
                        title: 'Coordinates Set',
                        description: 'We could not find a city and state for your coordinates.',
                    });
                }
            } catch (apiError) {
                const coords = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
                form.setValue('location', coords, { shouldValidate: true });
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

  function onSubmit(values: z.infer<typeof formSchema>) {
    const userDocRef = doc(firestore, "users", userProfile.id);
    
    const updatedData = {
      ...values,
      phoneNumber: values.countryCode && values.phoneNumber ? `${values.countryCode} ${values.phoneNumber}` : "",
    };

    updateDocumentNonBlocking(userDocRef, updatedData);

    toast({
      title: "Profile Updated",
      description: "Your information has been successfully saved.",
    });

    onSuccess();
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
        
        <div className="grid grid-cols-2 gap-4">
            <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <div className="flex items-center gap-2">
                    <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <FormField
                    control={form.control}
                    name="phoneNumber"
                    render={({ field }) => (
                        <div className="relative flex-grow">
                            <FormControl>
                                <Input placeholder="555 123 4567" {...field} />
                            </FormControl>
                        </div>
                    )}
                    />
                </div>
                <FormMessage />
            </FormItem>
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
                     <Button type="button" variant="outline" size="icon" onClick={handleDetectLocation} disabled={isDetecting}>
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

        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="hourlyRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hourly Rate (INR)</FormLabel>
                  <div className="relative">
                    <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="500" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="yearsOfExperience"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Years of Experience</FormLabel>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" placeholder="5" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        <FormField
          control={form.control}
          name="gender"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select your gender" />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                        <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                </Select>
                <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Qualification</FormLabel>
                  <div className="relative">
                    <GraduationCap className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g. B.Tech in CS" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="collegeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>College Name (Optional)</FormLabel>
                  <div className="relative">
                    <School className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g. IIT Bombay" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="skills"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills</FormLabel>
              <div className="relative">
                <Book className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. React, Node.js, Firestore" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="aboutMe"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About Me</FormLabel>
              <div className="relative">
                <Info className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Textarea placeholder="Tell us a little bit about yourself" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-center">
                        {categories.map((category) => (
                            <div 
                                key={category.name} 
                                className={cn(
                                    "p-2 border rounded-lg flex flex-col items-center justify-center space-y-1 cursor-pointer transition-colors",
                                    field.value === category.name 
                                        ? "bg-accent/20 border-primary" 
                                        : "hover:bg-accent/10 hover:border-accent"
                                )}
                                onClick={() => form.setValue('category', category.name, { shouldValidate: true })}
                            >
                                {category.icon}
                                <span className="text-xs font-semibold">{category.name}</span>
                            </div>
                        ))}
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
          )}
        />

        <FormItem>
            <FormLabel>Email</FormLabel>
            <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                    <Input
                        type="email"
                        value={userProfile.email}
                        disabled
                        className="pl-10"
                    />
                </FormControl>
            </div>
        </FormItem>
        
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
}
