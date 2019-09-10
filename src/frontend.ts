import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import { Cluster } from "@pulumi/awsx/ecs";

export const createFrontend = async (cluster: Cluster, apiBaseUrl: string) => {
    
    // Define networking (load balancer)
    const alb = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer(
        "gauzy-web", { external: true, securityGroups: cluster.securityGroups });

    const frontendListener = alb.createListener("gauzy-web", { port: 4200, protocol: "HTTP", external: true });
    
    const context = "C:/Coding/Gauzy/gauzy"; // "./gauzy";
    const dockerfile = "C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile" // "./gauzy/.deploy/webapp/Dockerfile"

    const repository = new aws.ecr.Repository("gauzy/webapp", { name: "gauzy/webapp" });

    // Build and publish a Docker image to a private ECR registry.
    const image = awsx.ecs.Image.fromDockerBuild(
      repository,                     
      {                     
        /**
        * context is a path to a directory to use for the Docker build context, usually the directory
        * in which the Dockerfile resides (although dockerfile may be used to choose a custom location
        * independent of this choice). If a relative path is used, it is relative to the current working directory that
        * Pulumi is evaluating.
        */
            context,
            // path to the folder containing the Dockerfile
            dockerfile    
        }
    );

 // A custom container for the backend api
 // Use the 'build' property to specify a folder that contains a Dockerfile.
 // Pulumi builds the container and pushes to an ECR registry
  const frontendService = new awsx.ecs.FargateService("gauzy-webapp", {      
    cluster,
    desiredCount: 2,
    taskDefinitionArgs: {
      containers: {          
        frontend: {
          image,
          cpu: 1024 /*100% of 1024 is 1 vCPU*/,
          memory: 2048 /*MB*/,
          portMappings: [frontendListener],
          environment: [              
            { name: "API_BASE_URL", value: apiBaseUrl }            
          ]  
        }
      }      
    }
  });
  
  return { frontendListener, frontendService };
};
