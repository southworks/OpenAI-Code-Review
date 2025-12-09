import { Repository } from "../repository";
import tl = require("azure-pipelines-task-lib/task");
import { DevOpsWikiService, DevOpsWikiOptions } from "../devOpsWikiService";

/**
 * Retrieves Architecture Decision Records (ADRs) from the repository.
 * @param repository - The repository instance to fetch files from
 * @param adrsFolderPath - The path to the folder containing ADR markdown files
 * @param adrsExtensions - Array of the extensions (suffix including extension) used to filter files within folder
 * @returns A promise that resolves to an array of ADR file contents
 */

export async function getAdrs(
  repository: Repository,
  adrsFolderPath: string,
  adrsExtensions: string[] = []
): Promise<string[]> {
  let fileExtensions = [".md", ".txt", ".html"];
  if (adrsExtensions.length) {
    fileExtensions = adrsExtensions;
  }

  const adrContent = await repository.GetFilesFromBranch(
    [adrsFolderPath],
    await repository.GetDefaultBranch(),
    (s) => fileExtensions.some((ext) => s.toLowerCase().endsWith(ext))
  );
  return adrContent;
}

export async function getAllAdrs(localRepo: Repository): Promise<string[]> {
  let adrContent: string[] = [];

  // Read settings from task inputs
  // ADRs from local repository
  const adrsLocalFolderPath = tl.getInput("adrsLocalFolderPath", false) || "adrs";
  const adrsLocalFileExtensions = tl.getInput("adrsLocalFileExtensions") || "";
  const reviewWithLocalADRs = tl.getBoolInput("reviewWithLocalADRs", false);
  const adrRemoteFolderPath = tl.getInput("adrsRemoteFolderPath", false) || "adrs";

  // ADRs from remote repository
  const adrRemoteFileExtensions = tl.getInput("adrsRemoteFileExtensions") || "";
  const reviewWithRemoteADRs = tl.getBoolInput("reviewWithRemoteADRs", false);
  const adrRemoteRepositoryUrl = tl.getInput("adrRemoteRepository", false) || "";

  // ADRs from local DevOps Wiki
  const reviewWithLocalWikiADRs = tl.getBoolInput("reviewWithLocalWikiADRs", false);
  const adrsLocalWikiPath = tl.getInput("adrsLocalWikiPath", false) || "/";
  const adrsLocalWikiToken = tl.getInput("adrsLocalWikiToken", false) || "";
  const adrsLocalWikiId = tl.getInput("adrsLocalWikiId", false) || "";
  const adrsLocalProjectId = tl.getInput("adrsLocalProjectId", false) || "";

  // ADRs from remote DevOps Wiki
  const adrsRemoteWikiUrl = tl.getInput("adrsRemoteWikiUrl", false) || "";
  const reviewWithRemoteWikiADRs = tl.getBoolInput("reviewWithRemoteWikiADRs", false);
  const adrsRemoteWikiPath = tl.getInput("adrsRemoteWikiPath", false) || "/";
  const adrsRemoteWikiToken = tl.getInput("adrsRemoteWikiToken", false) || "";
  const adrsRemoteWikiId = tl.getInput("adrsRemoteWikiId", false) || "";
  const adrsRemoteProjectId = tl.getInput("adrsRemoteProjectId", false) || "";

  // Get ADRs from local repository
  if (reviewWithLocalADRs) {
    const adrsExtensions = getArrayFromCSV(adrsLocalFileExtensions);
    adrContent = await getAdrs(localRepo, adrsLocalFolderPath, adrsExtensions);
    console.info(`Found ${adrContent.length} ADRs to use in the review.`);
  }

  if (reviewWithRemoteADRs) {
    if (adrRemoteRepositoryUrl.trim() === "") {
      tl.setResult(
        tl.TaskResult.Failed,
        "ADR Remote Repository URL must be provided when 'Review with Remote ADRs' is enabled."
      );
      return adrContent;
    }

    let remoteRepo = new Repository(undefined, adrRemoteRepositoryUrl);
    try {
      await remoteRepo.Clone();
      const adrsExtensions = getArrayFromCSV(adrRemoteFileExtensions);
      const remoteAdrs = await getAdrs(remoteRepo, adrRemoteFolderPath, adrsExtensions);
      adrContent = [...adrContent, ...remoteAdrs];
      console.info(`Found ${remoteAdrs.length} remote ADRs to use in the review.`);
    } catch (e) {
      tl.setResult(tl.TaskResult.Failed, `Failed to read ADRs from remote repository: ${e}`);
      return adrContent;
    }
  }

  if (reviewWithLocalWikiADRs) {
    if (adrsLocalWikiToken.trim() === "") {
      tl.setResult(
        tl.TaskResult.Failed,
        "ADR Local Wiki Token must be provided when 'Review with Local Wiki ADRs' is enabled."
      );
      return adrContent;
    }
    const options: DevOpsWikiOptions = {
      token: adrsLocalWikiToken,
      wikiId: adrsLocalWikiId && adrsLocalWikiId.trim().length > 0 ? adrsLocalWikiId : undefined,
      projectId:
        adrsLocalProjectId && adrsLocalProjectId.trim().length > 0 ? adrsLocalProjectId : undefined
    };
    const devOpsWikiService = new DevOpsWikiService(options);
    try {
      const wikiAdrsContent = await devOpsWikiService.getPages(`${adrsLocalWikiPath}`);
      console.info(`Found ${wikiAdrsContent.length} ADR pages in the wiki.`);
      adrContent = [...adrContent, ...wikiAdrsContent];
    } catch (e) {
      tl.setResult(tl.TaskResult.Failed, `Failed to read ADRs from DevOps Wiki: ${e}`);
      return adrContent;
    }
  }

  if (reviewWithRemoteWikiADRs) {
    if (adrsRemoteWikiUrl.trim() === "") {
      tl.setResult(
        tl.TaskResult.Failed,
        "ADR Remote Wiki URL must be provided when 'Review with Remote Wiki ADRs' is enabled."
      );
      return adrContent;
    }

    if (adrsRemoteWikiToken.trim() === "") {
      tl.setResult(
        tl.TaskResult.Failed,
        "ADR Remote Wiki Token must be provided when 'Review with Remote Wiki ADRs' is enabled."
      );
      return adrContent;
    }

    if (adrsRemoteProjectId.trim() === "") {
      tl.setResult(
        tl.TaskResult.Failed,
        "ADR Remote Project ID must be provided when 'Review with Remote Wiki ADRs' is enabled."
      );
      return adrContent;
    }

    const options: DevOpsWikiOptions = {
      collectionUri: adrsRemoteWikiUrl,
      token: adrsRemoteWikiToken,
      wikiId: adrsRemoteWikiId,
      projectId: adrsRemoteProjectId
    };
    const devOpsWikiService = new DevOpsWikiService(options);
    try {
      const wikiAdrsContent = await devOpsWikiService.getPages(`${adrsRemoteWikiPath}`);
      console.info(`Found ${wikiAdrsContent.length} ADR pages in the remote wiki.`);
      adrContent = [...adrContent, ...wikiAdrsContent];
    } catch (e) {
      tl.setResult(tl.TaskResult.Failed, `Failed to read ADRs from remote DevOps Wiki: ${e}`);
      return adrContent;
    }
  }

  return adrContent;
}

function getArrayFromCSV(csv: string) {
  if (!csv.trim()) {
    return [];
  }
  return csv.split(",");
}
