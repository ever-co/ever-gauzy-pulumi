import * as awsx from '@pulumi/awsx';
import * as db from '../../db';
import * as config from '../../config';
import * as backendAPI from './backend-api';
import * as frontend from './frontend';
import { Environment } from '../environments';

export const setupDevEnvironment = async (dockerImages: {
	apiImage: awsx.ecs.Image;
	webappImage: awsx.ecs.Image;
}) => {
	const dbCluster = await db.createPostgreSQLCluster(Environment.Dev);

	dbCluster.endpoint.apply(async (dbHost: any) => {
		const port = parseInt(<string>process.env.DB_PORT, 10);
		await db.check(Environment.Dev, dbHost, port);

		const vpc = awsx.ec2.Vpc.getDefault();

		// Create an ECS cluster for Dev env
		const cluster = new awsx.ecs.Cluster('gauzy-dev', {
			vpc,
			name: 'gauzy-dev'
		});

		// create single auto-scaling group for both API and Front-end, but it will be limited to just 1 instance for Dev env
		cluster.createAutoScalingGroup('gauzy-dev', {
			subnetIds: vpc.publicSubnetIds,
			templateParameters: {
				minSize: 1,
				maxSize: 1
			},
			launchConfigurationArgs: {
				instanceType: 't3.medium'
			}
		});

		const backendAPIResponse = await backendAPI.createBackendAPI(
			dockerImages.apiImage,
			cluster,
			dbHost,
			port
		);
		backendAPIResponse.backendAPIListener.endpoint.hostname.apply(
			async (apiUrl: string) => {
				console.log(
					`Create API CNAME: ${apiUrl} -> ${config.devApiDomain}`
				);
				console.log(
					`API will be available on: ${config.fullDevApiUrl}`
				);

				const frontendResponse = await frontend.createFrontend(
					dockerImages.webappImage,
					cluster,
					config.fullDevApiUrl
				);

				frontendResponse.frontendListener.endpoint.hostname.apply(
					async (frontendUrl: string) => {
						console.log(
							`Create Web App CNAME: ${frontendUrl} -> ${config.devWebappDomain}`
						);
						console.log(
							`Web App will be available on: ${config.fullDevWebappUrl}`
						);
					}
				);
			}
		);
	});
};
