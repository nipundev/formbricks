import { TResponseData } from "@formbricks/types/responses";
import type { TSurveyMultipleChoiceMultiQuestion } from "@formbricks/types/surveys";
import { useMemo, useRef, useState, useEffect, useCallback } from "preact/hooks";
import { cn, shuffleQuestions } from "../lib/utils";
import { BackButton } from "./BackButton";
import Headline from "./Headline";
import Subheader from "./Subheader";
import SubmitButton from "./SubmitButton";

interface MultipleChoiceMultiProps {
  question: TSurveyMultipleChoiceMultiQuestion;
  value: string | number | string[];
  onChange: (responseData: TResponseData) => void;
  onSubmit: (data: TResponseData) => void;
  onBack: () => void;
  isFirstQuestion: boolean;
  isLastQuestion: boolean;
  brandColor: string;
}

export default function MultipleChoiceMultiQuestion({
  question,
  value,
  onChange,
  onSubmit,
  onBack,
  isFirstQuestion,
  isLastQuestion,
  brandColor,
}: MultipleChoiceMultiProps) {
  const getChoicesWithoutOtherLabels = useCallback(
    () => question.choices.filter((choice) => choice.id !== "other").map((item) => item.label),
    [question]
  );

  const [otherSelected, setOtherSelected] = useState(
    !!value &&
      ((Array.isArray(value) ? value : [value]) as string[]).some((item) => {
        return getChoicesWithoutOtherLabels().includes(item) === false;
      })
  ); // check if the value contains any string which is not in `choicesWithoutOther`, if it is there, it must be other value which make the initial value true

  const [otherValue, setOtherValue] = useState(
    (Array.isArray(value) && value.filter((v) => !question.choices.find((c) => c.label === v))[0]) || ""
  ); // initially set to the first value that is not in choices

  const questionChoices = useMemo(() => {
    if (!question.choices) {
      return [];
    }
    const choicesWithoutOther = question.choices.filter((choice) => choice.id !== "other");
    if (question.shuffleOption) {
      return shuffleQuestions(choicesWithoutOther, question.shuffleOption);
    }
    return choicesWithoutOther;
  }, [question.choices, question.shuffleOption]);

  const otherOption = useMemo(
    () => question.choices.find((choice) => choice.id === "other"),
    [question.choices]
  );

  const otherSpecify = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (otherSelected) {
      otherSpecify.current?.focus();
    }
  }, [otherSelected]);

  const addItem = (item: string) => {
    if (Array.isArray(value)) {
      return onChange({ [question.id]: [...value, item] });
    }
    return onChange({ [question.id]: [item] }); // if not array, make it an array
  };

  const removeItem = (item: string) => {
    if (Array.isArray(value)) {
      return onChange({ [question.id]: value.filter((i) => i !== item) });
    }
    return onChange({ [question.id]: [] }); // if not array, make it an array
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const newValue = (value as string[])?.filter((item) => {
          return getChoicesWithoutOtherLabels().includes(item) || item === otherValue;
        }); // filter out all those values which are either in getChoicesWithoutOtherLabels() (i.e. selected by checkbox) or the latest entered otherValue
        onChange({ [question.id]: newValue });
        onSubmit({ [question.id]: newValue });
      }}
      className="w-full">
      {question.imageUrl && (
        <div className="my-4 rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.imageUrl} alt="question-image" className={"my-4 rounded-md"} />
        </div>
      )}
      <Headline headline={question.headline} questionId={question.id} required={question.required} />
      <Subheader subheader={question.subheader} questionId={question.id} />
      <div className="mt-4">
        <fieldset>
          <legend className="sr-only">Options</legend>
          <div className="relative max-h-[42vh] space-y-2 overflow-y-auto rounded-md bg-white py-0.5 pr-2">
            {questionChoices.map((choice, idx) => (
              <label
                key={choice.id}
                tabIndex={idx + 1}
                onKeyDown={(e) => {
                  if (e.key == "Enter") {
                    if (Array.isArray(value) && value.includes(choice.label)) {
                      removeItem(choice.label);
                    } else {
                      addItem(choice.label);
                    }
                  }
                }}
                className={cn(
                  value === choice.label ? "z-10 border-slate-400 bg-slate-50" : "border-gray-200",
                  "relative flex cursor-pointer flex-col rounded-md border p-4 text-slate-800 focus-within:border-slate-400 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none "
                )}>
                <span className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    id={choice.id}
                    name={question.id}
                    tabIndex={-1}
                    value={choice.label}
                    className="h-4 w-4 border border-slate-300 focus:ring-0 focus:ring-offset-0"
                    aria-labelledby={`${choice.id}-label`}
                    onChange={(e) => {
                      if ((e.target as HTMLInputElement)?.checked) {
                        addItem(choice.label);
                      } else {
                        removeItem(choice.label);
                      }
                    }}
                    checked={Array.isArray(value) && value.includes(choice.label)}
                    style={{ borderColor: brandColor, color: brandColor }}
                    required={
                      question.required && Array.isArray(value) && value.length ? false : question.required
                    }
                  />
                  <span id={`${choice.id}-label`} className="ml-3 font-medium">
                    {choice.label}
                  </span>
                </span>
              </label>
            ))}
            {otherOption && (
              <label
                tabIndex={questionChoices.length + 1}
                className={cn(
                  value === otherOption.label ? "z-10 border-slate-400 bg-slate-50" : "border-gray-200",
                  "relative flex cursor-pointer flex-col rounded-md border p-4 text-slate-800 focus-within:border-slate-400 focus-within:bg-slate-50  hover:bg-slate-50 focus:outline-none"
                )}
                onKeyDown={(e) => {
                  if (e.key == "Enter") {
                    setOtherSelected(!otherSelected);
                  }
                }}>
                <span className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    tabIndex={-1}
                    id={otherOption.id}
                    name={question.id}
                    value={otherOption.label}
                    className="h-4 w-4 border border-slate-300 focus:ring-0 focus:ring-offset-0"
                    aria-labelledby={`${otherOption.id}-label`}
                    onChange={(e) => {
                      setOtherSelected(!otherSelected);
                      if ((e.target as HTMLInputElement)?.checked) {
                        if (!otherValue) return;
                        addItem(otherValue);
                      } else {
                        removeItem(otherValue);
                      }
                    }}
                    checked={otherSelected}
                    style={{ borderColor: brandColor, color: brandColor }}
                  />
                  <span id={`${otherOption.id}-label`} className="ml-3 font-medium">
                    {otherOption.label}
                  </span>
                </span>
                {otherSelected && (
                  <input
                    ref={otherSpecify}
                    id={`${otherOption.id}-label`}
                    name={question.id}
                    tabIndex={questionChoices.length + 1}
                    value={otherValue}
                    onChange={(e) => {
                      setOtherValue(e.currentTarget.value);
                      addItem(e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key == "Enter") {
                        setTimeout(() => {
                          onSubmit({ [question.id]: value });
                        }, 100);
                      }
                    }}
                    placeholder="Please specify"
                    className="mt-3 flex h-10 w-full rounded-md border border-slate-300 bg-transparent bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none  focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-500 dark:text-slate-300"
                    required={question.required}
                    aria-labelledby={`${otherOption.id}-label`}
                  />
                )}
              </label>
            )}
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex w-full justify-between">
        {!isFirstQuestion && (
          <BackButton
            tabIndex={questionChoices.length + 3}
            backButtonLabel={question.backButtonLabel}
            onClick={onBack}
          />
        )}
        <div></div>
        <SubmitButton
          tabIndex={questionChoices.length + 2}
          buttonLabel={question.buttonLabel}
          isLastQuestion={isLastQuestion}
          brandColor={brandColor}
          onClick={() => {}}
        />
      </div>
    </form>
  );
}
