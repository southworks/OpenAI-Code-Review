import { Repository } from "../repository";

/**
 * Retrieves Architecture Decision Records (ADRs) from the local repository.
 * @param repository - The repository instance to fetch files from
 * @param adrsFolderPath - The path to the folder containing ADR markdown files
 * @returns A promise that resolves to an array of ADR file contents
 */
async function getAdrsFromLocalRepo(
  repository: Repository,
  adrsFolderPath: string
): Promise<string[]> {
  const adrContent = await repository.GetFilesFromBranch(
    [adrsFolderPath],
    await repository.GetDefaultBranch(),
    (s) => s.toLowerCase().endsWith(".md")
  );
  return adrContent;
}

/**
 * TODO: Implement this function in Release 2
 * Retrieves Architecture Decision Records (ADRs) from a central repository.
 * @params TBD
 * @returns A promise that resolves to an array of ADR file contents (currently returns empty array)
 */
async function getAdrsFromCentralRepo(
): Promise<string[]> {
  return [];
}

/**
 * Retrieves all Architecture Decision Records (ADRs) from both local and central repositories.
 * ADRs document architectural decisions made throughout the design process with context-specific justifications and implications.
 * @see https://learn.microsoft.com/en-us/azure/well-architected/architect-role/architecture-decision-record
 * @param repository - The repository instance to fetch files from
 * @param reviewWithADRs - Flag indicating whether to include ADRs in the review
 * @param adrsFolderPath - The path to the folder containing ADR markdown files
 * @returns A promise that resolves to an array containing all ADR file contents from both sources
 */
export async function getAdrs(
  repository: Repository,
  reviewWithADRs: boolean,
  adrsFolderPath: string
): Promise<string[]> {
  if (!reviewWithADRs) {
    return [];
  }
  
  const localAdrs = await getAdrsFromLocalRepo(repository, adrsFolderPath);
  const centralAdrs = await getAdrsFromCentralRepo();
  return [...localAdrs, ...centralAdrs];
}

