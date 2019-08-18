import * as aws from "@pulumi/aws";
import { Pool, Client } from "pg";
import { EngineMode } from "@pulumi/aws/rds";

export const getEngineMode = () => {
  let engineMode: EngineMode = "provisioned";

  if (process.env.DB_MODE == "serverless") {
    engineMode = "serverless";
  }

  return engineMode;
};

export const getIsPubliclyAccessible = () => {
  let dbPubliclyAccessible: any;

  if (process.env.DB_MODE == "serverless") {
    dbPubliclyAccessible = false;
  } else {
    dbPubliclyAccessible = process.env.DB_PUBLICLY_ACCESSIBLE == "true";
  }

  return dbPubliclyAccessible;
};

/**
 * Create Aurora Serverless PostgreSQL Cluster
 */
export const createPostgreSQLCluster = async () => {
  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASS;

  if (!dbName || !dbPassword || !dbUser) {
    throw new Error("DB Credentials invalid");
  }

  const engineMode = getEngineMode();
  const publiclyAccessible = getIsPubliclyAccessible();

  if (publiclyAccessible) {
      // TODO: we need to create security group with public access to DB
  }

  const postgresqlCluster = new aws.rds.Cluster("gauzy-db", {
    availabilityZones: ["us-east-1a", "us-east-1b", "us-east-1c"],
    backupRetentionPeriod: 30,
    clusterIdentifier: "gauzy-db",

    // TODO: set false in production
    skipFinalSnapshot: true,

    databaseName: dbName,
    storageEncrypted: true,
    engine: "aurora-postgresql",
    engineVersion: "10.7",
    masterPassword: dbPassword,
    masterUsername: dbUser,
    preferredBackupWindow: "07:00-09:00",
    deletionProtection: false,
    engineMode
  });

  // for engineMode: "serverless" we don't need instances
  if (engineMode == "provisioned") {
    new aws.rds.ClusterInstance("gauzy-db-1", {
      engine: "aurora-postgresql",
      engineVersion: postgresqlCluster.engineVersion,
      applyImmediately: true,
      clusterIdentifier: postgresqlCluster.id,
      identifier: "gauzy-db-1",
      instanceClass: "db.t3.medium",
      autoMinorVersionUpgrade: true,
      availabilityZone: "us-east-1a",
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
export const check = async (host: string, port: number) => {

  if (getIsPubliclyAccessible()) {
    const dbName = process.env.DB_NAME;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASS;

    const connectionOptions = {
      user: dbUser,
      host: host,
      database: dbName,
      password: dbPassword,
      port: port
    };

    const pool = new Pool(connectionOptions);

    pool.query("SELECT NOW()", (err: any, res: any) => {
      if (err) {
        console.log(err, res);
      }
      pool.end();
    });

    const client = new Client(connectionOptions);
    client.connect();
    client.query("SELECT NOW()", (err: any, res: any) => {
      if (err) {
        console.log(err, res);
      }
      client.end();
    });    
  }
};
