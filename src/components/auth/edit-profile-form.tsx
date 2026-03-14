
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User as UserIcon, Mail, Lock, Eye, EyeOff, Briefcase, MapPin, Phone, LocateIcon, Loader2, Building, Home, ArrowRight, MessageSquare, Gift, PenSquare, Factory, Shield, Save, Linkedin, Github, Globe, Twitter, Type, List, Youtube, Image as ImageIcon, Upload, X } from "lucide-react";
import { EmailAuthProvider, linkWithCredential } from 'firebase/auth';
import { doc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from "firebase/storage";

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
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "../ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Icons } from "../icons";
import { generateAboutMe } from "@/ai/flows/generate-about-me-flow";
import { suggestSkills } from "@/ai/flows/suggest-skills-flow";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Separator } from "../ui/separator";
import { Switch } from "../ui/switch";
import Link from "next/link";
import { DialogFooter } from "../ui/dialog";
import { IndianRupee, GraduationCap, School, Book, Info, Pen, Factory as FactoryIcon, Sparkles } from "lucide-react";
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
  photoUrl2: z.string().optional().or(z.literal('')),
  photoUrl3: z.string().optional().or(z.literal('')),
  photoUrl4: z.string().optional().or(z.literal('')),
  photoUrl5: z.string().optional().or(z.literal('')),
  photoUrl6: z.string().optional().or(z.literal('')),
  photoUrl7: z.string().optional().or(z.literal('')),
  photoUrl8: z.string().optional().or(z.literal('')),
  photoUrl9: z.string().optional().or(z.literal('')),
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
  profession: z.string().optional(),
  pricingModel: z.string().optional(),
  pricingValue: z.coerce.number().min(0, "Price value cannot be negative.").optional(),
  experienceYears: z.coerce.number().optional(),
  experienceMonths: z.coerce.number().optional(),
  gender: z.string().optional(),
  qualification: z.string().optional(),
  collegeName: z.string().optional(),
  skills: z.string().optional(),
  aboutMe: z.string().optional(),
  aboutYourDream: z.string().optional(),
  associatedProjectsName: z.string().optional(),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  facebookUrl: z.string().url().optional().or(z.literal('')),
  instagramUrl: z.string().url().optional().or(z.literal('')),
  youtubeUrl: z.string().url().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  twitterUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
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
    photoUrl2?: string;
    photoUrl3?: string;
    photoUrl4?: string;
    photoUrl5?: string;
    photoUrl6?: string;
    photoUrl7?: string;
    photoUrl8?: string;
    photoUrl9?: string;
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
    profession?: string;
    pricingModel?: string;
    pricingValue?: number;
    experienceYears?: number;
    experienceMonths?: number;
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
    facebookUrl?: string;
    instagramUrl?: string;
    youtubeUrl?: string;
    tier?: 'Standard' | 'Premier' | 'Super Premier';
    following?: string[];
};

type AppConfig = {
    homepageCategories?: HomepageCategory[];
    departments?: string[];
    pricingModels?: string[];
};

interface EditProfileFormProps {
    userProfile: ExpertUserProfile;
    onSuccess: () => void;
    isAdmin?: boolean;
}

