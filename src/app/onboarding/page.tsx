import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/current-user";
import { completeOnboarding } from "./actions";

export default async function OnboardingPage() {
  const existing = await getCurrentDbUser();
  if (existing) {
    redirect(existing.role === "manufacturer" ? "/manufacturer" : "/architect");
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-semibold">Tell us who you are</h1>
      <p className="mt-1 text-sm text-neutral-500">
        This sets up your workspace on Material Hub.
      </p>

      <form action={completeOnboarding} className="mt-8 flex flex-col gap-4">
        <fieldset className="grid grid-cols-2 gap-3">
          {[
            { value: "manufacturer", label: "Manufacturer" },
            { value: "architect", label: "Architect / Designer" },
          ].map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-neutral-300 px-4 py-3 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white"
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                required
                defaultChecked={r.value === "architect"}
                className="sr-only"
              />
              <span className="text-sm font-medium">{r.label}</span>
            </label>
          ))}
        </fieldset>

        <input
          name="name"
          placeholder="Your full name"
          required
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm"
        />
        <input
          name="companyName"
          placeholder="Company / studio name"
          required
          className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            name="city"
            placeholder="City"
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm"
          />
          <input
            name="phone"
            placeholder="Phone"
            className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm"
          />
        </div>

        <button
          type="submit"
          className="mt-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Continue
        </button>
      </form>
    </div>
  );
}
