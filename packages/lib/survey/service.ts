import "server-only";

import { prisma } from "@formbricks/database";
import { ZOptionalNumber } from "@formbricks/types/common";
import { ZId } from "@formbricks/types/environment";
import { DatabaseError, ResourceNotFoundError } from "@formbricks/types/errors";
import { TSurvey, TSurveyAttributeFilter, TSurveyInput, ZSurvey } from "@formbricks/types/surveys";
import { TActionClass } from "@formbricks/types/actionClasses";
import { Prisma } from "@prisma/client";
import { unstable_cache } from "next/cache";
import { getActionClasses } from "../actionClass/service";
import { ITEMS_PER_PAGE, SERVICES_REVALIDATION_INTERVAL } from "../constants";
import { responseCache } from "../response/cache";
import { captureTelemetry } from "../telemetry";
import { validateInputs } from "../utils/validate";
import { formatSurveyDateFields } from "./util";
import { surveyCache } from "./cache";

export const selectSurvey = {
  id: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  type: true,
  environmentId: true,
  status: true,
  welcomeCard: true,
  questions: true,
  thankYouCard: true,
  hiddenFields: true,
  displayOption: true,
  recontactDays: true,
  autoClose: true,
  closeOnDate: true,
  delay: true,
  autoComplete: true,
  verifyEmail: true,
  redirectUrl: true,
  productOverwrites: true,
  surveyClosedMessage: true,
  singleUse: true,
  pin: true,
  triggers: {
    select: {
      eventClass: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          environmentId: true,
          name: true,
          description: true,
          type: true,
          noCodeConfig: true,
        },
      },
    },
  },
  attributeFilters: {
    select: {
      id: true,
      attributeClassId: true,
      condition: true,
      value: true,
    },
  },
};

const getActionClassIdFromName = (actionClasses: TActionClass[], actionClassName: string): string => {
  return actionClasses.find((actionClass) => actionClass.name === actionClassName)!.id;
};

const revalidateSurveyByActionClassId = (actionClasses: TActionClass[], actionClassNames: string[]): void => {
  for (const actionClassName of actionClassNames) {
    const actionClassId: string = getActionClassIdFromName(actionClasses, actionClassName);
    surveyCache.revalidate({
      actionClassId,
    });
  }
};

const revalidateSurveyByAttributeClassId = (attributeFilters: TSurveyAttributeFilter[]): void => {
  for (const attributeFilter of attributeFilters) {
    surveyCache.revalidate({
      attributeClassId: attributeFilter.attributeClassId,
    });
  }
};

