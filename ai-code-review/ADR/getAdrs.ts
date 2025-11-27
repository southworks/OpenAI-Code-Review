import { Repository } from "../repository";

/**
 * Retrieves Architecture Decision Records (ADRs) from the repository.
 * @param repository - The repository instance to fetch files from
 * @param adrsFolderPath - The path to the folder containing ADR markdown files
 * @returns A promise that resolves to an array of ADR file contents
 */
export async function getAdrs(repository: Repository, adrsFolderPath: string): Promise<string[]> {
  const adrContent = await repository.GetFilesFromBranch(
    [adrsFolderPath],
    await repository.GetDefaultBranch(),
    (s) => s.toLowerCase().endsWith(".md")
  );
  return adrContent;
}
