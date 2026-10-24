import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { HowItWorks } from "@/components/organisms/landing/how-it-works"
import { LandingCta } from "@/components/organisms/landing/landing-cta"
import { LandingFeatures } from "@/components/organisms/landing/landing-features"
import { LandingHero } from "@/components/organisms/landing/landing-hero"
import { LandingModels } from "@/components/organisms/landing/landing-models"
import { LandingSelfHost } from "@/components/organisms/landing/landing-selfhost"

export function LandingPage() {
  const { hash } = useLocation()

  // Router navigation doesn't scroll to #sections; arriving from another
  // page (the header's "How it works") should
  useEffect(() => {
    if (!hash) return
    document
      .getElementById(hash.slice(1))
      ?.scrollIntoView({ behavior: "smooth" })
  }, [hash])

  return (
    <>
      <LandingHero />
      <HowItWorks />
      <LandingFeatures />
      <LandingModels />
      <LandingSelfHost />
      <LandingCta />
    </>
  )
}
