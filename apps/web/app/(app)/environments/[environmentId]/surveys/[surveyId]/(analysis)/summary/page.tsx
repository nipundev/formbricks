export const revalidate = REVALIDATION_INTERVAL;

import { authOptions } from "@/app/api/auth/[...nextauth]/authOptions";
import { getAnalysisData } from "@/app/(app)/environments/[environmentId]/surveys/[surveyId]/(analysis)/data";
import { getServerSession } from "next-auth";
import ResponsesLimitReachedBanner from "../ResponsesLimitReachedBanner";
import SummaryPage from "./SummaryPage";
import { REVALIDATION_INTERVAL, SURVEY_BASE_URL } from "@formbricks/lib/constants";

export default async function Page({ params }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    throw new Error("Unauthorized");
  }
  const { responses, survey } = await getAnalysisData(params.surveyId, params.environmentId);

  return (
    <>
      <ResponsesLimitReachedBanner environmentId={params.environmentId} surveyId={params.surveyId} />
      <SummaryPage
        environmentId={params.environmentId}
        responses={responses}
        survey={survey}
        surveyId={params.surveyId}
        surveyBaseUrl={SURVEY_BASE_URL}
      />
    </>
  );
}
