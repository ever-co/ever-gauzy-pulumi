import * as awsx from '@pulumi/awsx';
import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import * as db from '../../db';
import * as config from '../../config';
import * as backendAPI from './backend-api';
import * as frontend from './frontend';
import { Environment } from '../environments';
import * as k8s from '@pulumi/kubernetes';

export const setupDemoEnvironment = async (dockerImages: {
	apiImage: string;
	webappImage: string;
}) => {
	const dbCluster = await db.createPostgreSQLCluster(Environment.Prod);

	const vpc = aws.ec2.getVpc({
		tags: {
			Name: 'ever-dev',
		},
	});

	const vpcDb = awsx.ec2.Vpc.getDefault();

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
	});

	// Update routing tables of all subnets within the EKS VPC to allow connection to RDS
	(await subnets).ids.forEach(async (subnetId) => {
		const routeTableId = aws.ec2.getRouteTable({
			vpcId: (await vpc).id,
			subnetId,
		});

		const routeRule = new aws.ec2.Route(`eks-route-${subnetId}`, {
			routeTableId: (await routeTableId).id,
			destinationCidrBlock: vpcDb.vpc.cidrBlock,
			vpcPeeringConnectionId: vpcPeeringConnection.id,
		});
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

	const privateSubnets = aws.ec2.getSubnetIds({
		vpcId: (await vpc).id,
		tags: {
			type: 'private',
		},
	});

	// Update Security group rules
	const rdsSecurityRule = new aws.ec2.SecurityGroupRule(
		'rds-security-group-rule',
		{
			fromPort: 0,
			toPort: 5432,
			protocol: 'TCP',
			type: 'ingress',
			cidrBlocks: (await privateSubnets).ids.map(async (subnetId) => {
				const subnet = aws.ec2.getSubnet({
					id: subnetId,
				});
				return (await subnet).cidrBlock;
			}),
			securityGroupId: vpcDb.vpc.defaultSecurityGroupId,
		}
	);

	const cluster = await aws.eks.getCluster({
		name: 'ever-dev',
	});

	const cluster_kubeconfig = pulumi
		.all([cluster.name, cluster.endpoint, cluster.certificateAuthority])
		.apply(
			([
				currentClusterName,
				clusterEndpoint,
				clusterCertificateAuthority,
			]) => {
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
										currentClusterName,
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

	// Create a Kubernetes Namespace for our production app API and front-end
	// NOTE: SaaS may use same k8s cluster, but create different namespaces, one per tenant
	const ns = new k8s.core.v1.Namespace(
		'gauzy-dev',
		{
			metadata: {
				name: 'gauzy-dev',
			},
		},
		{ provider }
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

	const frontendResponse = await frontend.createFrontend(
		dockerImages.webappImage,
		provider,
		namespaceName,
		config.fullProdApiUrl
	);

	return { dbCluster, cluster, frontendResponse, backendAPIResponse };
};
