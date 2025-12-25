

"use client";

import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Building, Home, ArrowRight, MessageSquare, Gift, PenSquare, Factory, Shield, Save, Linkedin, Github, Globe, Twitter, Type, List } from "lucide-react";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo, RecaptchaVerifier, signInWithPhoneNumber, EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as UiDialogDescription,
} from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { Card, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Icons } from "../icons";
import { Checkbox } from "../ui/checkbox";
import { generateAboutMe } from "@/ai/flows/generate-about-me-flow";
import { suggestSkills } from "@/ai/flows/suggest-skills-flow";
import { updateUserPhoto } from "@/ai/flows/update-profile-photo-flow";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Upload } from "lucide-react";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import Link from "next/link";
import { DialogFooter } from "../ui/dialog";
import { IndianRupee, Calendar, GraduationCap, School, Book, Info, Pen, Factory as FactoryIcon, Sparkles } from "lucide-react";
import type { HomepageCategory } from "@/app/admin/page";

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" />, description: "Offer your individual skills and services directly to clients." },
    { name: "Company", icon: <Building className="w-8 h-8" />, description: "Represent your business and manage company-wide talent." },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" />, description: "A professional authorized to work for a company." },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  photoUrl: z.string().optional().or(z.literal('')),
  photoDataUri: z.string().optional(), // For holding the new image data
  state: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  address: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  showPhoneNumberOnProfile: z.boolean().default(true),
  role: z.string({ required_error: "Please select your expert type." }),
  department: z.string().optional(),
  companyName: z.string().optional(),
  businessDescription: z.string().optional(),
  category: z.string().optional(),
  pricingModel: z.string().optional(),
  pricingValue: z.coerce.number().min(0, "Price value cannot be negative.").optional(),
  yearsOfExperience: z.coerce.number().min(0, "Years of experience cannot be negative.").optional(),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  collegeName: z.string().optional(),
  skills: z.string().optional(),
  aboutMe: z.string().optional(),
  aboutYourDream: z.string().optional(),
  associatedProjectsName: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

const linkEmailSchema = z.object({
  newEmail: z.string().email({ message: "Please enter a valid email." }),
  newPassword: z.string().min(8, { message: "Password must be at least 8 characters." }),
});


type ExpertUserProfile = {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    role: string;
    photoUrl?: string;
    state?: string;
    city?: string;
    pincode?: string;
    address?: string;
    phoneNumber?: string;
    showPhoneNumberOnProfile?: boolean;
    companyName?: string;
    department?: string;
    businessDescription?: string;
    category?: string;
    pricingModel?: string;
    pricingValue?: number;
    yearsOfExperience?: number;
    gender?: string;
    qualification?: string;
    collegeName?: string;
    skills?: string;
    aboutMe?: string;
    aboutYourDream?: string;
    associatedProjectsName?: string;
    linkedinUrl?: string;
    twitterUrl?: string;
    githubUrl?: string;
    portfolioUrl?: string;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
};

type AppConfig = {
    homepageCategories?: HomepageCategory[];
    departments?: string[];
    pricingModels?: string[];
};

interface EditProfileFormProps {
    userProfile: ExpertUserProfile;
    onSuccess: () => void;
}

