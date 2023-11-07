"use client";
import { createSurveyAction } from "../actions";
import TemplateList from "@/app/(app)/environments/[environmentId]/surveys/templates/TemplateList";
import LoadingSpinner from "@formbricks/ui/LoadingSpinner";
import type { TEnvironment } from "@formbricks/types/environment";
import type { TProduct } from "@formbricks/types/product";
import { TSurveyInput } from "@formbricks/types/surveys";
import { TTemplate } from "@formbricks/types/templates";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { TProfile } from "@formbricks/types/profile";

export default function SurveyStarter({
  environmentId,
  environment,
  product,
  profile,
}: {
  environmentId: string;
  environment: TEnvironment;
  product: TProduct;
  profile: TProfile;
}) {
  const [isCreateSurveyLoading, setIsCreateSurveyLoading] = useState(false);
  const router = useRouter();
  const newSurveyFromTemplate = async (template: TTemplate) => {
    setIsCreateSurveyLoading(true);
    const surveyType = environment?.widgetSetupCompleted ? "web" : "link";
    const autoComplete = surveyType === "web" ? 50 : null;
    const augmentedTemplate = {
      ...template.preset,
      type: surveyType,
      autoComplete,
    } as TSurveyInput;
    try {
      const survey = await createSurveyAction(environmentId, augmentedTemplate);
      router.push(`/environments/${environmentId}/surveys/${survey.id}/edit`);
    } catch (e) {
      toast.error("An error occured creating a new survey");
      setIsCreateSurveyLoading(false);
    }
  };
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col py-12">
      {isCreateSurveyLoading ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="px-7 pb-4">
            <h1 className="text-3xl font-extrabold text-slate-700">
              You&apos;re all set! Time to create your first survey.
            </h1>
          </div>
          <TemplateList
            environmentId={environmentId}
            onTemplateClick={(template) => {
              newSurveyFromTemplate(template);
            }}
            environment={environment}
            product={product}
            profile={profile}
          />
        </>
      )}
    </div>
  );
}
