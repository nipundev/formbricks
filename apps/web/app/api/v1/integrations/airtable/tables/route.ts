import { authOptions } from "@formbricks/lib/authOptions";
import { getTables } from "@formbricks/lib/airtable/service";
import { hasUserEnvironmentAccess } from "@formbricks/lib/environment/auth";
import { getIntegrationByType } from "@formbricks/lib/integration/service";
import { TIntegrationAirtable } from "@formbricks/types/integration/airtable";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import * as z from "zod";

export async function GET(req: NextRequest) {
  const url = req.url;
  const environmentId = req.headers.get("environmentId");
  const queryParams = new URLSearchParams(url.split("?")[1]);
  const session = await getServerSession(authOptions);
  const baseId = z.string().safeParse(queryParams.get("baseId"));

  if (!baseId.success) {
    return NextResponse.json({ Error: "Base Id is Required" }, { status: 400 });
  }

  if (!session) {
    return NextResponse.json({ Error: "Invalid session" }, { status: 400 });
  }

  if (!environmentId) {
    return NextResponse.json({ Error: "environmentId is missing" }, { status: 400 });
  }

  const canUserAccessEnvironment = await hasUserEnvironmentAccess(session?.user.id, environmentId);
  if (!canUserAccessEnvironment || !environmentId) {
    return NextResponse.json({ Error: "You dont have access to environment" }, { status: 401 });
  }

  const integration = (await getIntegrationByType(environmentId, "airtable")) as TIntegrationAirtable;
  console.log(integration);

  if (!integration) {
    return NextResponse.json({ Error: "integration not found" }, { status: 401 });
  }

  const tables = await getTables(integration.config.key, baseId.data);

  return NextResponse.json(tables, { status: 200 });
}
