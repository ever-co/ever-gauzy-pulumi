import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";
import * as config from "../../config";

export const createFrontend = async (
  webappImage: awsx.ecr.RepositoryImage,
  cluster: eks.Cluster,
  namespaceName: pulumi.Output<string>,
  apiBaseUrl: string
) => {
  const name = "gauzy-webapp-prod";

  const appLabels = {
    appClass: name,
    tier: "frontend"
  };

  const container = {
    name,
    image: webappImage.imageValue,
    env: [
      {
        name: "API_BASE_URL",
        value: apiBaseUrl
      }
    ],
    requests: {
      cpu: "100m",
      memory: "1900Mi"
    },
    /*
    livenessProbe: {
      httpGet: {
        path: "/",
        port: "http"
      },
      initialDelaySeconds: 180,
      timeoutSeconds: 120,
      failureThreshold: 10
    },
    readinessProbe: {
      httpGet: {
        path: "/",
        port: "http"
      },
      initialDelaySeconds: 90,
      timeoutSeconds: 120,
      periodSeconds: 10
    },
    */
    ports: [
      {
        name: "http",
        containerPort: config.frontendPort,
        protocol: "TCP"
      }
    ]
  };

  const deployment = new k8s.apps.v1.Deployment(
    name,
    {
      metadata: {
        namespace: namespaceName,
        labels: appLabels
      },
      spec: {
        replicas: 1,
        selector: { matchLabels: appLabels },
        template: {
          metadata: {
            labels: appLabels
          },
          spec: {
            containers: [container]
          }
        }
      }
    },
    {
      provider: cluster.provider
    }
  );

  // Create a LoadBalancer Service

  const pulumiConfig = new pulumi.Config();
  const isMinikube = pulumiConfig.require("isMinikube");

  const service = new k8s.core.v1.Service(
    name,
    {
      metadata: {
        labels: appLabels,
        namespace: namespaceName
      },
      spec: {
        // Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
        // running on minikube, and if so, create only services of type ClusterIP.
        type: isMinikube === "true" ? "ClusterIP" : "LoadBalancer",
        ports: [
          {
            port: config.frontendPort //, 80
            // targetPort: "http"
          }
        ],
        selector: appLabels
      }
    },
    {
      provider: cluster.provider
    }
  );

  // return LoadBalancer public Endpoint
  let serviceHostname: pulumi.Output<string>;

  if (isMinikube === "true") {
    const frontendIp = service.spec.clusterIP;
    serviceHostname = frontendIp;
  } else {
    serviceHostname = service.status.loadBalancer.ingress[0].hostname;
  }

  return { serviceHostname, port: service.spec.ports[0].port };
};
