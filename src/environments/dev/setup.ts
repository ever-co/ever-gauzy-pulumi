import * as awsx from "@pulumi/awsx";
import * as db from "../../db";
import * as config from "../../config";
import * as backendAPI from "./backend-api";
import * as frontend from "./frontend";
import { Environment } from "../environments";

export const setupDevEnvironment = async (dockerImages: { apiImage: awsx.ecs.Image; webappImage: awsx.ecs.Image; }) => {

    const dbCluster = await db.createPostgreSQLCluster(Environment.Dev);
      
    dbCluster.endpoint.apply(async (dbHost: any) => {
      const port = parseInt(<string>process.env.DB_PORT, 10);
      await db.check(Environment.Dev, dbHost, port);
  
      const vpc = awsx.ec2.Vpc.getDefault();
      
      // Create an ECS cluster for dev
      const cluster = new awsx.ecs.Cluster("gauzy-dev", { 
          vpc,
          name: "gauzy-dev"
      });
      
      // create single auto-scalling group for both API and Front-end
      const autoScalingGroup = cluster.createAutoScalingGroup("gauzy-dev", {
        subnetIds: vpc.publicSubnetIds,
        templateParameters: {
            minSize: 1, 
            maxSize: 2 
        },
        launchConfigurationArgs: {
            instanceType: "t3.medium",
        },
      });

      const backendAPIResponse = await backendAPI.createBackendAPI(dockerImages.apiImage, cluster, dbHost, port);
                    
      const frontendResponse = await frontend.createFrontend(dockerImages.webappImage, cluster, config.fullApiUrl);

    });
  
  }