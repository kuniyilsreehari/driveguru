
"use client";

import * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { User as UserIcon, Mail, MapPin, Phone, LocateIcon, Loader2, Building, Briefcase, IndianRupee, Calendar, Book, School, GraduationCap, Info, Sparkles, Upload } from "lucide-react";
import { doc } from 'firebase/firestore';
import { getStorage, ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

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
import { useFirestore, useUser } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { generateAboutMe } from "@/ai/flows/generate-about-me-flow";
import { suggestSkills } from "@/ai/flows/suggest-skills-flow";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

const expertTypes = [
    { name: "Freelancer", icon: <UserIcon className="w-8 h-8" /> },
    { name: "Company", icon: <Building className="w-8 h-8" /> },
    { name: "Authorized Pro", icon: <Briefcase className="w-8 h-8" /> },
]

const formSchema = z.object({
  firstName: z.string().min(1, { message: "First name is required." }),
  lastName: z.string().min(1, { message: "Last name is required." }),
  photoUrl: z.string().optional().or(z.literal('')),
  location: z.string().optional(),
  countryCode: z.string().optional(),
  phoneNumber: z.string().optional(),
  role: z.string({ required_error: "Please select your expert type." }),
  department: z.string().optional(),
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
    photoUrl?: string;
    location?: string;
    phoneNumber?: string;
    companyName?: string;
    department?: string;
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
  const { user } = useUser();
  const [isDetecting, setIsDetecting] = useState(false);
  const [isGeneratingAboutMe, setIsGeneratingAboutMe] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

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
      location: userProfile.location || "",
      countryCode: countryCode,
      phoneNumber: phoneNumber,
      role: userProfile.role || "",
      department: userProfile.department || "",
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
  const photoUrl = form.watch("photoUrl");

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
                        description: 'We could not find address details for your coordinates.',
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

  const handleGenerateAboutMe = async () => {
    setIsGeneratingAboutMe(true);
    try {
        const formData = form.getValues();
        const result = await generateAboutMe({
            firstName: formData.firstName,
            role: formData.role,
            skills: formData.skills || '',
            yearsOfExperience: Number(formData.yearsOfExperience) || 0,
            qualification: formData.qualification || '',
        });
        if (result.aboutMe) {
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
    if (file && user && firestore) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = document.createElement('img');
        img.onload = async () => {
          let dataUrl: string;
          // Resize image if it's large
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          dataUrl = canvas.toDataURL(file.type);

          // Upload to Firebase Storage
          try {
            const storage = getStorage();
            const storageRef = ref(storage, `profileImages/${user.uid}/${uuidv4()}`);
            const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            form.setValue('photoUrl', downloadURL, { shouldValidate: true });
            toast({
              title: "Image Uploaded",
              description: "Your new profile picture has been saved.",
            });
          } catch (error) {
            console.error("Error uploading image: ", error);
            toast({
              variant: "destructive",
              title: "Upload Failed",
              description: "Could not upload the image. Please try again.",
            });
          } finally {
            setIsUploading(false);
          }
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };


  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
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

  const getInitials = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) {
        return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return 'U';
  }

  return (
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
                        {isUploading ? 'Uploading...' : 'Upload Image'}
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
                            <SelectItem value="Engineering">Engineering</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Marketing">Marketing</SelectItem>
                            <SelectItem value="HR">Human Resources</SelectItem>
                            <SelectItem value="Support">Support</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
              )}
            />
          </>
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
                        <Input placeholder="e.g. city, state, pincode" {...field} className="pl-10" />
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
