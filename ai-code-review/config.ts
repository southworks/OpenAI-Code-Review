interface Config {
  azureOpenAiDeploymentEndpointUrl: string;
  azureOpenAiApiKey: string;
  azureOpenAiApiVersion: string;
  promptTokensPricePerMillionTokens: string;
  completionTokensPricePerMillionTokens: string;
  addCostToComments: boolean;
  reviewBugs: boolean;
  reviewPerformance: boolean;
  reviewBestPractices: boolean;
  reviewWholeDiffAtOnce: boolean;
  maxTokens: number;
  fileExtensions: string;
  fileExcludes?: string;
  additionalPrompts?: string;
  baseDir?: string;
}

export const config: Config = {
  azureOpenAiDeploymentEndpointUrl: "",
  azureOpenAiApiKey: "",
  azureOpenAiApiVersion: "",
  promptTokensPricePerMillionTokens: "0.15",
  completionTokensPricePerMillionTokens: "0.6",
  maxTokens: 16384,
  reviewWholeDiffAtOnce: false,
  addCostToComments: false,
  reviewBugs: true,
  reviewPerformance: true,
  reviewBestPractices: true,
  fileExtensions: ".js,.ts,.css,.html",
  fileExcludes: undefined,
  additionalPrompts: undefined,
  baseDir: process.cwd()
};
