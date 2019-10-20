import * as awsx from '@pulumi/awsx';
import { Cluster } from '@pulumi/awsx/ecs';
import {
	backendPort,
	sslDevCertificateARN as sslCertificateARN,
	devApiPort
} from '../../config';

export const createBackendAPI = async (
	apiImage: awsx.ecs.Image,
	cluster: Cluster,
	dbHost: string,
	dbPort: number
) => {
	// We don't really need LBs for Dev, however ECS does not support auto-assign of public IP with EC2 launch type, so it's more easy to just create LBs
	// See https://github.com/aws/containers-roadmap/issues/450

	// Create ALB (application load balancer), see https://www.pulumi.com/docs/guides/crosswalk/aws/elb
	const alb = new awsx.lb.ApplicationLoadBalancer('gauzy-api-dev', {
		name: 'gauzy-api-dev',
		securityGroups: cluster.securityGroups,
		external: true,
		enableHttp2: true,
		// this can be helpful to avoid accidentally deleting a long-lived, but auto-generated, load balancer URL.
		enableDeletionProtection: false
	});

	// This defines where requests will be forwarded to (e.g. in our case Fargate Services running and listening on port 4200)
	const apiBackendTarget = alb.createTargetGroup('gauzy-api-dev-target', {
		name: 'gauzy-api-dev-target',
		port: backendPort,
		protocol: 'HTTP',
		healthCheck: {
			unhealthyThreshold: 10,
			timeout: 120,
			interval: 300,
			path: '/api/hello',
			protocol: 'HTTP',
			port: backendPort.toString()
		}
	});

	const backendAPIListener = apiBackendTarget.createListener(
		'gauzy-api-dev',
		{
			name: 'gauzy-api-dev',
			port: devApiPort,
			protocol: 'HTTPS',
			external: true,
			certificateArn: sslCertificateARN,
			sslPolicy: 'ELBSecurityPolicy-2016-08'
		}
	);

	const dbName = process.env.DB_NAME || 'gauzy';
	const dbUser = process.env.DB_USER
		? <string>process.env.DB_USER
		: 'gauzy_user';
	const dbPassword = process.env.DB_PASS
		? <string>process.env.DB_PASS
		: 'change_me';

	const backendAPIService = new awsx.ecs.EC2Service('gauzy-api-dev', {
		cluster,
		desiredCount: 1,
		securityGroups: cluster.securityGroups,
		taskDefinitionArgs: {
			containers: {
				backendAPI: {
					portMappings: [backendAPIListener],
					image: apiImage,
					cpu: 1024 /*100% of 1024 is 1 vCPU*/,
					memory: 1900 /*MB*/,
					environment: [
						{ name: 'DB_TYPE', value: 'postgres' },
						{ name: 'DB_HOST', value: dbHost },
						{ name: 'DB_PORT', value: dbPort.toString() },
						{ name: 'DB_PASS', value: dbPassword },
						{ name: 'DB_USER', value: dbUser },
						{ name: 'DB_NAME', value: dbName }
					]
				}
			}
		}
	});

	return { backendAPIListener, backendAPIService };
};
