import { Result } from "@formbricks/types/errorHandlers";
import { NetworkError } from "@formbricks/types/errors";
import { makeRequest } from "../../utils/makeRequest";
import { TDisplay, TDisplayCreateInput, TDisplayUpdateInput } from "@formbricks/types/displays";

export class DisplayAPI {
  private apiHost: string;
  private environmentId: string;

  constructor(baseUrl: string, environmentId: string) {
    this.apiHost = baseUrl;
    this.environmentId = environmentId;
  }

  async create(
    displayInput: Omit<TDisplayCreateInput, "environmentId">
  ): Promise<Result<TDisplay, NetworkError | Error>> {
    return makeRequest(this.apiHost, `/api/v1/client/${this.environmentId}/displays`, "POST", displayInput);
  }

  async update(
    displayId: string,
    displayInput: TDisplayUpdateInput
  ): Promise<Result<TDisplay, NetworkError | Error>> {
    return makeRequest(
      this.apiHost,
      `/api/v1/client/${this.environmentId}/displays/${displayId}`,
      "PUT",
      displayInput
    );
  }
}
