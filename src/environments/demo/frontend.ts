import * as pulumi from '@pulumi/pulumi';
import * as k8s from '@pulumi/kubernetes';
import * as cloudflare from '@pulumi/cloudflare';
import * as config from '../../config';

const stack: string = pulumi.getStack();

export const createFrontend = async (
	webappImage: string,
	provider: k8s.Provider,
	namespaceName: pulumi.Output<string>,
	apiBaseUrl: string
) => {
	const name = `gauzy-webapp-${stack}`;

	const appLabels = {
		appClass: name,
		tier: 'frontend',
	};

	const container = {
		name,
		image: webappImage,
		env: [
			{
				name: 'API_BASE_URL',
				value: apiBaseUrl,
			},
		],
		volumeMounts: [
			{
				name: 'nginx',
				mountPath: '/etc/nginx/conf.d',
				readOnly: true,
			},
		],
		resources: {
			requests: {
				cpu: '100m',
				memory: '500Mi',
			},
			limits: {
				cpu: '400m',
				memory: '1000Mi',
			},
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
				name: 'http',
				containerPort: config.frontendPort,
				protocol: 'TCP',
			},
		],
	};

	const configmap = new k8s.core.v1.ConfigMap(
		`webapp-${stack}-config`,
		{
			apiVersion: 'v1',
			kind: 'ConfigMap',
			metadata: {
				name: 'nginx',
				namespace: namespaceName,
				labels: appLabels,
			},
			data: {
				nginx: `events {
				worker_connections 1024;
			  }

			  http {
				sendfile on;
				error_log /etc/nginx/logs/error.log warn;
				client_max_body_size 20m;
				upstream webapp {
				  server webapp:4200;
				}

				upstream api {
				  server api:3000;
				}

				server {
				  listen 8080;
				  location /api/ {
					  proxy_pass http://api;
					}

				  location / {
					proxy_pass http://webapp;
				  }
				}
			  }`,
			},
		},
		{ provider: provider }
	);

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
						volumes: [
							{
								name: 'nginx',
								configMap: {
									name: 'nginx',
									items: [
										{
											key: 'nginx',
											path: 'nginx',
										},
									],
								},
							},
						],
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
				name: 'webapp',
				namespace: namespaceName,
				annotations: {
					'service.beta.kubernetes.io/aws-load-balancer-additional-resource-tags':
						'Name=gauzy-frontend-ingress',
					'service.beta.kubernetes.io/aws-load-balancer-ssl-cert':
						config.sslCoCertificateARN,
					'service.beta.kubernetes.io/aws-load-balancer-backend-protocol':
						'http',
					'service.beta.kubernetes.io/aws-load-balancer-ssl-ports':
						'https',
					// 'service.beta.kubernetes.io/aws-load-balancer-access-log-enabled':
					// 	'true',
					// 'service.beta.kubernetes.io/aws-load-balancer-access-log-emit-interval':
					// 	'5'
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

	const webappDns = new cloudflare.Record('webapp-dns', {
		name: config.demoWebappDomain,
		type: 'CNAME',
		value: service.status.loadBalancer.ingress[0].hostname,
		zoneId: `${process.env.ZONE_ID}`,
	});

	// return LoadBalancer public Endpoint
	let serviceHostname: pulumi.Output<string>;

	if (isMinikube === 'true') {
		const frontendIp = service.spec.clusterIP;
		serviceHostname = frontendIp;
	} else {
		serviceHostname = service.status.loadBalancer.ingress[0].hostname;
	}

	return { serviceHostname, port: service.spec.ports[0].port };
};
