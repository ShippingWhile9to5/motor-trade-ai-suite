import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <section className="flex flex-1 items-center justify-center">
      <SignIn
        fallbackRedirectUrl="/dashboard"
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
      />
    </section>
  );
}
