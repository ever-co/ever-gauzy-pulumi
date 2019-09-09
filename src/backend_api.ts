import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Example how to get the password to use from config.
// const config = new pulumi.Config();
// const password = config.require("password");

export const createBackendAPI = async (dbHost: string, port: number) => {

    const vpc = awsx.ec2.Vpc.getDefault();

    // Create an ECS Fargate cluster.
    const cluster = new awsx.ecs.Cluster("gauzy", { 
        vpc,
        name: "gauzy"
    });

    // Define networking (load balancer)
    const alb = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer(
        "gauzy-api", { external: true, securityGroups: cluster.securityGroups });

    const backendAPIListener = alb.createListener("gauzy-api", { port: 80, external: true });

    /*
  const backendAPIListener = new awsx.elasticloadbalancingv2.NetworkListener(
    "gauzy-api",
    { port: 80 }
  );
  */

    const context = "C:/Coding/Gauzy/gauzy"; // "./gauzy";
    const dockerfile = "C:/Coding/Gauzy/gauzy/.deploy/api/Dockerfile" // "./gauzy/.deploy/api/Dockerfile"

    const repository = new aws.ecr.Repository("gauzy/api", { name: "gauzy/api" });

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
  const backendAPIService = new awsx.ecs.FargateService("gauzy-api", {      
    cluster,
    desiredCount: 2,
    taskDefinitionArgs: {
      containers: {          
        backendAPI: {
          image,
          cpu: 102 /*10% of 1024*/,
          memory: 512 /*MB*/,
          portMappings: [backendAPIListener],
          environment: [
            { name: "DB_HOST", value: dbHost },
            { name: "DB_PORT", value: port.toString() },
            { name: "DB_PASS", value: <string>process.env.DB_PASS },
            { name: "DB_USER", value: <string>process.env.DB_USER },
            { name: "DB_NAME", value: <string>process.env.DB_NAME }
          ]
          // command: ["redis-server", "--requirepass", redisPassword], - can be some command?          
        }
      }      
    }
  });
  
  return { backendAPIListener, backendAPIService };
};
