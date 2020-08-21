import * as pulumi from '@pulumi/pulumi';
import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';
import * as eks from '@pulumi/eks';
import * as k8s from '@pulumi/kubernetes';
import * as cloudflare from '@pulumi/cloudflare';
import * as config from '../../config';

export const createBackendAPI = async (
	apiImage: string,
	provider: k8s.Provider,
	namespaceName: pulumi.Output<string>,
	dbHost: pulumi.Output<string>,
	dbPort: number
) => {
	const name = 'gauzy-api-dev';

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
		requests: {
			cpu: '500m',
			memory: '3000Mi',
		},
		limits: {
			cpu: '1500m',
			memory: '4000Mi',
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
		name,
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
		name,
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
		name: config.prodApiDomain,
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

/**
 * This function can be used to create ingress for k8s manually with LB and SSL Certificate
 * See: https://www.pulumi.com/blog/kubernetes-ingress-with-aws-alb-ingress-controller-and-pulumi-crosswalk/
 * @param cluster
 */
// function buildIngressManually(cluster: eks.Cluster) {
// 	const clusterNodeInstanceRoleName = cluster.instanceRoles.apply(
// 		(roles) => roles[0].name
// 	);

// 	const clusterName = cluster.eksCluster.name;

// 	// Create IAM Policy for the IngressController called "ingressController-iam-policy” and read the policy ARN.
// 	const ingressControllerPolicy = new aws.iam.Policy(
// 		'ingressController-iam-policy',
// 		{
// 			policy: {
// 				Version: '2012-10-17',
// 				Statement: [
// 					{
// 						Effect: 'Allow',
// 						Action: [
// 							'acm:DescribeCertificate',
// 							'acm:ListCertificates',
// 							'acm:GetCertificate',
// 						],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: [
// 							'ec2:AuthorizeSecurityGroupIngress',
// 							'ec2:CreateSecurityGroup',
// 							'ec2:CreateTags',
// 							'ec2:DeleteTags',
// 							'ec2:DeleteSecurityGroup',
// 							'ec2:DescribeInstances',
// 							'ec2:DescribeInstanceStatus',
// 							'ec2:DescribeSecurityGroups',
// 							'ec2:DescribeSubnets',
// 							'ec2:DescribeTags',
// 							'ec2:DescribeVpcs',
// 							'ec2:ModifyInstanceAttribute',
// 							'ec2:ModifyNetworkInterfaceAttribute',
// 							'ec2:RevokeSecurityGroupIngress',
// 						],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: [
// 							'elasticloadbalancing:AddTags',
// 							'elasticloadbalancing:CreateListener',
// 							'elasticloadbalancing:CreateLoadBalancer',
// 							'elasticloadbalancing:CreateRule',
// 							'elasticloadbalancing:CreateTargetGroup',
// 							'elasticloadbalancing:DeleteListener',
// 							'elasticloadbalancing:DeleteLoadBalancer',
// 							'elasticloadbalancing:DeleteRule',
// 							'elasticloadbalancing:DeleteTargetGroup',
// 							'elasticloadbalancing:DeregisterTargets',
// 							'elasticloadbalancing:DescribeListeners',
// 							'elasticloadbalancing:DescribeLoadBalancers',
// 							'elasticloadbalancing:DescribeLoadBalancerAttributes',
// 							'elasticloadbalancing:DescribeRules',
// 							'elasticloadbalancing:DescribeSSLPolicies',
// 							'elasticloadbalancing:DescribeTags',
// 							'elasticloadbalancing:DescribeTargetGroups',
// 							'elasticloadbalancing:DescribeTargetGroupAttributes',
// 							'elasticloadbalancing:DescribeTargetHealth',
// 							'elasticloadbalancing:ModifyListener',
// 							'elasticloadbalancing:ModifyLoadBalancerAttributes',
// 							'elasticloadbalancing:ModifyRule',
// 							'elasticloadbalancing:ModifyTargetGroup',
// 							'elasticloadbalancing:ModifyTargetGroupAttributes',
// 							'elasticloadbalancing:RegisterTargets',
// 							'elasticloadbalancing:RemoveTags',
// 							'elasticloadbalancing:SetIpAddressType',
// 							'elasticloadbalancing:SetSecurityGroups',
// 							'elasticloadbalancing:SetSubnets',
// 							'elasticloadbalancing:SetWebACL',
// 						],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: [
// 							'iam:GetServerCertificate',
// 							'iam:ListServerCertificates',
// 						],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: [
// 							'waf-regional:GetWebACLForResource',
// 							'waf-regional:GetWebACL',
// 							'waf-regional:AssociateWebACL',
// 							'waf-regional:DisassociateWebACL',
// 						],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: ['tag:GetResources', 'tag:TagResources'],
// 						Resource: '*',
// 					},
// 					{
// 						Effect: 'Allow',
// 						Action: ['waf:GetWebACL'],
// 						Resource: '*',
// 					},
// 				],
// 			},
// 		}
// 	);

// 	// Attach this policy to the NodeInstanceRole of the worker nodes.
// 	const nodeinstanceRole = new aws.iam.RolePolicyAttachment(
// 		'eks-NodeInstanceRole-policy-attach',
// 		{
// 			policyArn: ingressControllerPolicy.arn,
// 			role: clusterNodeInstanceRoleName,
// 		}
// 	);
// 	// Declare the ALBIngressController in 1 step with the Helm Chart.
// 	const albingresscntlr = new k8s.helm.v2.Chart(
// 		'alb',
// 		{
// 			chart:
// 				'http://storage.googleapis.com/kubernetes-charts-incubator/aws-alb-ingress-controller-0.1.11.tgz',
// 			values: {
// 				clusterName,
// 				autoDiscoverAwsRegion: 'true',
// 				autoDiscoverAwsVpcID: 'true',
// 			},
// 		},
// 		{ provider: cluster.provider }
// 	);
// }
