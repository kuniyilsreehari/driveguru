import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { Icons } from "@/components/icons";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const loginBg = PlaceHolderImages.find(img => img.id === 'login-background');
    
    return (
        <div className="w-full lg:grid lg:min-h-[100dvh] lg:grid-cols-2">
            <div className="flex items-center justify-center p-6 lg:p-12">
                <div className="mx-auto w-full max-w-md space-y-8">
                    <div className="text-center">
                        <div className="mb-4 flex justify-center items-center gap-4">
                            <Icons.logo className="h-12 w-12 text-primary" />
                            <h1 className="text-4xl font-bold font-headline">GeoTrack Pro</h1>
                        </div>
                        <h2 className="text-2xl font-semibold tracking-tight">
                            Welcome Back
                        </h2>
                        <p className="mt-2 text-muted-foreground">
                            Enter your credentials to access your account.
                        </p>
                    </div>
                    <LoginForm />

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">
                            Or continue with
                            </span>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full">
                        <Icons.google className="mr-2 h-4 w-4" />
                        Login with Google
                    </Button>
                    
                    <p className="px-8 text-center text-sm text-muted-foreground">
                        By clicking continue, you agree to our{" "}
                        <Link
                            href="#"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="#"
                            className="underline underline-offset-4 hover:text-primary"
                        >
                            Privacy Policy
                        </Link>
                        .
                    </p>
                </div>
            </div>
            <div className="relative hidden bg-muted lg:block">
                {loginBg && (
                     <Image
                        src={loginBg.imageUrl}
                        alt={loginBg.description}
                        width={1080}
                        height={1920}
                        priority
                        className="h-full w-full object-cover dark:brightness-[0.3]"
                        data-ai-hint={loginBg.imageHint}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
                 <div className="absolute bottom-0 left-0 p-8">
                    <div className="bg-black/50 backdrop-blur-sm p-4 rounded-lg">
                        <blockquote className="text-white">
                            <p className="text-lg">
                                “This platform has revolutionized how we manage our field operations. The real-time tracking and location intelligence are second to none.”
                            </p>
                            <footer className="mt-4 text-sm font-semibold">Sofia Davis, Operations Manager</footer>
                        </blockquote>
                    </div>
                </div>
            </div>
        </div>
    );
}
