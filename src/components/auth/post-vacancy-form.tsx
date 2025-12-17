
"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { collection, serverTimestamp, doc } from 'firebase/firestore';

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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser, useDoc, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, Book, MapPin, FileText, Send, Building, Mail, Phone, Users, CheckSquare } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { Checkbox } from "../ui/checkbox";
import type { Vacancy } from "@/app/vacancies/page";

const formSchema = z.object({
  title: z.string().min(5, { message: "Title must be at least 5 characters." }),
  description: z.string().min(20, { message: "Description must be at least 20 characters." }),
  location: z.string().min(2, { message: "Location is required." }),
  employmentType: z.enum(["Full-time", "Part-time", "Contract", "Internship"]),
  skillsRequired: z.string().min(2, { message: "At least one skill is required." }),
  companyName: z.string().min(2, { message: "Company name is required." }),
  companyEmail: z.string().email({ message: "A valid company email is required for applications." }),
  contactPhone: z.string().optional(),
  positionsAvailable: z.coerce.number().min(1, "At least one position must be available."),
  isImmediate: z.boolean().default(false),
  companyId: z.string().optional(),
});

interface PostVacancyFormProps {
    onSuccess: () => void;
    isAdmin?: boolean;
    companyId?: string;
    companyName?: string;
    companyEmail?: string;
    contactPhone?: string;
    vacancy?: Vacancy;
}

export function PostVacancyForm({ 
    onSuccess, 
    isAdmin = false, 
    companyId: propCompanyId, 
    companyName: propCompanyName, 
    companyEmail: propCompanyEmail, 
    contactPhone: propContactPhone,
    vacancy 
}: PostVacancyFormProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user } = useUser();
  
  const userDocRef = useMemoFirebase(() => {
    if(!user || !propCompanyId) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore, propCompanyId]);

  const { data: userProfile } = useDoc(userDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: vacancy?.title || "",
      description: vacancy?.description || "",
      location: vacancy?.location || "",
      employmentType: vacancy?.employmentType || "Full-time",
      skillsRequired: vacancy?.skillsRequired || "",
      companyName: vacancy?.companyName || propCompanyName || "",
      companyEmail: vacancy?.companyEmail || propCompanyEmail || "",
      contactPhone: vacancy?.contactPhone || propContactPhone || "",
      positionsAvailable: vacancy?.positionsAvailable || 1,
      isImmediate: vacancy?.isImmediate || false,
      companyId: vacancy?.companyId || propCompanyId || "",
    },
  });

  useEffect(() => {
    if (vacancy) {
        form.reset({
            title: vacancy.title,
            description: vacancy.description,
            location: vacancy.location,
            employmentType: vacancy.employmentType,
            skillsRequired: vacancy.skillsRequired,
            companyName: vacancy.companyName,
            companyEmail: vacancy.companyEmail,
            contactPhone: vacancy.contactPhone,
            positionsAvailable: vacancy.positionsAvailable,
            isImmediate: vacancy.isImmediate,
            companyId: vacancy.companyId
        });
    }
  }, [vacancy, form]);


  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore) return;
    
    if (vacancy) {
      // Update existing vacancy
      const vacancyDocRef = doc(firestore, 'vacancies', vacancy.id);
      try {
        await updateDocumentNonBlocking(vacancyDocRef, values);
        toast({
          title: "Vacancy Updated",
          description: "The job opening has been successfully updated.",
        });
        onSuccess();
      } catch (error) {
        console.error("Error updating vacancy:", error);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "An unexpected error occurred. Please try again.",
        });
      }

    } else {
      // Create new vacancy
      const vacanciesCollectionRef = collection(firestore, 'vacancies');
      
      const newVacancyData = {
        ...values,
        companyId: isAdmin ? values.companyId || uuidv4() : propCompanyId,
        companyName: values.companyName,
        companyEmail: values.companyEmail,
        contactPhone: values.contactPhone,
        isCompanyVerified: userProfile?.verified || false,
        companyTier: userProfile?.tier || 'Standard',
        postedAt: serverTimestamp(),
      };

      try {
        await addDocumentNonBlocking(vacanciesCollectionRef, newVacancyData);
        toast({
          title: "Vacancy Posted",
          description: "The new job opening has been successfully posted.",
        });
        onSuccess();
      } catch (error) {
        console.error("Error posting vacancy:", error);
        toast({
          variant: "destructive",
          title: "Posting Failed",
          description: "An unexpected error occurred. Please try again.",
        });
      }
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {isAdmin && (
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company ID (for admin use)</FormLabel>
                   <Input placeholder="Enter Company ID if it exists" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input placeholder="e.g. Acme Corporation" {...field} className="pl-10" disabled={!isAdmin && !!propCompanyName} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Email</FormLabel>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="email" placeholder="e.g. careers@acme.com" {...field} className="pl-10" disabled={!isAdmin && !!propCompanyEmail}/>
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Title</FormLabel>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. Senior Software Engineer" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Job Description</FormLabel>
               <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <FormControl>
                  <Textarea placeholder="Describe the role, responsibilities, and requirements..." {...field} className="pl-10 min-h-[120px]" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
            <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Location</FormLabel>
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                    <Input placeholder="e.g. Mumbai, India" {...field} className="pl-10" />
                    </FormControl>
                </div>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="employmentType"
            render={({ field }) => (
                <FormItem>
                    <FormLabel>Employment Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="Full-time">Full-time</SelectItem>
                            <SelectItem value="Part-time">Part-time</SelectItem>
                            <SelectItem value="Contract">Contract</SelectItem>
                            <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
            )}
            />
        </div>

         <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="positionsAvailable"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Positions Available</FormLabel>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="number" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="contactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Contact Phone (Optional)</FormLabel>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <FormControl>
                      <Input type="tel" placeholder="+91 555 123 4567" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="skillsRequired"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Skills Required (comma-separated)</FormLabel>
              <div className="relative">
                <Book className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <FormControl>
                  <Input placeholder="e.g. React, Node.js, TypeScript" {...field} className="pl-10" />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="isImmediate"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                <FormControl>
                    <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    />
                </FormControl>
                <div className="space-y-1 leading-none">
                    <FormLabel className="flex items-center gap-2">
                     <CheckSquare className="h-4 w-4"/>
                        This is an immediate opening
                    </FormLabel>
                </div>
            </FormItem>
          )}
        />


        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            'Saving...'
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              {vacancy ? 'Save Changes' : 'Post Vacancy'}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
