"use client";

import FormbricksSignature from "@/components/preview/FormbricksSignature";
import Progress from "@/components/preview/Progress";
import QuestionConditional from "@/components/preview/QuestionConditional";
import ThankYouCard from "@/components/preview/ThankYouCard";
import ContentWrapper from "@/components/shared/ContentWrapper";
import { useLinkSurveyUtils } from "@/lib/linkSurvey/linkSurvey";
import { cn } from "@formbricks/lib/cn";
import { Confetti } from "@formbricks/ui";
import { ArrowPathIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";
import { TSurvey } from "@formbricks/types/v1/surveys";
import Loading from "@/app/s/[surveyId]/loading";
import { TProduct } from "@formbricks/types/v1/product";
import VerifyEmail from "@/app/s/[surveyId]/VerifyEmail";
import { verifyTokenAction } from "@/app/s/[surveyId]/actions";

interface LinkSurveyProps {
  survey: TSurvey;
  product: TProduct;
}

export default function LinkSurvey({ survey, product }: LinkSurveyProps) {
  const {
    currentQuestion,
    finished,
    loadingElement,
    prefilling,
    progress,
    isPreview,
    lastQuestion,
    initiateCountdown,
    restartSurvey,
    submitResponse,
    goToPreviousQuestion,
    goToNextQuestion,
    storedResponseValue,
  } = useLinkSurveyUtils(survey);

  const showBackButton = progress !== 0 && !finished;
  // Create a reference to the top element
  const topRef = useRef<HTMLDivElement>(null);
  const [autoFocus, setAutofocus] = useState(false);
  const URLParams = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const [shouldRenderVerifyEmail, setShouldRenderVerifyEmail] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);

  const checkVerifyToken = async (verifyToken: string): Promise<boolean> => {
    try {
      const result = await verifyTokenAction(verifyToken, survey.id);
      return result;
    } catch (error) {
      return false;
    }
  };
  useEffect(() => {
    if (survey.verifyEmail) {
      setShouldRenderVerifyEmail(true);
    }
    const verifyToken = URLParams.get("verify");
    if (verifyToken) {
      checkVerifyToken(verifyToken)
        .then((result) => {
          setIsTokenValid(result);
          setShouldRenderVerifyEmail(!result); // Set shouldRenderVerifyEmail based on result
        })
        .catch((error) => {
          console.error("Error checking verify token:", error);
        });
    }
  }, []);

  // Not in an iframe, enable autofocus on input fields.
  useEffect(() => {
    if (window.self === window.top) {
      setAutofocus(true);
    }
  }, []);

  // Scroll to top when the currentQuestion changes
  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollTop = 0;
    }
  }, [currentQuestion]);

  if (!currentQuestion || prefilling) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <Loading />
      </div>
    );
  }

  if (shouldRenderVerifyEmail) {
    if (!isTokenValid) {
      return <VerifyEmail survey={survey} isErrorComponent={true} />;
    }
    return <VerifyEmail survey={survey} />;
  }

  return (
    <>
      <div
        ref={topRef}
        className={cn(
          loadingElement && "animate-pulse opacity-60",
          "flex h-full flex-1 items-center overflow-y-auto bg-white"
        )}>
        <ContentWrapper className={cn(isPreview && "mt-[44px]", "max-h-full w-full md:max-w-lg")}>
          {isPreview && (
            <div className="absolute left-0 top-0 flex w-full items-center justify-between bg-slate-600 p-2 px-4 text-center text-sm text-white shadow-sm">
              <div className="w-20"></div>
              <div className="">Survey Preview 👀</div>
              <button
                className="flex items-center rounded-full bg-slate-500 px-3 py-1 hover:bg-slate-400"
                onClick={() => restartSurvey()}>
                Restart <ArrowPathIcon className="ml-2 h-4 w-4" />
              </button>
            </div>
          )}
          {finished ? (
            <div>
              <Confetti colors={[product.brandColor, "#eee"]} />
              <ThankYouCard
                headline={survey.thankYouCard.headline || "Thank you!"}
                subheader={survey.thankYouCard.subheader || "Your response has been recorded."}
                brandColor={product.brandColor}
                initiateCountdown={initiateCountdown}
              />
            </div>
          ) : (
            <QuestionConditional
              question={currentQuestion}
              brandColor={product.brandColor}
              lastQuestion={lastQuestion}
              onSubmit={submitResponse}
              storedResponseValue={storedResponseValue}
              goToNextQuestion={goToNextQuestion}
              goToPreviousQuestion={showBackButton ? goToPreviousQuestion : undefined}
              autoFocus={autoFocus}
            />
          )}
        </ContentWrapper>
      </div>
      <div className="top-0 z-10 w-full border-b bg-white">
        <div className="mx-auto max-w-md space-y-6 p-6">
          <Progress progress={progress} brandColor={product.brandColor} />
          {product.formbricksSignature && <FormbricksSignature />}
        </div>
      </div>
    </>
  );
}