export const getSurvey = async (surveyId: string): Promise<TSurvey | null> => {
  const survey = await unstable_cache(
    async () => {
      validateInputs([surveyId, ZId]);

      let surveyPrisma;
      try {
        surveyPrisma = await prisma.survey.findUnique({
          where: {
            id: surveyId,
          },
          select: selectSurvey,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(error);
          throw new DatabaseError(error.message);
        }

        throw error;
      }

      if (!surveyPrisma) {
        return null;
      }

      const transformedSurvey = {
        ...surveyPrisma,
        triggers: surveyPrisma.triggers.map((trigger) => trigger.eventClass.name),
      };

      return transformedSurvey;
    },
    [`getSurvey-${surveyId}`],
    {
      tags: [surveyCache.tag.byId(surveyId)],
      revalidate: SERVICES_REVALIDATION_INTERVAL,
    }
  )();

  if (!survey) {
    return null;
  }

  // since the unstable_cache function does not support deserialization of dates, we need to manually deserialize them
  // https://github.com/vercel/next.js/issues/51613
  return {
    ...survey,
    ...formatSurveyDateFields(survey),
  };
};

export const getSurveysByAttributeClassId = async (
  attributeClassId: string,
  page?: number
): Promise<TSurvey[]> => {
  const surveys = await unstable_cache(
    async () => {
      validateInputs([attributeClassId, ZId], [page, ZOptionalNumber]);

      const surveysPrisma = await prisma.survey.findMany({
        where: {
          attributeFilters: {
            some: {
              attributeClassId,
            },
          },
        },
        select: selectSurvey,
        take: page ? ITEMS_PER_PAGE : undefined,
        skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
      });

      const surveys: TSurvey[] = [];

      for (const surveyPrisma of surveysPrisma) {
        const transformedSurvey = {
          ...surveyPrisma,
          triggers: surveyPrisma.triggers.map((trigger) => trigger.eventClass.name),
        };
        surveys.push(transformedSurvey);
      }

      return surveys;
    },
    [`getSurveysByAttributeClassId-${attributeClassId}-${page}`],
    {
      tags: [surveyCache.tag.byAttributeClassId(attributeClassId)],
      revalidate: SERVICES_REVALIDATION_INTERVAL,
    }
  )();

  return surveys.map((survey) => ({
    ...survey,
    ...formatSurveyDateFields(survey),
  }));
};

export const getSurveysByActionClassId = async (actionClassId: string, page?: number): Promise<TSurvey[]> => {
  const surveys = await unstable_cache(
    async () => {
      validateInputs([actionClassId, ZId], [page, ZOptionalNumber]);

      const surveysPrisma = await prisma.survey.findMany({
        where: {
          triggers: {
            some: {
              eventClass: {
                id: actionClassId,
              },
            },
          },
        },
        select: selectSurvey,
        take: page ? ITEMS_PER_PAGE : undefined,
        skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
      });

      const surveys: TSurvey[] = [];

      for (const surveyPrisma of surveysPrisma) {
        const transformedSurvey = {
          ...surveyPrisma,
          triggers: surveyPrisma.triggers.map((trigger) => trigger.eventClass.name),
        };
        surveys.push(transformedSurvey);
      }

      return surveys;
    },
    [`getSurveysByActionClassId-${actionClassId}-${page}`],
    {
      tags: [surveyCache.tag.byActionClassId(actionClassId)],
      revalidate: SERVICES_REVALIDATION_INTERVAL,
    }
  )();

  return surveys.map((survey) => ({
    ...survey,
    ...formatSurveyDateFields(survey),
  }));
};

export const getSurveys = async (environmentId: string, page?: number): Promise<TSurvey[]> => {
  const surveys = await unstable_cache(
    async () => {
      validateInputs([environmentId, ZId], [page, ZOptionalNumber]);
      let surveysPrisma;
      try {
        surveysPrisma = await prisma.survey.findMany({
          where: {
            environmentId,
          },
          select: selectSurvey,
          take: page ? ITEMS_PER_PAGE : undefined,
          skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          console.error(error);
          throw new DatabaseError(error.message);
        }

        throw error;
      }

      const surveys: TSurvey[] = [];

      for (const surveyPrisma of surveysPrisma) {
        const transformedSurvey = {
          ...surveyPrisma,
          triggers: surveyPrisma.triggers.map((trigger) => trigger.eventClass.name),
        };
        surveys.push(transformedSurvey);
      }
      return surveys;
    },
    [`getSurveys-${environmentId}-${page}`],
    {
      tags: [surveyCache.tag.byEnvironmentId(environmentId)],
      revalidate: SERVICES_REVALIDATION_INTERVAL,
    }
  )();

  // since the unstable_cache function does not support deserialization of dates, we need to manually deserialize them
  // https://github.com/vercel/next.js/issues/51613
  return surveys.map((survey) => ({
    ...survey,
    ...formatSurveyDateFields(survey),
  }));
};

export async function updateSurvey(updatedSurvey: TSurvey): Promise<TSurvey> {
  validateInputs([updatedSurvey, ZSurvey]);

  const surveyId = updatedSurvey.id;
  let data: any = {};

  const actionClasses = await getActionClasses(updatedSurvey.environmentId);
  const currentSurvey = await getSurvey(surveyId);

  if (!currentSurvey) {
    throw new ResourceNotFoundError("Survey", surveyId);
  }

  const { triggers, attributeFilters, environmentId, ...surveyData } = updatedSurvey;

  if (triggers) {
    const newTriggers: string[] = [];
    const removedTriggers: string[] = [];

    // find added triggers
    for (const trigger of triggers) {
      if (!trigger) {
        continue;
      }
      if (currentSurvey.triggers.find((t) => t === trigger)) {
        continue;
      } else {
        newTriggers.push(trigger);
      }
    }

    // find removed triggers
    for (const trigger of currentSurvey.triggers) {
      if (triggers.find((t: any) => t === trigger)) {
        continue;
      } else {
        removedTriggers.push(trigger);
      }
    }
    // create new triggers
    if (newTriggers.length > 0) {
      data.triggers = {
        ...(data.triggers || []),
        create: newTriggers.map((trigger) => ({
          eventClassId: getActionClassIdFromName(actionClasses, trigger),
        })),
      };
    }
    // delete removed triggers
    if (removedTriggers.length > 0) {
      data.triggers = {
        ...(data.triggers || []),
        deleteMany: {
          eventClassId: {
            in: removedTriggers.map((trigger) => getActionClassIdFromName(actionClasses, trigger)),
          },
        },
      };
    }

    // Revalidation for newly added/removed actionClassId
    revalidateSurveyByActionClassId(actionClasses, [...newTriggers, ...removedTriggers]);
  }

  if (attributeFilters) {
    const newFilters: TSurveyAttributeFilter[] = [];
    const removedFilters: TSurveyAttributeFilter[] = [];

    // find added attribute filters
    for (const attributeFilter of attributeFilters) {
      if (!attributeFilter.attributeClassId || !attributeFilter.condition || !attributeFilter.value) {
        continue;
      }

      if (
        currentSurvey.attributeFilters.find(
          (f) =>
            f.attributeClassId === attributeFilter.attributeClassId &&
            f.condition === attributeFilter.condition &&
            f.value === attributeFilter.value
        )
      ) {
        continue;
      } else {
        newFilters.push({
          attributeClassId: attributeFilter.attributeClassId,
          condition: attributeFilter.condition,
          value: attributeFilter.value,
        });
      }
    }
    // find removed attribute filters
    for (const attributeFilter of currentSurvey.attributeFilters) {
      if (
        attributeFilters.find(
          (f) =>
            f.attributeClassId === attributeFilter.attributeClassId &&
            f.condition === attributeFilter.condition &&
            f.value === attributeFilter.value
        )
      ) {
        continue;
      } else {
        removedFilters.push({
          attributeClassId: attributeFilter.attributeClassId,
          condition: attributeFilter.condition,
          value: attributeFilter.value,
        });
      }
    }

    // create new attribute filters
    if (newFilters.length > 0) {
      data.attributeFilters = {
        ...(data.attributeFilters || []),
        create: newFilters.map((attributeFilter) => ({
          attributeClassId: attributeFilter.attributeClassId,
          condition: attributeFilter.condition,
          value: attributeFilter.value,
        })),
      };
    }
    // delete removed attribute filter
    if (removedFilters.length > 0) {
      // delete all attribute filters that match the removed attribute classes
      await Promise.all(
        removedFilters.map(async (attributeFilter) => {
          await prisma.surveyAttributeFilter.deleteMany({
            where: {
              attributeClassId: attributeFilter.attributeClassId,
            },
          });
        })
      );
    }

    revalidateSurveyByAttributeClassId([...newFilters, ...removedFilters]);
  }

  data = {
    ...surveyData,
    ...data,
  };

  try {
    const prismaSurvey = await prisma.survey.update({
      where: { id: surveyId },
      data,
    });

    const modifiedSurvey: TSurvey = {
      ...prismaSurvey, // Properties from prismaSurvey
      triggers: updatedSurvey.triggers ? updatedSurvey.triggers : [], // Include triggers from updatedSurvey
      attributeFilters: updatedSurvey.attributeFilters ? updatedSurvey.attributeFilters : [], // Include attributeFilters from updatedSurvey
    };

    surveyCache.revalidate({
      id: modifiedSurvey.id,
      environmentId: modifiedSurvey.environmentId,
    });

    return modifiedSurvey;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(error);
      throw new DatabaseError(error.message);
    }

    throw error;
  }
}

export async function deleteSurvey(surveyId: string) {
  validateInputs([surveyId, ZId]);

  const deletedSurvey = await prisma.survey.delete({
    where: {
      id: surveyId,
    },
    select: selectSurvey,
  });

  responseCache.revalidate({
    surveyId,
    environmentId: deletedSurvey.environmentId,
  });
  surveyCache.revalidate({
    id: deletedSurvey.id,
    environmentId: deletedSurvey.environmentId,
  });

  // Revalidate triggers by actionClassId
  deletedSurvey.triggers.forEach((trigger) => {
    surveyCache.revalidate({
      actionClassId: trigger.eventClass.id,
    });
  });
  // Revalidate surveys by attributeClassId
  deletedSurvey.attributeFilters.forEach((attributeFilter) => {
    surveyCache.revalidate({
      attributeClassId: attributeFilter.attributeClassId,
    });
  });

  return deletedSurvey;
}

export async function createSurvey(environmentId: string, surveyBody: TSurveyInput): Promise<TSurvey> {
  validateInputs([environmentId, ZId]);

  if (surveyBody.attributeFilters) {
    revalidateSurveyByAttributeClassId(surveyBody.attributeFilters);
  }

  if (surveyBody.triggers) {
    const actionClasses = await getActionClasses(environmentId);
    revalidateSurveyByActionClassId(actionClasses, surveyBody.triggers);
  }

  // TODO: Create with triggers & attributeFilters
  delete surveyBody.triggers;
  delete surveyBody.attributeFilters;
  const data: Omit<TSurveyInput, "triggers" | "attributeFilters"> = {
    ...surveyBody,
  };

  const survey = await prisma.survey.create({
    data: {
      ...data,
      environment: {
        connect: {
          id: environmentId,
        },
      },
    },
    select: selectSurvey,
  });

  const transformedSurvey = {
    ...survey,
    triggers: survey.triggers.map((trigger) => trigger.eventClass.name),
  };

  captureTelemetry("survey created");

  surveyCache.revalidate({
    id: survey.id,
    environmentId: survey.environmentId,
  });

  return transformedSurvey;
}

export async function duplicateSurvey(environmentId: string, surveyId: string) {
  const existingSurvey = await getSurvey(surveyId);

  if (!existingSurvey) {
    throw new ResourceNotFoundError("Survey", surveyId);
  }

  const actionClasses = await getActionClasses(environmentId);
  const newAttributeFilters = existingSurvey.attributeFilters.map((attributeFilter) => ({
    attributeClassId: attributeFilter.attributeClassId,
    condition: attributeFilter.condition,
    value: attributeFilter.value,
  }));

  // create new survey with the data of the existing survey
  const newSurvey = await prisma.survey.create({
    data: {
      ...existingSurvey,
      id: undefined, // id is auto-generated
      environmentId: undefined, // environmentId is set below
      name: `${existingSurvey.name} (copy)`,
      status: "draft",
      questions: JSON.parse(JSON.stringify(existingSurvey.questions)),
      thankYouCard: JSON.parse(JSON.stringify(existingSurvey.thankYouCard)),
      triggers: {
        create: existingSurvey.triggers.map((trigger) => ({
          eventClassId: getActionClassIdFromName(actionClasses, trigger),
        })),
      },
      attributeFilters: {
        create: newAttributeFilters,
      },
      environment: {
        connect: {
          id: environmentId,
        },
      },
      surveyClosedMessage: existingSurvey.surveyClosedMessage
        ? JSON.parse(JSON.stringify(existingSurvey.surveyClosedMessage))
        : Prisma.JsonNull,
      singleUse: existingSurvey.singleUse
        ? JSON.parse(JSON.stringify(existingSurvey.singleUse))
        : Prisma.JsonNull,
      productOverwrites: existingSurvey.productOverwrites
        ? JSON.parse(JSON.stringify(existingSurvey.productOverwrites))
        : Prisma.JsonNull,
      verifyEmail: existingSurvey.verifyEmail
        ? JSON.parse(JSON.stringify(existingSurvey.verifyEmail))
        : Prisma.JsonNull,
    },
  });

  surveyCache.revalidate({
    id: newSurvey.id,
    environmentId: newSurvey.environmentId,
  });

  // Revalidate surveys by actionClassId
  revalidateSurveyByActionClassId(actionClasses, existingSurvey.triggers);

  // Revalidate surveys by attributeClassId
  revalidateSurveyByAttributeClassId(newAttributeFilters);

  return newSurvey;
}
