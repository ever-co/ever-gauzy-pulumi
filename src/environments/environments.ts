import * as pulumi from "@pulumi/pulumi";

/**
 * Supported Environments (Pulumi Stacks)
 * See https://github.com/ever-co/gauzy/issues/216
 */
export enum Environment {
    /**
     * Dev Environment / Stack
     * Available on https://app.gauzy.dev
     * Implementation:
     * - uses ECS container instances, not Fargate. 
     * - all cluster consist from single t3.medium instance (totally 4Gb RAM, so each docker VM gets 2Gb RAM)
     * - 1 Docker container for API, working on port 3000
     * - 1 Docker container for Front-end, working on port 4200
     * - ALBs (2 load balancers, one for API and one for Front-end) 
     * - AWS SSL Certificates
     * - Serverless Aurora PostgreSQL
     */
    Dev = "Dev",

    /**
     * Prod Environment / Stack.
     * Available on https://app.gauzy.co
     * Note 1: this project will provision single env used for multiple tenants, including our own tenant!
     * Note 2: we will support fully isolated k8s with namespaces, which will be provisioned by our SaaS platform (private repo)
     * - AWS EKS (Kubernetes), now WIP
     */
    Prod = "Prod",

    /**
     * Demo Environment / Stack. 
     * Available on https://demo.gauzy.co
     * - AWS Fargate Services (2 services, one for API and one for Front-end)
     * - ALBs (2 load balancers, one for API and one for Front-end) 
     * - AWS SSL Certificates
     * - Serverless Aurora PostgreSQL
     */
    Demo = "Demo"
}

/**
 * Detects running Pulumi Stack and return parsed environment
 */
export const getRunningEnvironment = async (
  ) => {

    const runningStackName = pulumi.runtime.getStack();

    let environment: Environment;

    switch (runningStackName) {
        case "dev":
        case "development":
          environment = Environment.Dev;
          break;

        case "demo":
        case "staging":
          environment = Environment.Demo;
          break;

        case "prod":
        case "live":
        case "production":
          environment = Environment.Prod;
          break;

        default:
          throw new Error(`Given stack name ${runningStackName} not supported`);
    }

    return environment;
}