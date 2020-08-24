import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as cloudflare from '@pulumi/cloudflare';
import * as config from '../../config';

const stack: string = pulumi.getStack();

export const createBackendAPI = async (
	apiImage: string,
	provider: k8s.Provider,
	namespaceName: pulumi.Output<string>,
	dbHost: pulumi.Output<string>,
	dbPort: number
) => {
	const name = `gauzy-api-${stack}`;

	const appLabels = {
		appClass: name,
		tier: 'backend',
	};

	// for production, we should always explicitly set secure DB credentials
	const dbName = <string>process.env.DB_NAME;
	const dbUser = <string>process.env.DB_USER;
	const dbPassword = <string>process.env.DB_PASS;

	const container = {
		name,
		image: apiImage,
		imagePullPolicy: 'Always',
		env: [
			{ name: 'DB_TYPE', value: 'postgres' },
			{ name: 'DB_HOST', value: dbHost.apply((dbHost) => dbHost) },
			{ name: 'DB_PORT', value: dbPort.toString() },
			{ name: 'DB_PASS', value: dbPassword },
			{ name: 'DB_USER', value: dbUser },
			{ name: 'DB_NAME', value: dbName },
		],
		resources: {
			requests: {
				cpu: '500m',
				memory: '1000Mi',
			},
			limits: {
				cpu: '1000m',
				memory: '2000Mi',
			},
		},
		/*
    livenessProbe: {
      httpGet: {
        path: "/api/hello",
        port: "http"
      },
      initialDelaySeconds: 180,
      timeoutSeconds: 120,
      failureThreshold: 10
    },
    readinessProbe: {
      httpGet: {
        path: "/api/hello",
        port: "http"
      },
      initialDelaySeconds: 90,
      timeoutSeconds: 120,
      periodSeconds: 10
    },
    */
		ports: [
			{
				name: 'http',
				containerPort: config.backendPort,
				protocol: 'TCP',
			},
		],
	};

	const deployment = new k8s.apps.v1.Deployment(
		`${name}-deployment`,
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
						containers: [container],
					},
				},
			},
		},
		{
			provider: provider,
		}
	);

	// Create a LoadBalancer Service

	const pulumiConfig = new pulumi.Config();
	const isMinikube = pulumiConfig.require('isMinikube');

	const service = new k8s.core.v1.Service(
		`${name}-svc`,
		{
			metadata: {
				labels: appLabels,
				name: 'api',
				namespace: namespaceName,
				annotations: {
					'service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags':
						'Name=gauzy-api-ingress',
					'service.beta.kubernetes.io/aws-load-balancer-ssl-cert':
						config.sslCoCertificateARN,
					'service.beta.kubernetes.io/aws-load-balancer-backend-protocol':
						'http',
					'service.beta.kubernetes.io/aws-load-balancer-ssl-ports':
						'https',
					// 'service.beta.kubernetes.io/aws-load-balancer-access-log-enabled':
					// 	'true',
					// 'service.beta.kubernetes.io/aws-load-balancer-access-log-emit-interval':
					// 	'5',
				},
			},
			spec: {
				// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
				// running on minikube, and if so, create only services of type ClusterIP.
				type: isMinikube === 'true' ? 'ClusterIP' : 'LoadBalancer',
				ports: [
					{
						name: 'https',
						port: 443,
						targetPort: 'http',
					},
				],
				selector: appLabels,
			},
		},
		{
			provider: provider,
		}
	);

	const apiDns = new cloudflare.Record('api-dns', {
		name: config.demoApiDomain,
		type: 'CNAME',
		value: service.status.loadBalancer.ingress[0].hostname,
		zoneId: `${process.env.ZONE_ID}`,
	});

	let serviceHostname: pulumi.Output<string>;

	if (isMinikube === 'true') {
		const frontendIp = service.spec.clusterIP;
		serviceHostname = frontendIp;
	} else {
		serviceHostname = service.status.loadBalancer.ingress[0].hostname;
	}
	return { serviceHostname, port: service.spec.ports[0].port };
};