export function EditProfileForm({ userProfile, onSuccess }: EditProfileFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const [isGeneratingAboutMe, setIsGeneratingAboutMe] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isFetchingPincode, setIsFetchingPincode] = useState(false);
  const [isPremiumDialogOpen, setIsPremiumDialogOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const appConfigDocRef = useMemoFirebase(() => {
    if (!firestore) return null;
    return doc(firestore, 'app_config', 'homepage');
  }, [firestore]);
  
  const { data: appConfig } = useDoc<AppConfig>(appConfigDocRef);
  const homepageCategories = appConfig?.homepageCategories || [];
  const departments = appConfig?.departments || [];
  const pricingModels = appConfig?.pricingModels || [];


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
      photoUrl: userProfile.photoUrl || "",
      photoDataUri: "",
      state: userProfile.state || "",
      city: userProfile.city || "",
      pincode: userProfile.pincode || "",
      address: userProfile.address || "",
      countryCode: countryCode,
      phoneNumber: phoneNumber,
      showPhoneNumberOnProfile: userProfile.showPhoneNumberOnProfile === undefined ? true : userProfile.showPhoneNumberOnProfile,
      role: userProfile.role || "",
      department: userProfile.department || "",
      companyName: userProfile.companyName || "",
      businessDescription: userProfile.businessDescription || "",
      category: userProfile.category || "",
      pricingModel: userProfile.pricingModel || "",
      pricingValue: userProfile.pricingValue || 0,
      yearsOfExperience: userProfile.yearsOfExperience || 0,
      gender: userProfile.gender || "",
      qualification: userProfile.qualification || "",
      collegeName: userProfile.collegeName || "",
      skills: userProfile.skills || "",
      aboutMe: userProfile.aboutMe || "",
      aboutYourDream: userProfile.aboutYourDream || "",
      associatedProjectsName: userProfile.associatedProjectsName || "",
      linkedinUrl: userProfile.linkedinUrl || "",
      twitterUrl: userProfile.twitterUrl || "",
      githubUrl: userProfile.githubUrl || "",
      portfolioUrl: userProfile.portfolioUrl || "",
    },
  });

  const linkForm = useForm<z.infer<typeof linkEmailSchema>>({
    resolver: zodResolver(linkEmailSchema),
    defaultValues: {
      newEmail: "",
      newPassword: "",
    },
  });


  const selectedRole = form.watch("role");
  const photoUrl = form.watch("photoUrl");
  const photoDataUri = form.watch("photoDataUri");
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

  const handleGenerateAboutMe = async () => {
    const isPremium = userProfile.tier === 'Premier' || userProfile.tier === 'Super Premier';
    if (!isPremium) {
        setIsPremiumDialogOpen(true);
        return;
    }

    setIsGeneratingAboutMe(true);
    try {
      const formData = form.getValues();
      const result = await generateAboutMe({
        firstName: formData.firstName,
        role: formData.role,
        skills: formData.skills || '',
        yearsOfExperience: formData.yearsOfExperience || 0,
        qualification: formData.qualification || '',
      });

      if (result?.aboutMe) {
          form.setValue('aboutMe', result.aboutMe, { shouldValidate: true });
          toast({
              title: "AI Generated Bio",
              description: "Your 'About Me' has been populated. Feel free to edit it.",
          });
      }
    } catch (error) {
        console.error("Failed to generate 'About Me'", error);
        toast({
            variant: "destructive",
            title: "Generation Failed",
            description: "Could not generate the 'About Me' text. Please try again.",
        });
    } finally {
        setIsGeneratingAboutMe(false);
    }
  };

  const handleSuggestSkills = async () => {
    const isPremium = userProfile.tier === 'Premier' || userProfile.tier === 'Super Premier';
    if (!isPremium) {
        setIsPremiumDialogOpen(true);
        return;
    }
    
    setIsSuggestingSkills(true);
    try {
        const formData = form.getValues();
        const result = await suggestSkills({
            role: formData.role,
            qualification: formData.qualification || '',
            existingSkills: formData.skills || '',
        });
        if (result.suggestedSkills) {
            const currentSkills = formData.skills ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : [];
            const newSkills = result.suggestedSkills.split(',').map(s => s.trim()).filter(s => s && !currentSkills.includes(s));
            
            if(newSkills.length > 0) {
              const updatedSkills = [...currentSkills, ...newSkills].join(', ');
              form.setValue('skills', updatedSkills, { shouldValidate: true });
              toast({
                  title: "AI Skill Suggestions",
                  description: "New skills have been added to your profile.",
              });
            } else {
               toast({
                  title: "AI Skill Suggestions",
                  description: "No new skills were suggested, or suggestions already exist.",
              });
            }
        }
    } catch (error) {
        console.error("Failed to suggest skills", error);
        toast({
            variant: "destructive",
            title: "Suggestion Failed",
            description: "Could not suggest new skills. Please try again.",
        });
    } finally {
        setIsSuggestingSkills(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        form.setValue('photoDataUri', dataUrl, { shouldValidate: true });
        form.setValue('photoUrl', dataUrl, { shouldValidate: true }); // Also update photoUrl for instant preview
        toast({
            title: "Image Ready",
            description: "Your new profile picture is ready. Click 'Save Changes' to apply it.",
        });
        setIsUploading(false);
      };
      reader.onerror = () => {
        setIsUploading(false);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Could not read the image file.",
        });
      };
      reader.readAsDataURL(file);
    }
  };


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;

    try {
        let finalPhotoUrl = values.photoUrl;

        // If a new photo was uploaded, process it through the flow
        if (values.photoDataUri) {
            const photoResult = await updateUserPhoto({
                userId: userProfile.id,
                photoDataUri: values.photoDataUri,
            });
            finalPhotoUrl = photoResult.photoUrl;
        }

        const userDocRef = doc(firestore, "users", userProfile.id);
        
        const { photoDataUri, ...restOfValues } = values;

        const updatedData = {
          ...restOfValues,
          photoUrl: finalPhotoUrl,
          phoneNumber: values.countryCode && values.phoneNumber ? `${values.countryCode} ${values.phoneNumber}` : "",
        };

        await updateDocumentNonBlocking(userDocRef, updatedData);

        toast({
          title: "Profile Updated",
          description: "Your information has been successfully saved.",
        });

        onSuccess();
    } catch (error) {
        console.error("Profile update failed:", error);
         if (error.name !== 'FirebaseError') {
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: "Could not save profile. Please try again.",
            });
        }
    }
  }

  const handleLinkEmail = async (values: z.infer<typeof linkEmailSchema>) => {
    if (!auth || !user) return;

    setIsLinking(true);
    try {
      const credential = EmailAuthProvider.credential(values.newEmail, values.newPassword);
      await linkWithCredential(user, credential);
      
      // Also update the Firestore document
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userDocRef, { email: values.newEmail });
      
      toast({
        title: "Email Linked",
        description: "Your email and password have been successfully added to your account.",
      });
      onSuccess(); // Close the dialog
    } catch (error: any) {
      console.error("Email linking failed:", error);
      let description = "An unexpected error occurred. Please try again.";
      if (error.code === 'auth/email-already-in-use') {
        description = "This email address is already associated with another account.";
      } else if (error.code === 'auth/credential-already-in-use') {
        description = "This email is already linked to an account.";
      }
      toast({
        variant: "destructive",
        title: "Linking Failed",
        description,
      });
    } finally {
      setIsLinking(false);
    }
  };


  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  return (
    <>
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          
          <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 text-3xl">
                <AvatarImage src={photoUrl} />
                <AvatarFallback>{getInitials(form.getValues('firstName'), form.getValues('lastName'))}</AvatarFallback>
              </Avatar>
              <div className="flex-grow">
                  <FormLabel>Profile Photo</FormLabel>
                  <div className="flex items-center gap-2 mt-2">
                      <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          {isUploading ? 'Processing...' : 'Upload Image'}
                      </Button>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF.</p>
                      <FormControl>
                          <Input 
                              type="file"
                              className="hidden"
                              ref={fileInputRef}
                              onChange={handleImageUpload}
                              accept="image/png, image/jpeg, image/gif"
                          />
                      </FormControl>
                  </div>
              </div>
          </div>

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
            <>
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
              <FormField
                control={form.control}
                name="businessDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Business Description</FormLabel>
                    <div className="relative">
                      <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="e.g., We build amazing web apps." {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {departments.map((dep) => (
                            <SelectItem key={dep} value={dep}>{dep}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address & Building Details</FormLabel>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <FormControl>
                        <Textarea placeholder="Enter the full company address" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

            <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>Service Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a primary category" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {homepageCategories.map(cat => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FormDescription>This helps clients find you in the right category.</FormDescription>
                        <FormMessage />
                    </FormItem>
                )}
            />

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
          
          <div className="grid grid-cols-1 gap-4">
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
                name="showPhoneNumberOnProfile"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Show phone number on profile</FormLabel>
                      <FormDescription>
                        Allow clients to see your phone number on your public profile card.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <div>
                <div className="flex items-center justify-between mb-2">
                  <FormLabel>Location</FormLabel>
                  <Button type="button" variant="outline" size="sm" onClick={handleDetectLocation} disabled={isDetectingLocation}>
                    {isDetectingLocation ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LocateIcon className="mr-2 h-4 w-4" />
                    )}
                    Detect
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>District / City</FormLabel>
                          <FormControl><Input placeholder="e.g., Kozhikode / Mumbai" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl><Input placeholder="e.g. Kerala" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <FormField
                  control={form.control}
                  name="pincode"
                  render={({ field }) => (
                    <FormItem className="mt-2 text-center">
                      <div className="relative">
                        <FormControl><Input placeholder="Pincode" {...field} /></FormControl>
                        {isFetchingPincode && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}
                      </div>
                      <FormLabel className="text-xs text-muted-foreground">Pincode</FormLabel>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="pricingModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pricing Model</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a pricing model" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {pricingModels.map((model) => (
                            <SelectItem key={model} value={model}>{model}</SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pricingValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (INR)</FormLabel>
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
          </div>
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
                <div className="flex items-center justify-between">
                  <FormLabel>Skills</FormLabel>
                  <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleSuggestSkills}
                      disabled={isSuggestingSkills}
                  >
                      {isSuggestingSkills ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Suggest with AI
                  </Button>
                </div>
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
                <div className="flex items-center justify-between">
                  <FormLabel>About Me</FormLabel>
                  <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={handleGenerateAboutMe}
                      disabled={isGeneratingAboutMe}
                  >
                      {isGeneratingAboutMe ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                          <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Generate with AI
                  </Button>
                </div>
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
            name="aboutYourDream"
            render={({ field }) => (
              <FormItem>
                <FormLabel>About Your Dream</FormLabel>
                <div className="relative">
                  <PenSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <FormControl>
                    <Textarea placeholder="Describe your professional dreams and aspirations..." {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="associatedProjectsName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Associated Projects Name</FormLabel>
                <div className="relative">
                  <FactoryIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <FormControl>
                    <Input placeholder="List names of projects you've worked on" {...field} className="pl-10" />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Separator />
          
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Social Profiles</h3>
            <FormField
              control={form.control}
              name="linkedinUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn</FormLabel>
                  <div className="relative">
                    <Linkedin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://linkedin.com/in/yourprofile" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="twitterUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Twitter / X</FormLabel>
                  <div className="relative">
                    <Twitter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://x.com/yourprofile" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="githubUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GitHub</FormLabel>
                  <div className="relative">
                    <Github className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://github.com/yourprofile" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="portfolioUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Portfolio/Website</FormLabel>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://yourwebsite.com" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>


          <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </form>
      </Form>

      <Separator className="my-6" />

      {!userProfile.email && (
        <Card>
          <CardHeader>
            <CardTitle>Account Security</CardTitle>
            <CardDescription>Link an email and password to your account for easier login and better security.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...linkForm}>
              <form onSubmit={linkForm.handleSubmit(handleLinkEmail)} className="space-y-4">
                <FormField
                  control={linkForm.control}
                  name="newEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Email</FormLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input type="email" placeholder="new.email@example.com" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <FormField
                  control={linkForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} className="pl-10" />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                 <Button type="submit" className="w-full" disabled={isLinking}>
                    <Shield className="mr-2 h-4 w-4" />
                    {isLinking ? 'Linking...' : 'Link Email & Password'}
                  </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}


    </div>
    <Dialog open={isPremiumDialogOpen} onOpenChange={setIsPremiumDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Premium Feature Locked</DialogTitle>
          <UiDialogDescription>
            AI-powered suggestions are only available for Premier and Super Premier members.
          </UiDialogDescription>
        </DialogHeader>
        <div className="text-center">
            <div className="mx-auto w-fit rounded-full p-3 mb-2 bg-primary/10">
              <Lock className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Upgrade your plan to unlock this and many other powerful features to enhance your profile and attract more clients.
            </p>
        </div>
        <DialogFooter className="flex-col gap-2 pt-4">
            <Button asChild className="w-full">
                <Link href="/dashboard#plan-management">Upgrade Your Plan</Link>
            </Button>
            <Button variant="outline" className="w-full" onClick={() => setIsPremiumDialogOpen(false)}>
                Maybe Later
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
