import * as aws from '@pulumi/aws';
import { Pool, Client } from 'pg';
import { EngineMode } from '@pulumi/aws/rds';
import { Environment } from './environments';

export const getEngineMode = () => {
	let engineMode: EngineMode = 'provisioned';

	if (process.env.DB_MODE == 'serverless') {
		engineMode = 'serverless';
	}

	return engineMode;
};

export const getIsPubliclyAccessible = () => {
	let dbPubliclyAccessible: any;

	if (process.env.DB_MODE == 'serverless') {
		dbPubliclyAccessible = false;
	} else {
		dbPubliclyAccessible = process.env.DB_PUBLICLY_ACCESSIBLE == 'true';
	}

	return dbPubliclyAccessible;
};

/**
 * Create Aurora Serverless PostgreSQL Cluster
 */
export const createPostgreSQLCluster = async (environment: Environment) => {
	const dbName = process.env.DB_NAME || 'gauzy';
	const dbUser = process.env.DB_USER
		? <string>process.env.DB_USER
		: 'gauzy_user';
	const dbPassword = process.env.DB_PASS
		? <string>process.env.DB_PASS
		: 'change_me';

	if (!dbName || !dbPassword || !dbUser) {
		throw new Error('DB Credentials invalid');
	}

	const engineMode = getEngineMode();
	const publiclyAccessible = getIsPubliclyAccessible();

	if (publiclyAccessible) {
		// TODO: we need to create security group with public access to DB
	}

	const clusterName = `gauzy-db-${environment.toLowerCase()}`;

	// TODO: not sure yet if we should have different engine modes for production vs dev&demo environments (e.g. serverless / provisioned).
	// For now we will use settings from environment DB_MODE (default to serverless)

	const postgresqlCluster = new aws.rds.Cluster(clusterName, {
		availabilityZones: ['us-east-1a', 'us-east-1b', 'us-east-1c'],
		backupRetentionPeriod: 30,
		clusterIdentifier: clusterName,
		skipFinalSnapshot: environment != Environment.Prod,
		databaseName: dbName,
		storageEncrypted: true,
		engine: 'aurora-postgresql',
		engineVersion: '10.7',
		masterPassword: dbPassword,
		masterUsername: dbUser,
		preferredBackupWindow: '07:00-09:00',
		deletionProtection: environment == Environment.Prod,
		engineMode
	});

	// for engineMode: "serverless" we don't need instances
	if (engineMode == 'provisioned') {
		const instanceName = `gauzy-db-${environment.toLowerCase()}`;

		new aws.rds.ClusterInstance(`${instanceName}-1`, {
			engine: 'aurora-postgresql',
			engineVersion: postgresqlCluster.engineVersion,
			applyImmediately: true,
			clusterIdentifier: postgresqlCluster.id,
			identifier: `${instanceName}-1`,
			instanceClass: 'db.t3.medium',
			autoMinorVersionUpgrade: true,
			availabilityZone: 'us-east-1a',
			performanceInsightsEnabled: true,
			publiclyAccessible
		});
	}

	return postgresqlCluster;
};

/**
 * Check access to PostgreSQL Cluster
 * @param host
 * @param port
 */
export const check = async (
	environment: Environment,
	host: string,
	port: number
) => {
	if (getIsPubliclyAccessible()) {
		const dbName = process.env.DB_NAME || 'gauzy';
		const dbUser = process.env.DB_USER
			? <string>process.env.DB_USER
			: 'gauzy_user';
		const dbPassword = process.env.DB_PASS
			? <string>process.env.DB_PASS
			: 'change_me';

		const connectionOptions = {
			user: dbUser,
			host: host,
			database: dbName,
			password: dbPassword,
			port: port
		};

		const pool = new Pool(connectionOptions);

		pool.query('SELECT NOW()', (err: any, res: any) => {
			if (err) {
				console.log(err, res);
			}
			pool.end();
		});

		const client = new Client(connectionOptions);
		client.connect();
		client.query('SELECT NOW()', (err: any, res: any) => {
			if (err) {
				console.log(err, res);
			}
			client.end();
		});
	}
};
