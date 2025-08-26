
"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Github, Loader2 } from "lucide-react";
import {
  useSignInWithGoogle,
  useSignInWithGithub,
  useCreateUserWithEmailAndPassword,
  useSignInWithEmailAndPassword,
} from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Mountain } from "lucide-react";

function GoogleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
      {...props}
    >
      <path
        fill="#FFC107"
        d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12s5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
      />
      <path
        fill="#FF3D00"
        d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.655-3.108-11.28-7.581l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
      />
      <path
        fill="#1976D2"
        d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.022,35.132,44,30.021,44,24C44,22.659,43.862,21.35,43.611,20.083z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [signInWithGoogle, , googleLoading, googleError] = useSignInWithGoogle(auth);
  const [signInWithGithub, , githubLoading, githubError] = useSignInWithGithub(auth);
  const [
    createUserWithEmailAndPassword,
    ,
    createLoading,
    createError,
  ] = useCreateUserWithEmailAndPassword(auth);
  const [
    signInWithEmailAndPassword,
    ,
    signInLoading,
    signInError,
  ] = useSignInWithEmailAndPassword(auth);
  const { toast } = useToast();
  const router = useRouter();
  const { user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isLoading = googleLoading || githubLoading || createLoading || signInLoading;

  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);
  
  useEffect(() => {
    const error = createError || signInError || googleError || githubError;
    if (error) {
      toast({ title: "Authentication Error", description: error.message.replace("Firebase: ", ""), variant: "destructive" });
    }
  }, [createError, signInError, googleError, githubError, toast]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await createUserWithEmailAndPassword(email, password);
    if(success) {
        toast({ title: "Registration successful!", description: "You are now logged in." });
        router.push("/dashboard");
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await signInWithEmailAndPassword(email, password);
     if(success) {
        toast({ title: "Login successful!", description: "Welcome back." });
        router.push("/dashboard");
    }
  };

  const handleSocialLogin = async (provider: "google" | "github") => {
    let success;
    if(provider === 'google') {
       success = await signInWithGoogle();
    } else {
        success = await signInWithGithub();
    }
     if(success) {
        toast({ title: "Login successful!", description: "Welcome!" });
        router.push("/dashboard");
    }
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-muted/20 p-4">
       <div className="absolute top-8 left-8">
            <Link href="/" className="flex items-center gap-2 text-foreground">
                <Mountain className="h-6 w-6" />
                <span className="font-bold text-lg">Earth Insights</span>
            </Link>
       </div>
      <Tabs defaultValue="login" className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="signup">Sign Up</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <CardHeader>
              <CardTitle>Login</CardTitle>
              <CardDescription>
                Access your dashboard by signing in.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {signInLoading ? <Loader2 className="animate-spin" /> : "Login with Email"}
                </Button>
                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">
                      Or continue with
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full">
                  <Button variant="outline" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                    {googleLoading ? <Loader2 className="animate-spin" /> : <><GoogleIcon className="mr-2"/> Google</>}
                  </Button>
                  <Button variant="outline" onClick={() => handleSocialLogin('github')} disabled={isLoading}>
                    {githubLoading ? <Loader2 className="animate-spin" /> : <><Github className="mr-2"/> GitHub</>}
                  </Button>
                </div>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="signup">
          <Card>
            <CardHeader>
              <CardTitle>Sign Up</CardTitle>
              <CardDescription>
                Create an account to get started.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleEmailSignUp}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input id="signup-email" type="email" placeholder="m@example.com" required value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input id="signup-password" type="password" required value={password} onChange={e => setPassword(e.target.value)}/>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {createLoading ? <Loader2 className="animate-spin" /> : "Sign up with Email"}
                </Button>
                <p className="px-8 text-center text-sm text-muted-foreground">
                    By clicking continue, you agree to our{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Terms of Service
                    </a>{" "}
                    and{" "}
                    <a href="#" className="underline underline-offset-4 hover:text-primary">
                        Privacy Policy
                    </a>
                    .
                </p>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
