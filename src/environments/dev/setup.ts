import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import * as db from '../../db';
import * as config from '../../config';
import * as backendAPI from './backend-api';
import * as frontend from './frontend';
import { Environment } from '../environments';
import * as eks from '@pulumi/eks';
import * as k8s from '@pulumi/kubernetes';

const managedPolicyArns: string[] = [
	'arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy',
	'arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy',
	'arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly',
];

/**
 * Creates a role and attaches IAM managed policies to the EKS worker node
 * @param name
 */
function createAndAttachRole(name: string): aws.iam.Role {
	const role = new aws.iam.Role(name, {
		assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
			Service: 'ec2.amazonaws.com',
		}),
	});

	let counter = 0;

	for (const policy of managedPolicyArns) {
		const rolePolicyAttachment = new aws.iam.RolePolicyAttachment(
			`${name}-policy-${counter++}`,
			{
				policyArn: policy,
				role,
			}
		);
	}

	return role;
}

export const setupDevEnvironment = async (dockerImages: {
	apiImage: string;
	webappImage: string;
}) => {
	const dbCluster = await db.createPostgreSQLCluster(Environment.Prod);

	// Allocate a new VPC with custom settings, and a public & private subnet per AZ.
	// const vpc = new awsx.ec2.Vpc(
	// 	'gauzy-prod-vpc',
	// 	{
	// 		cidrBlock: '172.16.0.0/16',
	// 		subnets: [
	// 			{
	// 				type: 'public',
	// 				tags: {
	// 					// TODO: we need to know AWS Cluster name to put in here!!!
	// 					// Next tags needed so k8s found public Subnets where to add external ELB
	// 					// see https://github.com/kubernetes/kubernetes/issues/29298
	// 					KubernetesCluster: 'ever-dev',
	// 					'kubernetes.io/role/elb': '',
	// 				},
	// 			},
	// 			{ type: 'private' },
	// 		],
	// 	},
	// 	{ dependsOn: dbCluster }
	// );
	const vpc = aws.ec2.getVpc({
		tags: {
			Name: 'ever-dev',
		},
	});
	// we deploy Serverless DB to default VPC, now we need to create peering between them
	// see https://github.com/pulumi/pulumi-aws/blob/master/sdk/nodejs/ec2/peeringConnectionOptions.ts
	// So we create following Peer Connection:
	// Requester VPC: RDS VPC
	// Requester CIDRs: 172.31.0.0/16
	// Accepter VPC: EKS VPC
	// Accepter CIDRs: 172.16.0.0/16
	// For DNS we enable both ways resolution for now

	const vpcDb = awsx.ec2.Vpc.getDefault();
	// const vpcDb = new awsx.ec2.Vpc('rds-vpc', {
	// 	cidrBlock: '10.0.0.0/24',
	// 	subnets: [
	// 		{
	// 			name: 'rds-private-subnet',
	// 			type: 'private',
	// 			tags: {
	// 				Name: 'rds-private-subnet',
	// 			},
	// 		},
	// 	],
	// 	tags: {
	// 		Name: 'rds-vpc',
	// 	},
	// });

	const vpcPeeringConnection = new aws.ec2.VpcPeeringConnection(
		'vpc-peering',
		{
			autoAccept: true,
			peerVpcId: (await vpc).id,
			vpcId: vpcDb.id,
			tags: {
				Name: 'eks-rds-peering',
			},
		}
	);

	const peeringConnectionOptions = new aws.ec2.PeeringConnectionOptions(
		'vpc-peering',
		{
			accepter: {
				allowClassicLinkToRemoteVpc: false,
				allowVpcToRemoteClassicLink: true,
				allowRemoteVpcDnsResolution: true,
			},
			requester: {
				allowClassicLinkToRemoteVpc: false,
				allowVpcToRemoteClassicLink: true,
				allowRemoteVpcDnsResolution: true,
			},
			vpcPeeringConnectionId: vpcPeeringConnection.id,
		}
	);
	// Get private subnets of the EKS VPC
	const subnets = aws.ec2.getSubnetIds({
		vpcId: (await vpc).id,
		tags: {
			type: 'private',
		},
	});
	// Associate all subnets into the EKS route table
	(await subnets).ids.forEach(async (subnetId) => {
		// const routeTable = await aws.ec2.getRouteTable({ subnetId: subnetId });
		const eksSubnetAssociation = new aws.ec2.RouteTableAssociation(
			`eks-subnet-route-${subnetId}`,
			{
				routeTableId: (await vpc).mainRouteTableId,
				subnetId: subnetId,
			}
		);
	});

	// Update Route tables for EKS and RDS
	const eksRoutingRule = new aws.ec2.Route('eks-routing-rule-rds', {
		routeTableId: (await vpc).mainRouteTableId,
		destinationCidrBlock: vpcDb.vpc.cidrBlock,
		vpcPeeringConnectionId: vpcPeeringConnection.id,
	});

	const rdsRoutingRule = new aws.ec2.Route('rds-routing-rule-eks', {
		routeTableId: vpcDb.vpc.mainRouteTableId,
		destinationCidrBlock: (await vpc).cidrBlock,
		vpcPeeringConnectionId: vpcPeeringConnection.id,
	});
	// Get the CIDR Blocks of the private subnets of the EKS cluster
	let eksPrivateCIDRBlocks: string[] = [];
	(await subnets).ids.forEach(async (id) => {
		const subnet = aws.ec2.getSubnet({
			id: id,
		});
		eksPrivateCIDRBlocks.push((await subnet).cidrBlock);
	});
	// Update Security group rules
	const rdsSecurityRule = new aws.ec2.SecurityGroupRule(
		'rds-security-group-rule',
		{
			fromPort: 0,
			toPort: 5432,
			protocol: 'TCP',
			type: 'ingress',
			cidrBlocks: (await subnets).ids.map(async (subnetId) => {
				const subnet = aws.ec2.getSubnet({
					id: subnetId,
				});
				return (await subnet).cidrBlock;
			}),
			securityGroupId: vpcDb.vpc.defaultSecurityGroupId,
		}
	);
	// TODO: for each of EKS VPC route tables, we need to add following:
	// Destination: 172.31.0.0/16, Target: pcx-0d0361d11b98223e4 (peer connection)
	// For RDS VPC route tables, we need to add following:
	// Destination: 172.16.0.0/16, Target: pcx-0d0361d11b98223e4 (peer connection)

	const cluster = await aws.eks.getCluster({
		name: 'ever-dev',
	});
	const cluster_kubeconfig = pulumi
		.all([cluster.name, cluster.endpoint, cluster.certificateAuthority])
		.apply(
			([clusterName, clusterEndpoint, clusterCertificateAuthority]) => {
				return {
					apiVersion: 'v1',
					clusters: [
						{
							cluster: {
								server: clusterEndpoint,
								'certificate-authority-data':
									clusterCertificateAuthority.data,
							},
							name: 'kubernetes',
						},
					],
					contexts: [
						{
							context: {
								cluster: 'kubernetes',
								user: 'aws',
							},
							name: 'aws',
						},
					],
					'current-context': 'aws',
					kind: 'Config',
					users: [
						{
							name: 'aws',
							user: {
								exec: {
									apiVersion:
										'client.authentication.k8s.io/v1alpha1',
									args: [
										'eks',
										'get-token',
										'--cluster-name',
										clusterName,
									],
									command: 'aws',
								},
							},
						},
					],
				};
			}
		);
	const name = 'gauzy';
	const provider = new k8s.Provider(`${name}-eks-k8s`, {
		kubeconfig: cluster_kubeconfig.apply(JSON.stringify),
	});
	// Create the EKS cluster, including a "gp2"-backed StorageClass
	// const cluster = new eks.Cluster('ever-dev', {
	// name: 'ever-dev',
	// vpcId: vpc.id,
	// publicSubnetIds: vpc.publicSubnetIds,
	// privateSubnetIds: vpc.privateSubnetIds,
	// storageClasses: 'gp2',
	// instanceType: 'm5.xlarge',
	// desiredCapacity: 3,
	// minSize: 1,
	// maxSize: 3,
	// version:'1.17',
	// providerCredentialOpts: {
	// profileName: "default",
	// },
	// enabledClusterLogTypes: [
	// 'api',
	// 'audit',
	// 'authenticator',
	// 'controllerManager',
	// 'scheduler'
	// ],
	// skipDefaultNodeGroup: false,
	// tags: {
	// Name: 'ever-dev',
	// }
	// }, /*{ protect: true } */);

	// We are using https://github.com/helm/charts/tree/master/stable/kubernetes-dashboard

	// Run `kubectl create clusterrolebinding kubernetes-dashboard --clusterrole=cluster-admin --serviceaccount=default:kubernetes-dashboard`
	// (note: not secure enough, but fine for testing)

	// Dashboard should be available at http://localhost:8001/api/v1/namespaces/kube-system/services/https:kubernetes-dashboard:/proxy/#!/login
	// after running `kubectl proxy`

	// Next, to get token run following command:
	// kubectl -n kube-system describe secrets `kubectl -n kube-system get secrets | awk '/clusterrole-aggregation-controller/ {print $1}'` | awk '/token:/ {print $2}'
	// (you need to use bash)

	// See also:
	// - https://github.com/kubernetes/dashboard/issues/2474
	// - https://github.com/pulumi/pulumi-kubernetes/issues/600
	// - https://github.com/kubernetes/dashboard/blob/master/docs/user/access-control/README.md
	// Role binding for kubernetes-dashboard
	const dashboard_rbac = new k8s.rbac.v1.ClusterRoleBinding(
		'k8s-dashboard-rbac',
		{
			apiVersion: 'rbac.authorization.k8s.io/v1',
			kind: 'ClusterRoleBinding',
			metadata: {
				name: 'kubernetes-dashboard',
			},
			roleRef: {
				name: 'cluster-admin',
				kind: 'ClusterRole',
				apiGroup: 'rbac.authorization.k8s.io',
			},
			subjects: [
				{
					kind: 'ServiceAccount',
					name: 'kubernetes-dashboard',
					namespace: 'default',
				},
			],
		},
		{ provider: provider }
	);
	const k8sDashboardChart = new k8s.helm.v2.Chart(
		'kubernetes-dashboard',
		{
			repo: 'stable',
			chart: 'kubernetes-dashboard',
		},
		{ providers: { kubernetes: provider } }
	);

	// const kubeconfig = cluster.kubeconfig;

	// const clusterName = cluster.core.cluster.name;
	const clusterName = cluster.name;

	// Create a Kubernetes Namespace for our production app API and front-end
	// NOTE: SaaS may use same k8s cluster, but create different namespaces, one per tenant
	const ns = new k8s.core.v1.Namespace(
		'gauzy-dev',
		{
			metadata: {
				name: 'gauzy-dev',
			},
		},
		{ provider: provider }
	);

	const namespaceName = ns.metadata.name;

	const port = parseInt(<string>process.env.DB_PORT, 10);

	await db.check(Environment.Prod, dbCluster.endpoint, port);

	const backendAPIResponse = await backendAPI.createBackendAPI(
		dockerImages.apiImage,
		provider,
		namespaceName,
		dbCluster.endpoint,
		port
	);

	// TODO: Because LB created by k8s itself,
	// not by Pulumi and pulumi does not wait creation of such LB to be finished,
	// we don't really get now real LB URL...

	// e.g. https://af91c38e5e3cd11e9a4af1292f67fc7d-708947058.us-east-1.elb.amazonaws.com
	// or http://af91c38e5e3cd11e9a4af1292f67fc7d-708947058.us-east-1.elb.amazonaws.com:3000
	// const backendApiUrl =
	// 	port !== 443
	// 		? pulumi.interpolate`http://${backendAPIResponse.serviceHostname.get()}:${backendAPIResponse.port.get()}`
	// 		: pulumi.interpolate`https://${backendAPIResponse.serviceHostname.get()}`;

	// backendApiUrl.apply((it) => {
	// 	console.log(`API Url: ${it}`);
	// });

	const frontendResponse = await frontend.createFrontend(
		dockerImages.webappImage,
		provider,
		namespaceName,
		config.fullProdApiUrl
	);

	// e.g. http://a07be926ce3ce11e9a4af1292f67fc7d-278090253.us-east-1.elb.amazonaws.com:4200
	// const frontendAppUrl =
	// port !== 443
	// ? pulumi.interpolate`http://${frontendResponse.serviceHostname.get()}:${frontendResponse.port.get()}`
	// : pulumi.interpolate`https://${frontendResponse.serviceHostname.get()}`;

	// frontendAppUrl.apply((it) => {
	// 	console.log(`Frontend Url: ${it}`);
	// });

	// kubeconfig.apply((it) => {
	// console.log(`KubeConfig: ${JSON.stringify(it)}`);
	// });

	// clusterName.apply((it) => {
	// console.log(`ClusterName: ${JSON.stringify(it)}`);
	// });

	return { dbCluster, cluster };
};
