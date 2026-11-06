import { redirect } from "next/navigation";

/**
 * Old student sign-up in the admin app. Students sign up in the student app (Student-Signup board: email code,
 * promo code, terms); the M6 API refuses the old form (no terms). Old links land there.
 */
export default function Page() {
  redirect(`${process.env.NEXT_PUBLIC_TEST_PORTAL_URI || "https://tests.iitpulse.in"}/signup`);
}