export function EditProfileForm({ userProfile, onSuccess, isAdmin = false }: EditProfileFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user } = useUser();
  const [isGeneratingAboutMe, setIsGeneratingAboutMe] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null);
  
  const fileInputRefs = React.useRef<(HTMLInputElement | null)[]>([]);
  
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

  const tier = userProfile.tier || 'Standard';
  const photoSlots = tier === 'Super Premier' ? 9 : tier === 'Premier' ? 6 : 3;

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
    return { countryCode: "+91", phoneNumber: fullNumber };
  }

  const { countryCode, phoneNumber } = extractPhoneNumberParts(userProfile.phoneNumber);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: userProfile.firstName || "",
      lastName: userProfile.lastName || "",
      photoUrl: userProfile.photoUrl || "",
      photoUrl2: userProfile.photoUrl2 || "",
      photoUrl3: userProfile.photoUrl3 || "",
      photoUrl4: userProfile.photoUrl4 || "",
      photoUrl5: userProfile.photoUrl5 || "",
      photoUrl6: userProfile.photoUrl6 || "",
      photoUrl7: userProfile.photoUrl7 || "",
      photoUrl8: userProfile.photoUrl8 || "",
      photoUrl9: userProfile.photoUrl9 || "",
      state: userProfile.state || "",
      city: userProfile.city || "",
      pincode: userProfile.pincode || "",
      address: userProfile.address || "",
      countryCode: countryCode,
      phoneNumber: phoneNumber,
      showPhoneNumberOnProfile: userProfile.showPhoneNumberOnProfile === undefined ? true : userProfile.showPhoneNumberOnProfile,
      role: userProfile.role || "Freelancer",
      department: userProfile.department || "",
      companyName: userProfile.companyName || "",
      businessDescription: userProfile.businessDescription || "",
      category: userProfile.category || "",
      profession: userProfile.profession || "",
      pricingModel: userProfile.pricingModel || "",
      pricingValue: userProfile.pricingValue || 0,
      experienceYears: userProfile.experienceYears || 0,
      experienceMonths: userProfile.experienceMonths || 0,
      gender: userProfile.gender || "",
      qualification: userProfile.qualification || "",
      collegeName: userProfile.collegeName || "",
      skills: userProfile.skills || "",
      aboutMe: userProfile.aboutMe || "",
      aboutYourDream: userProfile.aboutYourDream || "",
      associatedProjectsName: userProfile.associatedProjectsName || "",
      portfolioUrl: userProfile.portfolioUrl || "",
      facebookUrl: userProfile.facebookUrl || "",
      instagramUrl: userProfile.instagramUrl || "",
      youtubeUrl: userProfile.youtubeUrl || "",
      linkedinUrl: userProfile.linkedinUrl || "",
      twitterUrl: userProfile.twitterUrl || "",
      githubUrl: userProfile.githubUrl || "",
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
        role: selectedRole,
        skills: formData.skills || '',
        yearsOfExperience: formData.experienceYears || 0,
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
            role: selectedRole,
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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = event.target.files?.[0];
    if (file && user && auth) {
      setUploadingSlot(slot);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;

        try {
          const storage = getStorage(auth.app);
          const fileExtension = file.type.split('/')[1] || 'jpg';
          const filePath = `profile-photos/${user.uid}/profile${slot}.${fileExtension}`;
          const imageRef = storageRef(storage, filePath);

          await uploadString(imageRef, dataUrl, 'data_url');
          const finalUrl = await getDownloadURL(imageRef);
          const fieldName = slot === 1 ? 'photoUrl' : `photoUrl${slot}`;
          
          form.setValue(fieldName as any, `${finalUrl}?t=${new Date().getTime()}`, { shouldValidate: true });
          toast({
            title: `Photo ${slot} Uploaded!`,
            description: "Your new photo is ready. Click 'Save Changes' to confirm.",
          });
        } catch (error) {
          console.error("Photo upload failed:", error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Could not upload your photo. Please try again.",
          });
        } finally {
          setUploadingSlot(null);
        }
      };
      reader.onerror = () => {
        setUploadingSlot(null);
        toast({
          variant: "destructive",
          title: "Upload Failed",
          description: "Could not read the image file.",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearImage = (slot: number) => {
    const fieldName = slot === 1 ? 'photoUrl' : `photoUrl${slot}`;
    form.setValue(fieldName as any, "", { shouldValidate: true });
    toast({
      title: `Photo ${slot} Cleared`,
      description: "Remember to save changes to make it permanent.",
    });
  };

  const sanitizePhone = (num: string) => {
    const digits = num.replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return;

    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      const cleanPhoneNumber = sanitizePhone(values.phoneNumber || '');
      
      const updatedData: Partial<ExpertUserProfile> = {
        ...values,
        phoneNumber:
          values.countryCode && cleanPhoneNumber
            ? `${values.countryCode} ${cleanPhoneNumber}`
            : '',
        lastProfileUpdate: serverTimestamp() as any,
      };
      
      delete (updatedData as any).email;
      
      await updateDocumentNonBlocking(userDocRef, updatedData);

      toast({
        title: 'Profile Updated',
        description: 'Your information has been successfully saved.',
      });

      onSuccess();
    } catch (error) {
      if ((error as any).name !== 'FirebaseError') {
        toast({
          variant: 'destructive',
          title: 'Update Failed',
          description: 'Could not save profile. Please try again.',
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
      
      const userDocRef = doc(firestore, 'users', user.uid);
      await updateDocumentNonBlocking(userDocRef, { email: values.newEmail });
      
      toast({
        title: "Email Linked",
        description: "Your email and password have been successfully added to your account.",
      });
      onSuccess();
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

  const isRoleSet = !isAdmin && !!userProfile.role;

  return (
    <>
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          <div className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-lg font-black uppercase tracking-widest text-primary">Profile Portfolio Slots</FormLabel>
                <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 font-black uppercase text-[10px]">
                    {tier} Plan: {photoSlots} Slots
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {Array.from({ length: photoSlots }).map((_, i) => {
                      const slot = i + 1;
                      const fieldName = slot === 1 ? 'photoUrl' : `photoUrl${slot}`;
                      const currentPhoto = form.watch(fieldName as any);
                      
                      return (
                          <div key={slot} className="flex flex-col items-center gap-3 relative group">
                              {currentPhoto && (
                                <Button 
                                  type="button" 
                                  variant="destructive" 
                                  size="icon" 
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => handleClearImage(slot)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                              <Avatar className="h-32 w-32 cursor-pointer border-2 border-dashed border-white/10 hover:border-primary/50 transition-all" onClick={() => fileInputRefs.current[i]?.click()}>
                                <AvatarImage src={currentPhoto ? `${currentPhoto}` : undefined} className="object-cover" />
                                <AvatarFallback className="text-[10px] text-center px-4 font-bold leading-tight bg-white/5">
                                    {uploadingSlot === slot ? (
                                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    ) : (
                                        <>Slot {slot}<br/>Click to add</>
                                    )}
                                </AvatarFallback>
                              </Avatar>
                              <Button type="button" variant="outline" size="sm" className="w-full h-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10" onClick={() => fileInputRefs.current[i]?.click()} disabled={uploadingSlot !== null}>
                                  {uploadingSlot === slot ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                  {slot === 1 ? 'Primary' : `Photo ${slot}`}
                              </Button>
                              <FormControl>
                                  <Input 
                                      type="file"
                                      className="hidden"
                                      ref={el => fileInputRefs.current[i] = el}
                                      onChange={(e) => handleImageUpload(e, slot)}
                                      accept="image/png, image/jpeg, image/gif"
                                  />
                              </FormControl>
                          </div>
                      );
                  })}
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">
                {tier === 'Standard' ? "Upgrade to Premier for 6 slots or Super Premier for 9 slots." : "Showcase your portfolio with high-quality work photos."}
              </p>
          </div>

          <Separator className="bg-white/5" />

          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Role</FormLabel>
                 <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isRoleSet}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your expert role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {expertTypes.map((type) => (
                      <SelectItem key={type.name} value={type.name}>
                        <div className="flex items-center gap-2">
                          {React.cloneElement(type.icon as React.ReactElement, { className: "w-4 h-4" })}
                          {type.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                 {isRoleSet && (
                  <FormDescription>
                    Your role cannot be changed once it has been set.
                  </FormDescription>
                )}
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
            
            <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profession</FormLabel>
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <FormControl>
                        <Input placeholder="e.g., Plumber, Electrician" {...field} className="pl-10" />
                      </FormControl>
                    </div>
                     <FormDescription>Your specific job title or profession.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            
            <FormItem>
              <FormLabel>Years of Experience</FormLabel>
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="experienceYears"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 0)}>
                          <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Years" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {[...Array(51).keys()].map(i => <SelectItem key={i} value={String(i)}>{i} years</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="experienceMonths"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <Select onValueChange={(value) => field.onChange(Number(value))} value={String(field.value || 0)}>
                           <FormControl>
                          <SelectTrigger>
                              <SelectValue placeholder="Months" />
                          </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                          {[...Array(12).keys()].map(i => <SelectItem key={i} value={String(i)}>{i} months</SelectItem>)}
                          </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormItem>

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
                    <Textarea placeholder="Describe your professional dreams and aspirations..." {...field} className="pl-10 min-h-[100px]" />
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
            <FormField
              control={form.control}
              name="facebookUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Facebook</FormLabel>
                  <div className="relative">
                    <Icons.logo className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://facebook.com/yourprofile" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="instagramUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Instagram</FormLabel>
                  <div className="relative">
                    <Icons.logo className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://instagram.com/yourprofile" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="youtubeUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>YouTube</FormLabel>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="https://youtube.com/yourchannel" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
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
          </div>


          <Button type="submit" className="w-full h-12 rounded-xl bg-orange-500 hover:bg-orange-600 font-black text-lg shadow-lg shadow-orange-500/20" disabled={form.formState.isSubmitting || uploadingSlot !== null}>
            {form.formState.isSubmitting || uploadingSlot !== null ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
            {form.formState.isSubmitting || uploadingSlot !== null ? 'Saving...' : 'Save All Profile Changes'}
          </Button>
        </form>
      </Form>

      <Separator className="bg-white/5" />

      {!userProfile.email && (
        <Card className="bg-white/5 border-none rounded-2xl overflow-hidden">
          <CardHeader className="bg-white/5 pb-6">
            <CardTitle>Account Security</CardTitle>
            <CardDescription>Link an email and password to your account for easier login and better security.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
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
      <DialogContent className="rounded-[2.5rem] border-none bg-[#1a1c23]">
        <DialogHeader className="items-center text-center">
          <div className="p-4 bg-orange-500/10 rounded-full w-fit mb-4">
            <Sparkles className="h-10 w-10 text-orange-500" />
          </div>
          <DialogTitle className="text-3xl font-black">Premium AI Feature</DialogTitle>
          <UiDialogDescription className="text-lg text-muted-foreground font-medium pt-2">
            AI-powered suggestions are only available for Premier and Super Premier members.
          </UiDialogDescription>
        </DialogHeader>
        <div className="text-center space-y-4 py-4 px-2">
            <p className="text-white/70 font-medium">
              Upgrade your plan to unlock this and many other powerful features to enhance your profile and attract more clients.
            </p>
        </div>
        <DialogFooter className="flex-col gap-3 pt-4 sm:flex-col">
            <Button asChild className="w-full h-14 rounded-2xl bg-orange-500 hover:bg-orange-600 font-black text-lg">
                <Link href="/dashboard#plans">View Premium Plans</Link>
            </Button>
            <Button variant="ghost" className="w-full h-12 rounded-xl text-muted-foreground hover:text-white hover:bg-white/5 font-bold" onClick={() => setIsPremiumDialogOpen(false)}>
                Maybe Later
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
