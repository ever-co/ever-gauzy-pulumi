import * as awsx from "@pulumi/awsx";
import { Cluster } from "@pulumi/awsx/ecs";

export const createFrontend = async (webappImage: awsx.ecs.Image, cluster: Cluster, apiBaseUrl: string) => {
      
  const frontendService = new awsx.ecs.EC2Service("gauzy-webapp-dev", {
    cluster,    
    desiredCount: 1,
    securityGroups: cluster.securityGroups,
    taskDefinitionArgs: {
      containers: {
        frontend: {
          portMappings: [{ containerPort: 4200, hostPort: 4200, protocol: "tcp" }],
          image: webappImage,
          cpu: 512 /*100% of 1024 is 1 vCPU*/,
          memory: 1900 /*MB*/,          
          environment: [{ name: "API_BASE_URL", value: apiBaseUrl }]          
        }
      }
    }
  });

  return frontendService;

};
