require("dotenv").config();
import * as awsx from "@pulumi/awsx";
import * as db from "./src/db";
import * as backendAPI from "./src/backend-api";
import * as frontend from "./src/frontend";
import { apiDomain, fullApiUrl, webappDomain, fullWebappUrl } from "./src/config";

(async () => {
  try {
    const dbCluster = await db.createPostgreSQLCluster();
    
    dbCluster.endpoint.apply(async (dbHost: any) => {
      const port = parseInt(<string>process.env.DB_PORT, 10);
      await db.check(dbHost, port);

      const vpc = awsx.ec2.Vpc.getDefault();

      // Create an ECS Fargate cluster.
      const fargateCluster = new awsx.ecs.Cluster("gauzy", { 
          vpc,
          name: "gauzy"
      });
  
      const backendAPIResponse = await backendAPI.createBackendAPI(fargateCluster, dbHost, port);
      backendAPIResponse.backendAPIListener.endpoint.hostname.apply(async (apiUrl: string) => {                       
        console.log(`Create API CNAME: ${apiUrl} -> ${apiDomain}`);
        console.log(`API will be available on: ${fullApiUrl}`);
        
        const frontendResponse = await frontend.createFrontend(fargateCluster, fullApiUrl);

        frontendResponse.frontendListener.endpoint.hostname.apply(async (frontendUrl: string) => {
          console.log(`Create Web App CNAME: ${frontendUrl} -> ${webappDomain}`);                    
          console.log(`Web App will be available on: ${fullWebappUrl}`);
        });
      });
      
    });
  } catch (err) {
    console.log(err);
  }
})();
