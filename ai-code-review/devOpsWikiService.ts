import * as tl from "azure-pipelines-task-lib/task";
import fetch from "node-fetch";
import { Agent } from "https";

export interface DevOpsWikiOptions {
  collectionUri?: string; // e.g. https://dev.azure.com/{organization}/
  projectId?: string; // Team Project Id or name
  wikiId?: string; // Wiki identifier (name or id). Defaults to repo name + ".wiki"
  token?: string; // Personal access token or System.AccessToken
  acceptUntrusted?: boolean; // whether to allow self-signed certs
}

export class DevOpsWikiService {
  private _collectionUri: string;
  private _projectId: string;
  private _wikiId: string;
  private _token: string;
  private _httpsAgent: Agent;

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

    this._httpsAgent = new Agent({
      rejectUnauthorized: options?.acceptUntrusted === true ? false : true
    });
  }

  public async getPages(scopePath: string = "/"): Promise<string[]> {
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
    )}/pages?path=${encodedScope}&includeContent=${true}&recursionLevel=full&api-version=${apiVersion}`;

    const headers: any = { "Content-Type": "application/json" };
    if (this._token && this._token.trim().length > 0) {
      headers["Authorization"] = `Bearer ${this._token}`;
    }

    console.log("Fetching wiki pages from:", endpoint);

    const res = await fetch(endpoint, { method: "GET", headers, agent: this._httpsAgent });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Failed to retrieve wiki pages from ${endpoint}: ${res.status} ${res.statusText} ${text}`
      );
    }

    const body = await res.json();
    console.log("DevOps Wiki API response:");
    console.log(body);
    const contents: string[] = [];
    if (Array.isArray(body)) {
      for (const p of body) {
        if (typeof p.content === "string") contents.push(p.content);
      }
    } else if (
      body &&
      typeof body === "object" &&
      Array.isArray((body as { value?: any[] }).value)
    ) {
      for (const p of (body as { value: any[] }).value) {
        if (typeof p.content === "string") contents.push(p.content);
      }
    }
    return contents;
  }
}

export default DevOpsWikiService;
