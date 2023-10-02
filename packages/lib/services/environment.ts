import "server-only";
import { prisma } from "@formbricks/database";
import { z } from "zod";
import { Prisma, EnvironmentType } from "@prisma/client";
import { DatabaseError, ResourceNotFoundError, ValidationError } from "@formbricks/types/v1/errors";
import type { TEnvironment, TEnvironmentId, TEnvironmentUpdateInput } from "@formbricks/types/v1/environment";
import { populateEnvironment } from "../utils/createDemoProductHelpers";
import { ZEnvironment, ZEnvironmentUpdateInput, ZId } from "@formbricks/types/v1/environment";
import { validateInputs } from "../utils/validate";
import { unstable_cache, revalidateTag } from "next/cache";

export const getEnvironmentCacheTag = (environmentId: string) => `environments-${environmentId}`;
export const getEnvironmentsCacheTag = (productId: string) => `products-${productId}-environments`;

export const getEnvironment = (environmentId: string) =>
  unstable_cache(
    async () => {
      validateInputs([environmentId, ZId]);
      let environmentPrisma;

      try {
        environmentPrisma = await prisma.environment.findUnique({
          where: {
            id: environmentId,
          },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new DatabaseError("Database operation failed");
        }

        throw error;
      }

      try {
        const environment = ZEnvironment.parse(environmentPrisma);
        return environment;
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(JSON.stringify(error.errors, null, 2));
        }
        throw new ValidationError("Data validation of environment failed");
      }
    },
    [`environments-${environmentId}`],
    {
      tags: [getEnvironmentCacheTag(environmentId)],
      revalidate: 30 * 60, // 30 minutes
    }
  )();

export const getEnvironments = async (productId: string): Promise<TEnvironment[]> =>
  unstable_cache(
    async () => {
      validateInputs([productId, ZId]);
      let productPrisma;
      try {
        productPrisma = await prisma.product.findFirst({
          where: {
            id: productId,
          },
          include: {
            environments: true,
          },
        });

        if (!productPrisma) {
          throw new ResourceNotFoundError("Product", productId);
        }
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw new DatabaseError("Database operation failed");
        }
        throw error;
      }

      const environments: TEnvironment[] = [];
      for (let environment of productPrisma.environments) {
        let targetEnvironment: TEnvironment = ZEnvironment.parse(environment);
        environments.push(targetEnvironment);
      }

      try {
        return environments;
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error(JSON.stringify(error.errors, null, 2));
        }
        throw new ValidationError("Data validation of environments array failed");
      }
    },
    [`products-${productId}-environments`],
    {
      tags: [getEnvironmentsCacheTag(productId)],
      revalidate: 30 * 60, // 30 minutes
    }
  )();

export const updateEnvironment = async (
  environmentId: string,
  data: Partial<TEnvironmentUpdateInput>
): Promise<TEnvironment> => {
  validateInputs([environmentId, ZId], [data, ZEnvironmentUpdateInput.partial()]);
  const newData = { ...data, updatedAt: new Date() };
  let updatedEnvironment;
  try {
    updatedEnvironment = await prisma.environment.update({
      where: {
        id: environmentId,
      },
      data: newData,
    });

    revalidateTag(getEnvironmentsCacheTag(updatedEnvironment.productId));
    revalidateTag(getEnvironmentCacheTag(environmentId));

    return updatedEnvironment;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }
    throw error;
  }
};

export const getEnvironmentByUser = async (user: any): Promise<TEnvironment | TEnvironmentId | null> => {
  const firstMembership = await prisma.membership.findFirst({
    where: {
      userId: user.id,
    },
    select: {
      teamId: true,
    },
  });

  if (!firstMembership) {
    // create a new team and return environment
    const membership = await prisma.membership.create({
      data: {
        accepted: true,
        role: "owner",
        user: { connect: { id: user.id } },
        team: {
          create: {
            name: `${user.name}'s Team`,
            products: {
              create: {
                name: "My Product",
                environments: {
                  create: [
                    {
                      type: EnvironmentType.production,
                      ...populateEnvironment,
                    },
                    {
                      type: EnvironmentType.development,
                      ...populateEnvironment,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      include: {
        team: {
          include: {
            products: {
              include: {
                environments: true,
              },
            },
          },
        },
      },
    });

    const environment = membership.team.products[0].environments[0];

    return environment;
  }

  const firstProduct = await prisma.product.findFirst({
    where: {
      teamId: firstMembership.teamId,
    },
    select: {
      id: true,
    },
  });
  if (firstProduct === null) {
    return null;
  }
  const firstEnvironment = await prisma.environment.findFirst({
    where: {
      productId: firstProduct.id,
      type: "production",
    },
    select: {
      id: true,
    },
  });
  if (firstEnvironment === null) {
    return null;
  }
  return firstEnvironment;
};
