import * as tl from "azure-pipelines-task-lib/task";
import { SimpleGit, SimpleGitOptions, simpleGit } from "simple-git";
import binaryExtensions from "./binaryExtensions";

export class Repository {
  private gitOptions: Partial<SimpleGitOptions> = {
    baseDir: `${tl.getVariable("System.DefaultWorkingDirectory")}`,
    binary: "git"
  };

  private readonly _repository: SimpleGit;

  constructor() {
    this._repository = simpleGit(this.gitOptions);
    this._repository.addConfig("core.pager", "cat");
    this._repository.addConfig("core.quotepath", "false");
  }

  public async GetChangedFiles(
    fileExtensions: string | undefined,
    filesToExclude: string | undefined
  ): Promise<string[]> {
    await this._repository.fetch();

    let targetBranch = this.GetTargetBranch();

    let diffs = await this._repository.diff([targetBranch, "--name-only", "--diff-filter=AM"]);
    let files = diffs.split("\n").filter((line) => line.trim().length > 0);
    let filesToReview = files.filter(
      (file) => !binaryExtensions.includes(file.slice(((file.lastIndexOf(".") - 1) >>> 0) + 2))
    );

    if (fileExtensions) {
      console.log(`File extensions specified: ${fileExtensions}`);
      let fileExtensionsToInclude = fileExtensions.trim().split(",");
      filesToReview = filesToReview.filter((file) =>
        fileExtensionsToInclude.includes(file.substring(file.lastIndexOf(".")))
      );
    } else {
      console.log("No file extensions specified. All files will be reviewed.");
    }

    if (filesToExclude) {
      let fileNamesToExclude = filesToExclude.trim().split(",");
      filesToReview = filesToReview.filter(
        (file) => !fileNamesToExclude.includes(file.split("/").pop()!.trim())
      );
    }

    return filesToReview;
  }

  /**
   * Return the contents of all files under `path` on the specified branch.
   * With optional filtering of file paths and file contents.
   * paths: array of paths or directories to search
   * branch: branch name to get files from
   * pathFilter: optional function to filter file paths
   * contentFilter: optional function to filter file contents
   * Each array element returned is the full file content as a string.
   */
  public async GetFilesFromBranch(
    paths: string[],
    branch: string,
    pathFilter?: (filePath: string) => boolean,
    contentFilter?: (content: string) => boolean
  ): Promise<string[]> {
    if (paths.length === 0) {
      return [];
    }

    if (!branch || branch.trim().length === 0) {
      throw new Error(`Branch name is required to get files.`);
    }

    await this._repository.fetch();

    const contents: string[] = [];

    for (const p of paths) {
      let rawList: string;
      try {
        rawList = await this._repository.raw([
          "ls-tree",
          "-r",
          "--name-only",
          `origin/${branch}`,
          p
        ]);
      } catch (err) {
        console.log(`Path not found on origin/${branch}: ${p}`);
        continue;
      }

      const files = rawList
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const filteredFiles = pathFilter ? files.filter(pathFilter) : files;

      for (const filePath of filteredFiles) {
        try {
          // git show origin/<branch>:<path/to/file>
          const content = await this._repository.raw(["show", `origin/${branch}:${filePath}`]);
          if (
            content.toString().trim().length === 0 ||
            (contentFilter && !contentFilter(content.toString()))
          ) {
            continue;
          }
          console.log(`Read file ${filePath} from origin/${branch}`);
          contents.push(content);
        } catch (e) {
          // If a file can't be read, log and continue
          console.log(`Could not read file ${filePath} from origin/${branch}:${e}`);
        }
      }
    }

    return contents;
  }

  public async GetDefaultBranch(): Promise<string> {
    // Try to resolve origin/HEAD symbolic ref first (preferred)
    try {
      const symRef = await this._repository.raw(["symbolic-ref", "refs/remotes/origin/HEAD"]);
      // result like: refs/remotes/origin/main
      const parts = symRef.trim().split("/");
      const branch = parts[parts.length - 1];
      if (branch) return branch;
    } catch (e) {
      // ignore and try alternative
    }

    // Fallback: parse `git remote show origin` output
    try {
      const remoteShow = await this._repository.raw(["remote", "show", "origin"]);
      const match = remoteShow.match(/HEAD branch: (.+)/);
      if (match && match[1]) return match[1].trim();
    } catch (e) {
      // ignore and fallback to defaults
    }

    // Final fallback: common default branch name
    return "main";
  }

  public async GetDiff(fileName: string): Promise<string> {
    let targetBranch = this.GetTargetBranch();

    let diff = await this._repository.diff([targetBranch, "--", fileName]);

    return diff;
  }

  private GetTargetBranch(): string {
    let targetBranchName = tl.getVariable("System.PullRequest.TargetBranchName");

    if (!targetBranchName) {
      targetBranchName = tl
        .getVariable("System.PullRequest.TargetBranch")
        ?.replace("refs/heads/", "");
    }

    if (!targetBranchName) {
      throw new Error(`Could not find target branch`);
    }

    return `origin/${targetBranchName}`;
  }
}
