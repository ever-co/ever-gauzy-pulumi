import * as awsx from "@pulumi/awsx";
import * as db from "../../db";
import * as config from "../../config";
import * as backendAPI from "./backend-api";
import * as frontend from "./frontend";
import { Environment } from "../environments";

export const setupProdEnvironment = async (dockerImages: { apiImage: awsx.ecs.Image; webappImage: awsx.ecs.Image; }) => {

    const dbCluster = await db.createPostgreSQLCluster(Environment.Prod);
      
    dbCluster.endpoint.apply(async (dbHost: any) => {
      const port = parseInt(<string>process.env.DB_PORT, 10);
      await db.check(Environment.Prod, dbHost, port);
  
      // TODO: we should not use default VPC for prod!
      const vpc = awsx.ec2.Vpc.getDefault();
  
      // Create an EKS cluster.

      /*
      const eksCluster = new awsx.ecs.Cluster("gauzy-prod", { 
          vpc,
          name: "gauzy-prod"
      });
  
      const backendAPIResponse = await backendAPI.createBackendAPI(dockerImages.apiImage, fargateCluster, dbHost, port);
              
      const frontendResponse = await frontend.createFrontend(dockerImages.webappImage, fargateCluster, config.fullApiUrl);
        
      */
    });
  
  }