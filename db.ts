import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export const createPostgreSQLCluster = async () => {

    const dbName = process.env.DB_NAME;
    const dbUser = process.env.DB_USER;
    const dbPassword = process.env.DB_PASS;

    if (!dbName || !dbPassword || !dbUser) {
        throw new Error("DB Credentials invalid");
    }

    const postgresqlCluster = new aws.rds.Cluster("gauzy-db", {
        availabilityZones: [
            "us-east-1a",
            "us-east-1b",
            "us-east-1c",
        ],
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
        engineMode: "provisioned"
    });
    
    const instance1 = new aws.rds.ClusterInstance("gauzy-db-1", {
        engine: "aurora-postgresql",
        engineVersion: postgresqlCluster.engineVersion,          
        applyImmediately: true,
        clusterIdentifier: postgresqlCluster.id,
        identifier: "gauzy-db-1",
        instanceClass: "db.t3.medium",
        autoMinorVersionUpgrade: true,
        availabilityZone: "us-east-1a",
        performanceInsightsEnabled: true,
        publiclyAccessible: true
    });

    return postgresqlCluster;    
}

