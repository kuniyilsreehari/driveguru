import { RegistrationForm } from "@/components/auth/registration-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import Image from "next/image";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function SignupPage() {
  const backgroundImage = PlaceHolderImages.find(img => img.id === 'login-background');

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12 px-4">
        <div className="mx-auto grid w-full max-w-[400px] gap-6">
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Expert Sign Up</CardTitle>
                    <CardDescription>
                        Create your account to get started.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RegistrationForm />
                </CardContent>
            </Card>
        </div>
      </div>
      <div className="hidden bg-muted lg:block h-screen">
        {backgroundImage && (
          <Image
            src={backgroundImage.imageUrl}
            alt={backgroundImage.description}
            data-ai-hint={backgroundImage.imageHint}
            width="1920"
            height="1080"
            className="h-full w-full object-cover"
          />
        )}
      </div>
    </div>
  );
}
