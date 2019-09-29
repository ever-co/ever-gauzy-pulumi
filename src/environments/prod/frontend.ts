import * as awsx from "@pulumi/awsx";
import * as uuid from "uuid/v4";
import { Cluster } from "@pulumi/awsx/ecs";
import {
  frontendPort,
  sslCoCertificateARN as sslCertificateARN
} from "../../config";

export const createFrontend = async (webappImage: awsx.ecs.Image, cluster: Cluster, apiBaseUrl: string) => {
      
};
