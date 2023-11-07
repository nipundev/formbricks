"use server";

import { authOptions } from "@formbricks/lib/authOptions";
import { canUserAccessProduct, verifyUserRoleAccess } from "@formbricks/lib/product/auth";
import { getProduct, updateProduct } from "@formbricks/lib/product/service";
import { updateProfile } from "@formbricks/lib/profile/service";
import { AuthorizationError } from "@formbricks/types/errors";
import { TProductUpdateInput } from "@formbricks/types/product";
import { TProfileUpdateInput } from "@formbricks/types/profile";
import { getServerSession } from "next-auth";

export async function updateProfileAction(updatedProfile: TProfileUpdateInput) {
  const session = await getServerSession(authOptions);
  if (!session) throw new AuthorizationError("Not authorized");

  return await updateProfile(session.user.id, updatedProfile);
}

export async function updateProductAction(productId: string, updatedProduct: Partial<TProductUpdateInput>) {
  const session = await getServerSession(authOptions);
  if (!session) throw new AuthorizationError("Not authorized");

  const isAuthorized = await canUserAccessProduct(session.user.id, productId);
  if (!isAuthorized) throw new AuthorizationError("Not authorized");

  const product = await getProduct(productId);

  const { hasCreateOrUpdateAccess } = await verifyUserRoleAccess(product!.teamId, session.user.id);
  if (!hasCreateOrUpdateAccess) throw new AuthorizationError("Not authorized");

  return await updateProduct(productId, updatedProduct);
}
