"use server";
import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "../../authOptions";
import { getTeamByEnvironmentId } from "../../team/service";
import { AuthenticationError } from "@formbricks/types/errors";
import { getMembershipByUserIdTeamId } from "../service";
import { TProfile } from "@formbricks/types/profile";

export const getMembershipByUserIdTeamIdAction = async (environmentId: string) => {
  const session = await getServerSession(authOptions);
  const team = await getTeamByEnvironmentId(environmentId);
  const user = session?.user as TProfile;

  if (!session) {
    throw new AuthenticationError("Not authenticated");
  }

  if (!team) {
    throw new Error("Team not found");
  }

  const currentUserMembership = await getMembershipByUserIdTeamId(user.id, team.id);

  if (!currentUserMembership) {
    throw new Error("Membership not found");
  }

  return currentUserMembership?.role;
};
