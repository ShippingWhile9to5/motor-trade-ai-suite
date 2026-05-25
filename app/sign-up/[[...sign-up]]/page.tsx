import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <section className="flex flex-1 items-center justify-center">
      <SignUp
        fallbackRedirectUrl="/dashboard"
        path="/sign-up"
        routing="path"
        signInUrl="/sign-in"
      />
    </section>
  );
}
