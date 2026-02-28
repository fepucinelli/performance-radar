export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { db, users } from "@/lib/db"
import { eq } from "drizzle-orm"
import { BillingSection } from "./billing-section"
import { BrandingSection } from "./branding-section"
import { ProfileSection } from "./profile-section"
import type { Plan } from "@/lib/db/schema"

export const metadata: Metadata = {
  title: "Settings",
}

export default async function SettingsPage() {
  const { userId } = await auth()

  const dbUser = userId
    ? await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: {
          plan: true,
          stripeCustomerId: true,
          planExpiresAt: true,
          agencyName: true,
          agencyContact: true,
          agencyAccentColor: true,
          agencyLogoUrl: true,
        },
      })
    : null

  const plan: Plan = (dbUser?.plan ?? "free") as Plan
  const hasStripeCustomer = !!dbUser?.stripeCustomerId
  const planExpiresAt = dbUser?.planExpiresAt ?? null

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie sua conta e assinatura.
        </p>
      </div>

      {/* Account + editable profile */}
      <ProfileSection plan={plan} planExpiresAt={planExpiresAt} />

      {/* Billing */}
      <BillingSection plan={plan} hasStripeCustomer={hasStripeCustomer} />

      {/* Branding (Agency plan only) */}
      {plan === "agency" && (
        <BrandingSection
          initial={{
            agencyName: dbUser?.agencyName ?? null,
            agencyContact: dbUser?.agencyContact ?? null,
            agencyAccentColor: dbUser?.agencyAccentColor ?? null,
            agencyLogoUrl: dbUser?.agencyLogoUrl ?? null,
          }}
        />
      )}
    </div>
  )
}
