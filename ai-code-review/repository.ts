import * as tl from "azure-pipelines-task-lib/task";
import { SimpleGit, SimpleGitOptions, simpleGit } from "simple-git";
import binaryExtensions from "./binaryExtensions";

export class Repository {

    private gitOptions: Partial<SimpleGitOptions> = {
        baseDir: `${tl.getVariable('System.DefaultWorkingDirectory')}`,
        binary: 'git'
    };

    private readonly _repository: SimpleGit;

    constructor() {
        this._repository = simpleGit(this.gitOptions);
        this._repository.addConfig('core.pager', 'cat');
        this._repository.addConfig('core.quotepath', 'false');
    }

    public async GetChangedFiles(fileExtensions: string | undefined, filesToExclude: string | undefined): Promise<string[]> {
        await this._repository.fetch();

        let targetBranch = this.GetTargetBranch();

        let diffs = await this._repository.diff([targetBranch, '--name-only', '--diff-filter=AM']);
        let files = diffs.split('\n').filter(line => line.trim().length > 0);
        let filesToReview = files.filter(file => !binaryExtensions.includes(file.slice((file.lastIndexOf(".") - 1 >>> 0) + 2)));

        if(fileExtensions) {
            console.log(`File extensions specified: ${fileExtensions}`);
            let fileExtensionsToInclude = fileExtensions.trim().split(',');
            filesToReview = filesToReview.filter(file => fileExtensionsToInclude.includes(file.substring(file.lastIndexOf('.'))));
        } else {
            console.log('No file extensions specified. All files will be reviewed.');
        }

        if(filesToExclude) {
            let fileNamesToExclude = filesToExclude.trim().split(',')
            filesToReview = filesToReview.filter(file => !fileNamesToExclude.includes(file.split('/').pop()!.trim()))
        }

        return filesToReview;
    }

  public async GetADRFiles(path: string): Promise<string[]> {
        // Ensure we have latest remote refs
        await this._repository.fetch();

        const defaultBranch = await this.GetDefaultBranch();

        // List files under the given path on the default branch (including subfolders)
        // `ls-tree -r --name-only origin/<branch> <path>` returns file paths under that path
        let rawList: string;
        try {
            rawList = await this._repository.raw(['ls-tree', '-r', '--name-only', `origin/${defaultBranch}`, path]);
        } catch (err) {
            // If ls-tree with the path fails (for example path not found), return empty array
            return [];
        }

        const files = rawList
            .split('\n')
            .map(s => s.trim())
            .filter(s => s.length > 0 && s.toLowerCase().endsWith('.md'));

        return files;
  }
      
    private async GetDefaultBranch(): Promise<string> {
        // Try to resolve origin/HEAD symbolic ref first (preferred)
        try {
            const symRef = await this._repository.raw(['symbolic-ref', 'refs/remotes/origin/HEAD']);
            // result like: refs/remotes/origin/main
            const parts = symRef.trim().split('/');
            const branch = parts[parts.length - 1];
            if (branch) return branch;
        } catch (e) {
            // ignore and try alternative
        }

        // Fallback: parse `git remote show origin` output
        try {
            const remoteShow = await this._repository.raw(['remote', 'show', 'origin']);
            const match = remoteShow.match(/HEAD branch: (.+)/);
            if (match && match[1]) return match[1].trim();
        } catch (e) {
            // ignore and fallback to defaults
        }

        // Final fallback: common default branch names
        return 'main';
    }
      

    public async GetDiff(fileName: string): Promise<string> {
        let targetBranch = this.GetTargetBranch();
        
        let diff = await this._repository.diff([targetBranch, '--', fileName]);

        return diff;
    }

    private GetTargetBranch(): string {
        let targetBranchName = tl.getVariable('System.PullRequest.TargetBranchName');

        if (!targetBranchName) {
            targetBranchName = tl.getVariable('System.PullRequest.TargetBranch')?.replace('refs/heads/', '');
        }

        if (!targetBranchName) {
            throw new Error(`Could not find target branch`)
        }

        return `origin/${targetBranchName}`;
    }
}
