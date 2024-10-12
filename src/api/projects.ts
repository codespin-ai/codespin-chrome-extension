import { withDisposable } from "../IDisposable.js";
import {
  CODESPIN_GET_PROJECTS,
  Project,
  Result,
  UNKNOWN,
} from "../messageTypes.js";
import { getMessageBrokerClient } from "./broker.js";
import { validateFetch } from "./validateFetch.js";

export async function getProjects(): Promise<
  Result<Project[], typeof UNKNOWN> | undefined
> {
  return await withDisposable(getMessageBrokerClient, async (broker) => {
    const result = await broker.send(CODESPIN_GET_PROJECTS, {});

    if (result.success) {
      return result;
    } else {
      return validateFetch(result, async (cause) => getProjects());
    }
  });
}
