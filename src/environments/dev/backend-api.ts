import * as awsx from "@pulumi/awsx";
import { Cluster } from "@pulumi/awsx/ecs";

export const createBackendAPI = async (
  apiImage: awsx.ecs.Image,
  cluster: Cluster,
  dbHost: string,
  port: number
) => {       
    
  const dbName = process.env.DB_NAME || "gauzy";
  const dbUser = process.env.DB_USER ? <string>process.env.DB_USER : "gauzy_user";
  const dbPassword = process.env.DB_PASS ? <string>process.env.DB_PASS : "change_me";
  
  const backendAPIService = new awsx.ecs.EC2Service("gauzy-api-dev", {
    cluster,
    desiredCount: 1,
    securityGroups: cluster.securityGroups,
    taskDefinitionArgs: {
      containers: {
        backendAPI: {
          portMappings: [{ containerPort: 3000, hostPort: 3000, protocol: "tcp" }],
          image: apiImage,
          cpu: 512 /*100% of 1024 is 1 vCPU*/,
          memory: 1900 /*MB*/,
          environment: [
            { name: "DB_TYPE", value: "postgres" },
            { name: "DB_HOST", value: dbHost },
            { name: "DB_PORT", value: port.toString() },
            { name: "DB_PASS", value: dbPassword },
            { name: "DB_USER", value: dbUser },
            { name: "DB_NAME", value: dbName }
          ]
        }
      }
    }
  });

  return backendAPIService;

};
