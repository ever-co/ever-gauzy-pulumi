import * as awsx from "@pulumi/awsx";
import * as db from "../../db";
import * as config from "../../config";
import * as backendAPI from "./backend-api";
import * as frontend from "./frontend";
import { Environment } from "../environments";

export const setupDemoEnvironment = async (dockerImages: { apiImage: awsx.ecs.Image; webappImage: awsx.ecs.Image; }) => {

    const dbCluster = await db.createPostgreSQLCluster(Environment.Demo);
      
    dbCluster.endpoint.apply(async (dbHost: any) => {
      const port = parseInt(<string>process.env.DB_PORT, 10);
      await db.check(Environment.Demo, dbHost, port);
  
      const vpc = awsx.ec2.Vpc.getDefault();
  
      // Create an ECS cluster.
      const cluster = new awsx.ecs.Cluster("gauzy-demo", { 
          vpc,
          name: "gauzy-demo"
      });
  
      const backendAPIResponse = await backendAPI.createBackendAPI(dockerImages.apiImage, cluster, dbHost, port);
      backendAPIResponse.backendAPIListener.endpoint.hostname.apply(async (apiUrl: string) => {                       
        console.log(`Create API CNAME: ${apiUrl} -> ${config.apiDomain}`);
        console.log(`API will be available on: ${config.fullApiUrl}`);
        
        const frontendResponse = await frontend.createFrontend(dockerImages.webappImage, cluster, config.fullApiUrl);
  
        frontendResponse.frontendListener.endpoint.hostname.apply(async (frontendUrl: string) => {
          console.log(`Create Web App CNAME: ${frontendUrl} -> ${config.webappDomain}`);                    
          console.log(`Web App will be available on: ${config.fullWebappUrl}`);
        });
      });
      
    });
  
  }