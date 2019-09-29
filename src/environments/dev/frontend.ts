import * as awsx from "@pulumi/awsx";
import { Cluster } from "@pulumi/awsx/ecs";
import { 
  frontendPort, 
  sslDevCertificateARN as sslCertificateARN
} from "../../config";

export const createFrontend = async (
  webappImage: awsx.ecs.Image,
  cluster: Cluster,
  apiBaseUrl: string
) => {
  // Create ALB (application load balancer), see https://www.pulumi.com/docs/guides/crosswalk/aws/elb
  const alb = new awsx.lb.ApplicationLoadBalancer("gauzy-webapp-dev", {
    name: "gauzy-webapp-dev",
    securityGroups: cluster.securityGroups,
    external: true,
    enableHttp2: true,
    // this can be helpful to avoid accidentally deleting a long-lived, but auto-generated, load balancer URL.
    enableDeletionProtection: false
  });

  // This defines where requests will be forwarded to (e.g. in our case Fargate Services running and listening on port 4200)
  const webTarget = alb.createTargetGroup("gauzy-webapp-target-dev", {
    name: "gauzy-webapp-target-dev",
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
  const frontendListener = webTarget.createListener("gauzy-webapp-dev", {
    name: "gauzy-webapp-dev",
    port: 443,
    protocol: "HTTPS",
    external: true,
    certificateArn: sslCertificateARN,
    sslPolicy: "ELBSecurityPolicy-2016-08"
  });

  const frontendService = new awsx.ecs.EC2Service("gauzy-webapp-dev", {
    name: "gauzy-webapp-dev",
    cluster,
    desiredCount: 1,
    securityGroups: cluster.securityGroups,
    taskDefinitionArgs: {
      containers: {
        frontend: {
          portMappings: [frontendListener],
          image: webappImage,
          cpu: 512 /*100% of 1024 is 1 vCPU*/,
          memory: 1900 /*MB*/,
          environment: [{ name: "API_BASE_URL", value: apiBaseUrl }]
        }
      }
    }
  });

  return { frontendListener, frontendService };
};
