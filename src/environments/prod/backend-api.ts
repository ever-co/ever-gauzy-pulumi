import * as awsx from "@pulumi/awsx";
import * as aws from "@pulumi/aws";
import * as uuid from "uuid/v4";
import { Cluster } from "@pulumi/awsx/ecs";
import {
  backendPort,
  sslCertificateARN,
  dockerContextPath,
  dockerAPIFile  
} from "../../config";

export const createBackendAPI = async (
  apiImage: awsx.ecs.Image,
  cluster: Cluster,
  dbHost: string,
  port: number
) => {       
  // return { backendAPIListener, backendAPIService };
};
