import { apiClient } from "./api"
import { API_ENDPOINTS } from "./endpoints"
import type { Organization } from "./organizations.api"
import type { User } from "./user.api"

export async function updateProfile(displayName: string): Promise<User> {
  const res = await apiClient.patch<User>(API_ENDPOINTS.ACCOUNT, {
    display_name: displayName,
  })
  return res.data
}

/** Onboarding step 1: create (or rename) the user's first organization */
export async function saveOnboardingOrganization(
  name: string
): Promise<Organization> {
  const res = await apiClient.post<Organization>(
    API_ENDPOINTS.ONBOARDING_ORGANIZATION,
    { name }
  )
  return res.data
}

/** Last step: the API checks there's an organization and a key (or local
 * models), then marks the user onboarded */
export async function completeOnboarding(
  useLocalModels = false
): Promise<User> {
  const res = await apiClient.post<User>(API_ENDPOINTS.ONBOARDING_COMPLETE, {
    use_local_models: useLocalModels,
  })
  return res.data
}
