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
  maxTokens: string;
  fileExtensions: string;
  fileExcludes?: string;
  additionalPrompts?: string;
  baseDir?: string;
  targetBranch: string;
  deploymentName: string;
  modelName: string;
}

export const config: Config = {
  azureOpenAiDeploymentEndpointUrl: "",
  azureOpenAiApiKey: "",
  azureOpenAiApiVersion: "2024-04-01-preview",
  promptTokensPricePerMillionTokens: "0.15",
  completionTokensPricePerMillionTokens: "0.6",
  maxTokens: '16384',
  reviewWholeDiffAtOnce: false,
  addCostToComments: false,
  reviewBugs: true,
  reviewPerformance: true,
  reviewBestPractices: true,
  fileExtensions: ".js,.ts,.css,.html",
  fileExcludes: undefined,
  additionalPrompts: undefined,
  baseDir: process.cwd(),
  targetBranch: '',
  deploymentName: 'gpt-4o-mini',
  modelName: 'gpt-4o-mini'
};
