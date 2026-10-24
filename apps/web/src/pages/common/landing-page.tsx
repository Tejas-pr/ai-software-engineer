import { HowItWorks } from "@/components/organisms/landing/how-it-works"
import { LandingCta } from "@/components/organisms/landing/landing-cta"
import { LandingFeatures } from "@/components/organisms/landing/landing-features"
import { LandingHero } from "@/components/organisms/landing/landing-hero"
import { LandingModels } from "@/components/organisms/landing/landing-models"

export function LandingPage() {
  return (
    <>
      <LandingHero />
      <HowItWorks />
      <LandingFeatures />
      <LandingModels />
      <LandingCta />
    </>
  )
}
