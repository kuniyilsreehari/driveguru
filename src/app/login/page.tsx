
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen flex items-center justify-center bg-[#1a1c23] p-4 sm:p-8">
      <div className="mx-auto w-full max-w-[420px]">
        <Card className="border-none bg-[#24262d] shadow-2xl rounded-[2.5rem] overflow-hidden">
          <CardContent className="p-8 sm:p-12">
            <div className="mb-10">
                <h2 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tighter text-white mb-2">Login</h2>
                <p className="text-sm text-muted-foreground font-medium">Access your professional workspace.</p>
            </div>
            <LoginForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
