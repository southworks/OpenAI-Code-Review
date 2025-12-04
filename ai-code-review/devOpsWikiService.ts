import * as tl from "azure-pipelines-task-lib/task";
import fetch from "node-fetch";
import { Agent } from "https";

export interface DevOpsWikiOptions {
  collectionUri?: string; // e.g. https://dev.azure.com/{organization}/
  projectId?: string; // Team Project Id or name
  wikiId?: string; // Wiki identifier (name or id). Defaults to repo name + ".wiki"
  token?: string; // Personal access token or System.AccessToken
}

export class DevOpsWikiService {
  private _collectionUri: string;
  private _projectId: string;
  private _wikiId: string;
  private _token: string;
  private _httpsAgent: Agent;
  private _headers: HeadersInit;

  constructor(options?: DevOpsWikiOptions) {
    this._collectionUri =
      options?.collectionUri || tl.getVariable("System.TeamFoundationCollectionUri") || "";
    this._projectId =
      options?.projectId ||
      tl.getVariable("System.TeamProjectId") ||
      tl.getVariable("SYSTEM.TEAMPROJECT") ||
      "";
    // default wikiId: repository name
    this._wikiId = options?.wikiId || `${tl.getVariable("Build.Repository.Name")}.wiki` || "";
    this._token = options?.token || tl.getVariable("System.AccessToken") || "";

    this._httpsAgent = new Agent();

    this._headers = { "Content-Type": "application/json" };
    if (this._token && this._token.trim().length > 0) {
      this._headers["Authorization"] = `Bearer ${this._token}`;
    } else {
      throw new Error(
        "A Personal Access Token or System.AccessToken is required to access the wiki."
      );
    }
  }

  public async getPages(path: string = "/"): Promise<string[]> {
    const pagePathList: string[] = await this.getWikiPagePathList(path);

    const content: string[] = [];
    for (const pagePath of pagePathList) {
      const pageContent = await this.getWikiPageContent(pagePath);
      content.push(pageContent);
    }
    return content;
  }

  private getWikiRequestEndpoint(
    scopePath: string,
    includeContent: boolean,
    recursionLevel: "none" | "oneLevel" | "full"
  ): string {
    if (!this._collectionUri || !this._projectId || !this._wikiId) {
      throw new Error(
        "Collection URI, project id and wiki id are required (passed via options or pipeline variables)."
      );
    }

    // Ensure collectionUri ends with '/'
    let base = this._collectionUri;
    if (!base.endsWith("/")) base = base + "/";

    // Build endpoint: `${collectionUri}${projectId}/_apis/wiki/wikis/${wikiId}/pages`
    const apiVersion = "7.1-preview.1";
    const encodedScope = encodeURIComponent(scopePath);
    const endpoint = `${base}${this._projectId}/_apis/wiki/wikis/${encodeURIComponent(
      this._wikiId
    )}/pages?path=${encodedScope}&includeContent=${includeContent}&recursionLevel=${recursionLevel}&api-version=${apiVersion}`;

    return endpoint;
  }

  private async getWikiPagePathList(path: string): Promise<string[]> {
    const endpoint = this.getWikiRequestEndpoint(path, false, "oneLevel");
    console.log("Fetching wiki pages from:", endpoint);
    const res = await fetch(endpoint, {
      method: "GET",
      headers: this._headers,
      agent: this._httpsAgent
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to retrieve wiki pages from ${endpoint}: ${res.status} ${res.statusText} ${text}`
      );
    }

    const data: any = await res.json();
    console.log(`Retrieved wiki page data: ${JSON.stringify(data)}`);
    const pagePaths: string[] =
      data && data.subPages ? data.subPages.map((page: any) => page.path) : [];
    return pagePaths;
  }

  private async getWikiPageContent(path: string): Promise<string> {
    const endpoint = this.getWikiRequestEndpoint(path, true, "none");

    console.log("Fetching wiki page content from:", endpoint);
    const res = await fetch(endpoint, {
      method: "GET",
      headers: this._headers,
      agent: this._httpsAgent
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to retrieve wiki page content from ${endpoint}: ${res.status} ${res.statusText} ${text}`
      );
    }

    const data: any = await res.json();
    console.log(`Retrieved wiki page content for ${path}, length: ${data.content.length}`);

    return data.content || "";
  }
}

export default DevOpsWikiService;
