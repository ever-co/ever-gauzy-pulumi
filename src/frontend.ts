import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as uuid from "uuid/v4";
import { Cluster } from "@pulumi/awsx/ecs";
import {
  frontendPort,
  sslCertificateARN,
  dockerContextPath,
  dockerWebappFile,
} from "./config";

export const createFrontend = async (cluster: Cluster, apiBaseUrl: string) => {
      
  // Create ALB (application load balancer), see https://www.pulumi.com/docs/guides/crosswalk/aws/elb
  const alb = new awsx.lb.ApplicationLoadBalancer("gauzy-web", {
    securityGroups: cluster.securityGroups,
    external: true,
    enableHttp2: true,
    // this can be helpful to avoid accidentally deleting a long-lived, but auto-generated, load balancer URL.
    enableDeletionProtection: false
  });

  // This defines where requests will be forwarded to (e.g. in our case Fargate Services running and listening on port 4200)
  const webTarget = alb.createTargetGroup("gauzy-web-target", {
    port: frontendPort,
    protocol: "HTTP",
    healthCheck: {
      unhealthyThreshold: 10,
      timeout: 120,
      interval: 300,
      path: "/",
      protocol: "HTTP",
      port: frontendPort.toString()
    }
  });

  // This defines on which protocol/port Gauzy will be publicly accessible
  const frontendListener = webTarget.createListener("gauzy-web", {
    port: 443,
    protocol: "HTTPS",
    external: true,
    certificateArn: sslCertificateARN,
    sslPolicy: "ELBSecurityPolicy-2016-08"
  });

  const repository = new aws.ecr.Repository("gauzy/webapp", {
    name: "gauzy/webapp"
  });

  // Build and publish a Docker image to a private ECR registry.
  const image = awsx.ecs.Image.fromDockerBuild(repository, {
    context: dockerContextPath,
    dockerfile: dockerWebappFile
  });
  
  const fargateServiceName = "gauzy-webapp-" + uuid().split("-")[0];

  console.log(`Frontend Fargate Service Name ${fargateServiceName}`);

  // A custom container for the backend api
  // Use the 'build' property to specify a folder that contains a Dockerfile.
  // Pulumi builds the container and pushes to an ECR registry  
  const frontendService = new awsx.ecs.FargateService(fargateServiceName, {
    cluster,
    desiredCount: 2,
    securityGroups: cluster.securityGroups,
    taskDefinitionArgs: {
      containers: {
        frontend: {
          image,
          cpu: 1024 /*100% of 1024 is 1 vCPU*/,
          memory: 2048 /*MB*/,
          portMappings: [frontendListener],
          environment: [{ name: "API_BASE_URL", value: apiBaseUrl }]
        }
      }
    }
  });

  return { frontendListener, frontendService };
};
