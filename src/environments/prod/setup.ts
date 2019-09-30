import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as db from "../../db";
import * as config from "../../config";
import * as backendAPI from "./backend-api";
import * as frontend from "./frontend";
import { Environment } from "../environments";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

export const setupProdEnvironment = async (dockerImages: {
  apiImage: awsx.ecs.Image;
  webappImage: awsx.ecs.Image;
}) => {
  const dbCluster = await db.createPostgreSQLCluster(Environment.Prod);

  dbCluster.endpoint.apply(async (dbHost: any) => {
    const port = parseInt(<string>process.env.DB_PORT, 10);
    await db.check(Environment.Prod, dbHost, port);

    // Allocate a new VPC with custom settings, and a public & private subnet per AZ.
    const vpc = new awsx.ec2.Vpc("gauzy-prod-vpc", {
      cidrBlock: "172.16.0.0/16",
      subnets: [{ type: "public" }, { type: "private" }]
    });

    const allVpcSubnetsIds = vpc.privateSubnetIds.concat(vpc.publicSubnetIds);

    // Create the EKS cluster, including a "gp2"-backed StorageClass and a deployment of the Kubernetes dashboard.
    const cluster = new eks.Cluster("gauzy-prod", {
      vpcId: vpc.id,
      subnetIds: allVpcSubnetsIds,
      instanceType: "t3.medium",
      desiredCapacity: 2,
      minSize: 1,
      maxSize: 2,
      storageClasses: "gp2",
      deployDashboard: true,
      enabledClusterLogTypes: [
        "api",
        "audit",
        "authenticator",
        "controllerManager",
        "scheduler"
      ]
    });

    const kubeconfig = cluster.kubeconfig;
    const clusterName = cluster.core.cluster.name;

    // Create a Kubernetes Namespace for our production app API and front-end
    // NOTE: SaaS may use same k8s cluster, but create different namespaces, one per tenant
    const ns = new k8s.core.v1.Namespace(
      "gauzy-prod",
      {},
      { provider: cluster.provider }
    );

    const namespaceName = ns.metadata.name;

    const backendAPIResponse = await backendAPI.createBackendAPI(
      dockerImages.apiImage,
      cluster,
      namespaceName,
      dbHost,
      port
    );

    backendAPIResponse.serviceHostname.apply(
      async (serviceHostname: string) => {
        backendAPIResponse.port.apply(async (port: number) => {
          const appUrl = pulumi.interpolate`http://${serviceHostname}:${port}`;

          console.log(`k8s backend Url: ${appUrl}`);

          const frontendResponse = await frontend.createFrontend(
            dockerImages.webappImage,
            cluster,
            namespaceName,
            config.fullProdApiUrl
          );

          frontendResponse.serviceHostname.apply(
            async (serviceHostname: string) => {
              frontendResponse.port.apply(async (port: number) => {
                const appUrl = pulumi.interpolate`http://${serviceHostname}:${port}`;

                console.log(`k8s frontend Url: ${appUrl}`);
              });
            }
          );
        });
      }
    );
  });
};
