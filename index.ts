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
        const fullApiUrl: string = `http://${apiUrl}:${backendAPI.backendPort}`;
        console.log(`API URL: ${fullApiUrl}`);
        const frontendResponse = await frontend.createFrontend(fargateCluster, fullApiUrl);
        frontendResponse.frontendListener.endpoint.hostname.apply(async (frontendUrl: string) => {
          const fullFrontendUrl: string = `http://${frontendUrl}:${frontend.frontendPort}`;
          console.log(`Frontend URL: ${fullFrontendUrl}`);
        });
      });
      
    });
  } catch (err) {
    console.log(err);
  }
})();
