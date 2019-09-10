require("dotenv").config();
import * as awsx from "@pulumi/awsx";
import * as db from "./src/db";
import * as backendAPI from "./src/backend-api";
import * as frontend from "./src/frontend";

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
        console.log(`API URL: ${apiUrl}:3000`);
        const frontendResponse = await frontend.createFrontend(fargateCluster, apiUrl);
        frontendResponse.frontendListener.endpoint.hostname.apply(async (frontendUrl: string) => {
          console.log(`Frontend URL: ${frontendUrl}:4200`);
        });
      });
      
    });
  } catch (err) {
    console.log(err);
  }
})();
