// Example how to get the password to use from config.
// import * as pulumi from "@pulumi/pulumi";
// const config = new pulumi.Config();
// const password = config.require("password");

export const HTTPS_PORT: number = 443;

// Port on which Docker exposes front-end server
export const frontendPort: number = 4200;

// Port on which Docker exposes backend API server
export const backendPort: number = 3000;

export const apiDomain: string = 'api.gauzy.co';
export const fullApiUrl: string = 'https://' + apiDomain + ":444";

export const webappDomain: string = 'app.gauzy.co';
export const fullWebappUrl: string = 'https://' + webappDomain;

// ARN of certificate for your domain (subdomain/wildcard), e.g. *.gauzy.co
// Should be requested manually in AWS
export const sslCertificateARN: string = 'arn:aws:acm:us-east-1:077336794262:certificate/f581fa3c-072c-47e6-9432-f9b63d432767';

 /**
* context is a path to a directory to use for the Docker build context, usually the directory
* in which the Dockerfile resides (although dockerfile may be used to choose a custom location
* independent of this choice). If a relative path is used, it is relative to the current working directory that
* Pulumi is evaluating.
*/
export const dockerContextPath: string = "C:/Coding/Gauzy/gauzy"; // "./gauzy";

// path to the folder containing the Dockerfile for API
export const dockerAPIFile: string = "C:/Coding/Gauzy/gauzy/.deploy/api/Dockerfile" // "./gauzy/.deploy/api/Dockerfile"

// path to the folder containing the Dockerfile for Web app
export const dockerWebappFile: string = "C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile" // "./gauzy/.deploy/webapp/Dockerfile"