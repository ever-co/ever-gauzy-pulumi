import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as config from "./config";
import { Environment } from "./environments";

export const createDockerImages = async (environment: Environment) => {
    
  const apiRepoName = `gauzy/api-${environment.toLowerCase()}`;

  const repositoryApi = new aws.ecr.Repository(apiRepoName, {
    name: apiRepoName
  });

  const webappRepoName = `gauzy/webapp-${environment.toLowerCase()}`;

  const repositoryWebapp = new aws.ecr.Repository(webappRepoName, {
    name: webappRepoName
  });

  let apiImage;

  // Build and publish a Docker image to a private ECR registry for API.
  if (environment !== Environment.Prod)
  {  
    apiImage = awsx.ecs.Image.fromDockerBuild(repositoryApi, {
      context: config.dockerContextPath,
      dockerfile: config.dockerAPIFile
    });
  }
  else 
  {
    apiImage = awsx.ecr.buildAndPushImage(
      apiRepoName,
      {
        context: config.dockerContextPath,
        dockerfile: config.dockerWebappFile
      },
      { repository: repositoryApi }
    );
  }

  let webappImage;
  
  // Build and publish a Docker image to a private ECR registry for Web App.
  if (environment !== Environment.Prod)
  {      
    webappImage = awsx.ecs.Image.fromDockerBuild(repositoryWebapp, {
      context: config.dockerContextPath,
      dockerfile: config.dockerWebappFile
    });
  } 
  else 
  {
    webappImage = awsx.ecr.buildAndPushImage(
      webappRepoName,
      {
        context: config.dockerContextPath,
        dockerfile: config.dockerWebappFile
      },
      { repository: repositoryWebapp }
    );
  }

  return { apiImage, webappImage };
};
