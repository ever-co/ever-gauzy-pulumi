import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as config from "./config";
import { Environment } from "./environments";

export const createDockerImages = async (environment: Environment) => {
  const apiRepoName = `gauzy/api-${environment.toLowerCase()}`;

  const repositoryApi = new aws.ecr.Repository(apiRepoName, {
    name: apiRepoName
  });

  // Build and publish a Docker image to a private ECR registry.
  const apiImage = awsx.ecs.Image.fromDockerBuild(repositoryApi, {
    context: config.dockerContextPath,
    dockerfile: config.dockerAPIFile
  });

  const webappRepoName = `gauzy/webapp-${environment.toLowerCase()}`;

  const repositoryWebapp = new aws.ecr.Repository(webappRepoName, {
    name: webappRepoName
  });

  // Build and publish a Docker image to a private ECR registry.
  const webappImage = awsx.ecs.Image.fromDockerBuild(repositoryWebapp, {
    context: config.dockerContextPath,
    dockerfile: config.dockerWebappFile
  });

  return { apiImage, webappImage };
};
