import { Repository } from "../repository";

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
  let fileExtensions = ['.md', '.txt', '.html'];
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
