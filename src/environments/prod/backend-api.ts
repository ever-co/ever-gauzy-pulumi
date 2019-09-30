import * as pulumi from "@pulumi/pulumi";
import * as awsx from "@pulumi/awsx";
import * as eks from "@pulumi/eks";
import * as k8s from "@pulumi/kubernetes";

export const createBackendAPI = async (
  apiImage: awsx.ecs.Image,
  cluster: eks.Cluster,
  namespaceName: pulumi.Output<string>,
  dbHost: string,
  dbPort: number
) => {       

  const name = "gauzy-api-prod";

  const appLabels = { 
    appClass: name,
    tier: "backend"
  };
  
  // aws.ecr.getImage().

  /*

  const apiRepoName = `gauzy/api-${Environment.Prod.toLowerCase()}`;

  const image = awsx.ecr.buildAndPushImage(apiRepoName, config.dockerContextPath, { 
  }, {

  }).image();
  */

  const image = "nginx";

  // for production, we should always explicitly set secure DB credentials
  const dbName = <string>process.env.DB_NAME;
  const dbUser = <string>process.env.DB_USER;
  const dbPassword = <string>process.env.DB_PASS;

  const container = {
    name,                            
    image,
    env: [
      { name: "DB_TYPE", value: "postgres" },
      { name: "DB_HOST", value: dbHost },
      { name: "DB_PORT", value: dbPort.toString() },
      { name: "DB_PASS", value: dbPassword },
      { name: "DB_USER", value: dbUser },
      { name: "DB_NAME", value: dbName }
    ],
    /*
    requests: {
      cpu: "100m",
      memory: "1900Mi",
    },
    */
    /*
    livenessProbe: {
      httpGet: {
          path: "/",
          port: "http",
      },
      initialDelaySeconds: 180,
      timeoutSeconds: 5,
      failureThreshold: 6,
    },
    readinessProbe: {
      httpGet: {
          path: "/",
          port: "http",
      },
      initialDelaySeconds: 90,
      timeoutSeconds: 5,
      periodSeconds: 6,
    },
    */
    ports: [
      { 
        name: "http",
        containerPort: 80 // TODO: replace with `backendPort`
      }      
    ],
  };

  const deployment = new k8s.apps.v1.Deployment(name,
    {      
        metadata: {
            namespace: namespaceName,
            labels: appLabels,
        },
        spec: {
            replicas: 1,
            selector: { matchLabels: appLabels },
            template: {
                metadata: {
                    labels: appLabels,
                },
                spec: {
                    containers: [
                      container
                    ],
                },
            },
        },
    },
    {
        provider: cluster.provider,
    }
);

  // Create a LoadBalancer Service

  const config = new pulumi.Config();
  const isMinikube = config.require("isMinikube");

  const service = new k8s.core.v1.Service(name,
    {      
        metadata: {
            labels: appLabels,
            namespace: namespaceName,
        },
        spec: {
            // Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
            // running on minikube, and if so, create only services of type ClusterIP.
            type: isMinikube === "true" ? "ClusterIP" : "LoadBalancer",  
            ports: [
              { 
                port: 80,
                targetPort: "http" 
              }              
            ],
            selector: appLabels,
        },
    },
    {
        provider: cluster.provider,
    },
  );

  // return LoadBalancer public Endpoint
  let serviceHostname:pulumi.Output<string>;

  if (isMinikube === "true") {
    const frontendIp = service.spec.clusterIP;
    serviceHostname = frontendIp;
  } else {
    serviceHostname = service.status.loadBalancer.ingress[0].hostname;    
  }
  
  return { serviceHostname, port: service.spec.ports[0].port };

};
