import "server-only";

import { ZId } from "@formbricks/types/environment";
import { validateInputs } from "../utils/validate";
import { hasUserEnvironmentAccess } from "../environment/auth";
import { getApiKey } from "./service";
import { unstable_cache } from "next/cache";
import { SERVICES_REVALIDATION_INTERVAL } from "../constants";
import { apiKeyCache } from "./cache";

export const canUserAccessApiKey = async (userId: string, apiKeyId: string): Promise<boolean> =>
  await unstable_cache(
    async () => {
      validateInputs([userId, ZId], [apiKeyId, ZId]);

      const apiKeyFromServer = await getApiKey(apiKeyId);
      if (!apiKeyFromServer) return false;

      const hasAccessToEnvironment = await hasUserEnvironmentAccess(userId, apiKeyFromServer.environmentId);
      if (!hasAccessToEnvironment) return false;

      return true;
    },

    [`canUserAccessApiKey-${userId}-${apiKeyId}`],
    { revalidate: SERVICES_REVALIDATION_INTERVAL, tags: [apiKeyCache.tag.byId(apiKeyId)] }
  )();
