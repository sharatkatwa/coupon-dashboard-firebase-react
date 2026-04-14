import { signInWithEmailAndPassword } from "firebase/auth";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router";
import { auth } from "../../firebase/config";

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const redirectTo = location.state?.from || "/";

  if (auth.currentUser) {
    return <Navigate to={redirectTo} replace />;
  }

  const onSubmit = async ({ email, password }) => {
    setIsSubmitting(true);
    setLoginError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setLoginError(
        error.code === "auth/invalid-credential"
          ? "Incorrect admin email or password."
          : "Unable to sign in right now. Please check Firebase Auth settings."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--bg)] px-4 py-10 text-[var(--text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(221,107,32,0.16),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(24,79,62,0.18),_transparent_30%)]" />
      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center">
        <div className="grid w-full gap-6 rounded-[32px] border border-[var(--line)] bg-white/88 p-4 shadow-[var(--shadow-hard)] backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <section className="rounded-[28px] bg-[linear-gradient(135deg,#17332b_0%,#21493c_55%,#d97833_100%)] p-8 text-white md:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.45em] text-white/70">
              Admin Entry
            </p>
            <h1 className="mt-5 max-w-md text-4xl font-semibold leading-tight">
              Run Pry&apos;s coupon campaign and lucky draw from one secure
              dashboard.
            </h1>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/78">
              After login, you can register purchases, upload shop proof, issue
              coupon numbers, and pick winners from eligible entries.
            </p>
          </section>

          <section className="rounded-[28px] bg-[var(--panel)] p-6 md:p-8">
            <h2 className="text-2xl font-semibold">Admin Login</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Sign in with the Firebase Auth admin account you created for this
              project.
            </p>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium">Email</span>
                <input
                  type="email"
                  placeholder="admin@example.com"
                  className="input-field"
                  {...register("email", {
                    required: "Admin email is required",
                  })}
                />
                {errors.email && (
                  <p className="form-error">{errors.email.message}</p>
                )}
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">Password</span>
                <input
                  type="password"
                  placeholder="Enter password"
                  className="input-field"
                  {...register("password", {
                    required: "Password is required",
                  })}
                />
                {errors.password && (
                  <p className="form-error">{errors.password.message}</p>
                )}
              </label>

              {loginError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full justify-center"
              >
                {isSubmitting ? "Signing In..." : "Sign In"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
