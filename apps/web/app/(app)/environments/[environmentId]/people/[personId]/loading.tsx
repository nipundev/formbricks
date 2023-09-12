import {
  ActivityItemIcon,
  ActivityItemPopover,
} from "@/app/(app)/environments/[environmentId]/people/[personId]/(activitySection)/ActivityItemComponents";
import { TActivityFeedItem } from "@formbricks/types/v1/activity";
import { BackIcon } from "@formbricks/ui";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { TrashIcon } from "lucide-react";

export default function Loading() {
  const unifiedList: TActivityFeedItem[] = [
    {
      id: "clk9o7gnu000kz8kw4nb26o21",
      type: "event",
      actionType: "noCode",
      createdAt: new Date(),
      actionLabel: "Loading User Acitivity",
      updatedAt: null,
      attributeLabel: null,
      attributeValue: null,
      actionDescription: null,
      displaySurveyName: null,
    },
    {
      id: "clk9o7fwc000iz8kw4s0ha0ql",
      type: "event",
      actionType: "automatic",
      createdAt: new Date(),
      actionLabel: "Loading User Session Info",
      updatedAt: null,
      attributeLabel: null,
      attributeValue: null,
      actionDescription: null,
      displaySurveyName: null,
    },
  ];
  return (
    <div>
      <main className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pointer-events-none animate-pulse cursor-not-allowed select-none">
          <button className="inline-flex pt-5 text-sm text-slate-500">
            <BackIcon className="mr-2 h-5 w-5" />
            Back
          </button>
        </div>
        <div className="flex items-baseline justify-between border-b border-slate-200 pb-6 pt-4">
          <h1 className="ph-no-capture text-4xl font-bold tracking-tight text-slate-900">
            <span className="animate-pulse rounded-full">Fetching user</span>
          </h1>
          <div className="flex items-center space-x-3">
            <button className="pointer-events-none animate-pulse cursor-not-allowed select-none">
              <TrashIcon className="h-5 w-5 text-slate-500 hover:text-red-700" />
            </button>
          </div>
        </div>
        <section className="pb-24 pt-6">
          <div className="grid grid-cols-1 gap-x-8  md:grid-cols-4">
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-700">Attributes</h2>
              <div>
                <dt className="text-sm font-medium text-slate-500">Email</dt>
                <dd className="ph-no-capture mt-1 text-sm text-slate-900">
                  <span className="animate-pulse text-slate-300">Loading</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">User Id</dt>
                <dd className="ph-no-capture mt-1 text-sm text-slate-900">
                  <span className="animate-pulse text-slate-300">Loading</span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Formbricks Id (internal)</dt>
                <dd className="mt-1 animate-pulse text-sm text-slate-300">Loading</dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">Sessions</dt>
                <dd className="mt-1 animate-pulse text-sm text-slate-300">Loading</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Responses</dt>
                <dd className="mt-1 animate-pulse text-sm text-slate-300">Loading</dd>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between pb-6">
                <h2 className="text-lg font-bold text-slate-700">Responses</h2>
                <div className="text-right">
                  <button className="hover:text-brand-dark pointer-events-none flex animate-pulse cursor-not-allowed select-none items-center px-1 text-slate-800">
                    <ArrowsUpDownIcon className="inline h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="group space-y-4 rounded-lg bg-white p-6 ">
                <div className="flex items-center space-x-4">
                  <div className="h-12 w-12 flex-shrink-0 rounded-full bg-slate-100"></div>
                  <div className=" h-6 w-full rounded-full bg-slate-100"></div>
                </div>
                <div className="space-y-4">
                  <div className="h-12 w-full rounded-full bg-slate-100"></div>
                  <div className=" flex h-12 w-full items-center justify-center rounded-full bg-slate-50 text-sm text-slate-500 hover:bg-slate-100">
                    <span className="animate-pulse text-center">Loading user responses</span>
                  </div>
                  <div className="h-12 w-full rounded-full bg-slate-50/50"></div>
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="flex items-center justify-between pb-6">
                <h2 className="text-lg font-bold text-slate-700">Activity Timeline</h2>
                <div className="text-right">
                  <button className="hover:text-brand-dark pointer-events-none flex animate-pulse cursor-not-allowed select-none items-center px-1 text-slate-800">
                    <ArrowsUpDownIcon className="inline h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                {unifiedList.map((activityItem) => (
                  <li key={activityItem.id} className="list-none">
                    <div className="relative pb-12">
                      <span
                        className="absolute left-6 top-4 -ml-px h-full w-0.5 bg-slate-200"
                        aria-hidden="true"
                      />
                      <div className="relative animate-pulse cursor-not-allowed select-none">
                        <ActivityItemPopover activityItem={activityItem}>
                          <div className="flex cursor-not-allowed select-none items-center space-x-3">
                            <ActivityItemIcon activityItem={activityItem} />
                            <div className="font-semibold text-slate-700">Loading</div>
                          </div>
                        </ActivityItemPopover>
                      </div>
                    </div>
                  </li>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
