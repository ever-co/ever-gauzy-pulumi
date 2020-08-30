// Example how to get the password to use from config.
// import * as pulumi from "@pulumi/pulumi";
// const config = new pulumi.Config();
// const password = config.require("password");

export const HTTPS_PORT: number = 443;

// Port on which Docker exposes front-end server
export const frontendPort: number = 4200;

// Port on which Docker exposes backend API server
export const backendPort: number = 3000;

// Demo API will be on https://apidemo.gauzy.co:445
export const demoApiPort: number = 443;
export const demoApiDomain: string = 'apidemo.gauzy.co';
export const fullDemoApiUrl: string = `https://${demoApiDomain}:${demoApiPort}`;

// Demo App will be on https://demo.gauzy.co
export const demoWebappDomain: string = 'demo.gauzy.co';
export const fullDemoWebappUrl: string = 'https://' + demoWebappDomain;

// Dev API will be on https://api.gauzy.dev:446
export const devApiPort: number = 443;
export const devApiDomain: string = 'api.gauzy.dev';
export const fullDevApiUrl: string = `https://${devApiDomain}:${devApiPort}`;

// Dev App will be on https://app.gauzy.dev
export const devWebappDomain: string = 'app.gauzy.dev';
export const fullDevWebappUrl: string = 'https://' + devWebappDomain;

// Prod API will be on something like https://api.gauzy.co or http://api.gauzy.co:3000
export const prodApiPort: number = 443; // or 3000 for example
export const prodApiDomain: string = 'api.gauzy.co';
export const fullProdApiUrl: string = `https://${prodApiDomain}:${prodApiPort}`;

// Prod App will be on https://app.gauzy.co or http://app.gauzy.co:4200
export const prodWebappPort: number = 443; // or 4200 for example
export const prodWebappDomain: string = 'app.gauzy.co';
export const fullProdWebappUrl: string =
	prodWebappPort !== 443
		? `https://${prodWebappDomain}:${prodWebappPort}`
		: `https://${prodWebappDomain}`;

// ARN of certificate for your domain (subdomain/wildcard), e.g. for gauzy.co and *.gauzy.co
// Should be requested manually in AWS
export const sslCoCertificateARN: string =
	'arn:aws:acm:us-east-1:077336794262:certificate/f581fa3c-072c-47e6-9432-f9b63d432767';

// ARN of certificate for your domain (subdomain/wildcard), e.g. for gauzy.dev and *.gauzy.dev
// Should be requested manually in AWS
export const sslDevCertificateARN: string =
	'arn:aws:acm:us-east-1:077336794262:certificate/9252387e-3673-40fa-84d9-38646b5340b9';

export const awsEcrRegistry: string = '077336794262';

/**
 * context is a path to a directory to use for the Docker build context, usually the directory
 * in which the Dockerfile resides (although dockerfile may be used to choose a custom location
 * independent of this choice). If a relative path is used, it is relative to the current working directory that
 * Pulumi is evaluating.
 */
export const dockerContextPath: string = 'C:/Coding/Gauzy/gauzy'; // "./gauzy";

// path to the folder containing the Dockerfile for API
export const dockerAPIFile: string =
	'C:/Coding/Gauzy/gauzy/.deploy/api/Dockerfile'; // "./gauzy/.deploy/api/Dockerfile"

// path to the folder containing the Dockerfile for Web app
export const dockerWebappFile: string =
	'C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile'; // "./gauzy/.deploy/webapp/Dockerfile"
