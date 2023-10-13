import "server-only";

import { prisma } from "@formbricks/database";
import {
  TResponse,
  TResponseInput,
  TResponseUpdateInput,
  ZResponseInput,
  ZResponseUpdateInput,
} from "@formbricks/types/v1/responses";
import { DatabaseError, ResourceNotFoundError } from "@formbricks/types/v1/errors";
import { TPerson } from "@formbricks/types/v1/people";
import { TTag } from "@formbricks/types/v1/tags";
import { Prisma } from "@prisma/client";
import { getPerson, transformPrismaPerson } from "../person/service";
import { captureTelemetry } from "../telemetry";
import { validateInputs } from "../utils/validate";
import { ZId } from "@formbricks/types/v1/environment";
import { revalidateTag } from "next/cache";
import { deleteDisplayByResponseId } from "../display/service";
import { ZString, ZOptionalNumber } from "@formbricks/types/v1/common";
import { ITEMS_PER_PAGE } from "../constants";

const responseSelection = {
  id: true,
  createdAt: true,
  updatedAt: true,
  surveyId: true,
  finished: true,
  data: true,
  meta: true,
  personAttributes: true,
  singleUseId: true,
  person: {
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      environmentId: true,
      attributes: {
        select: {
          value: true,
          attributeClass: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  },
  notes: {
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      text: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      isResolved: true,
      isEdited: true,
    },
  },
  tags: {
    select: {
      tag: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          name: true,
          environmentId: true,
        },
      },
    },
  },
};

export const getResponsesCacheTag = (surveyId: string) => `surveys-${surveyId}-responses`;

export const getResponseCacheTag = (responseId: string) => `responses-${responseId}`;

export const getResponsesByPersonId = async (
  personId: string,
  page?: number
): Promise<Array<TResponse> | null> => {
  validateInputs([personId, ZId], [page, ZOptionalNumber]);

  try {
    const responsePrisma = await prisma.response.findMany({
      where: {
        personId,
      },
      select: responseSelection,
      take: page ? ITEMS_PER_PAGE : undefined,
      skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
    });

    if (!responsePrisma) {
      throw new ResourceNotFoundError("Response from PersonId", personId);
    }

    let responses: Array<TResponse> = [];

    responsePrisma.forEach((response) => {
      responses.push({
        ...response,
        person: response.person ? transformPrismaPerson(response.person) : null,
        tags: response.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
      });
    });

    return responses;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const getResponseBySingleUseId = async (
  surveyId: string,
  singleUseId?: string
): Promise<TResponse | null> => {
  validateInputs([surveyId, ZId], [singleUseId, ZString]);

  try {
    if (!singleUseId) {
      return null;
    }
    const responsePrisma = await prisma.response.findUnique({
      where: {
        surveyId_singleUseId: { surveyId, singleUseId },
      },
      select: responseSelection,
    });

    if (!responsePrisma) {
      return null;
    }

    const response: TResponse = {
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    };

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const createResponse = async (responseInput: Partial<TResponseInput>): Promise<TResponse> => {
  validateInputs([responseInput, ZResponseInput.partial()]);
  captureTelemetry("response created");

  try {
    let person: TPerson | null = null;

    if (responseInput.personId) {
      person = await getPerson(responseInput.personId);
    }

    const responsePrisma = await prisma.response.create({
      data: {
        survey: {
          connect: {
            id: responseInput.surveyId,
          },
        },
        finished: responseInput.finished,
        data: responseInput.data,
        ...(responseInput.personId && {
          person: {
            connect: {
              id: responseInput.personId,
            },
          },
          personAttributes: person?.attributes,
        }),
        ...(responseInput.meta && ({ meta: responseInput?.meta } as Prisma.JsonObject)),
        singleUseId: responseInput.singleUseId,
      },
      select: responseSelection,
    });

    const response: TResponse = {
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    };

    if (response.surveyId) {
      revalidateTag(getResponsesCacheTag(response.surveyId));
    }

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const getResponse = async (responseId: string): Promise<TResponse | null> => {
  validateInputs([responseId, ZId]);

  try {
    const responsePrisma = await prisma.response.findUnique({
      where: {
        id: responseId,
      },
      select: responseSelection,
    });

    if (!responsePrisma) {
      throw new ResourceNotFoundError("Response", responseId);
    }

    const response: TResponse = {
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    };

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const getSurveyResponses = async (surveyId: string, page?: number): Promise<TResponse[]> => {
  validateInputs([surveyId, ZId], [page, ZOptionalNumber]);

  try {
    const responses = await prisma.response.findMany({
      where: {
        surveyId,
      },
      select: responseSelection,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      take: page ? ITEMS_PER_PAGE : undefined,
      skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
    });

    const transformedResponses: TResponse[] = responses.map((responsePrisma) => ({
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    }));

    return transformedResponses;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const getEnvironmentResponses = async (environmentId: string, page?: number): Promise<TResponse[]> => {
  validateInputs([environmentId, ZId], [page, ZOptionalNumber]);

  try {
    const responses = await prisma.response.findMany({
      where: {
        survey: {
          environmentId,
        },
      },
      select: responseSelection,
      orderBy: [
        {
          createdAt: "desc",
        },
      ],
      take: page ? ITEMS_PER_PAGE : undefined,
      skip: page ? ITEMS_PER_PAGE * (page - 1) : undefined,
    });

    const transformedResponses: TResponse[] = responses.map((responsePrisma) => ({
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    }));

    return transformedResponses;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const updateResponse = async (
  responseId: string,
  responseInput: TResponseUpdateInput
): Promise<TResponse> => {
  validateInputs([responseId, ZId], [responseInput, ZResponseUpdateInput]);
  try {
    const currentResponse = await getResponse(responseId);

    if (!currentResponse) {
      throw new ResourceNotFoundError("Response", responseId);
    }

    // merge data object
    const data = {
      ...currentResponse.data,
      ...responseInput.data,
    };

    const responsePrisma = await prisma.response.update({
      where: {
        id: responseId,
      },
      data: {
        finished: responseInput.finished,
        data,
      },
      select: responseSelection,
    });

    const response: TResponse = {
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    };

    if (response.surveyId) {
      revalidateTag(getResponsesCacheTag(response.surveyId));
    }

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};

export const deleteResponse = async (responseId: string): Promise<TResponse> => {
  validateInputs([responseId, ZId]);
  try {
    const responsePrisma = await prisma.response.delete({
      where: {
        id: responseId,
      },
      select: responseSelection,
    });

    const response: TResponse = {
      ...responsePrisma,
      person: responsePrisma.person ? transformPrismaPerson(responsePrisma.person) : null,
      tags: responsePrisma.tags.map((tagPrisma: { tag: TTag }) => tagPrisma.tag),
    };
    deleteDisplayByResponseId(responseId, response.surveyId);
    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      throw new DatabaseError("Database operation failed");
    }

    throw error;
  }
};
