require("dotenv").config();

import * as cloud from "@pulumi/cloud-aws";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as db from './db';

(async () => {  
    try 
    {
    const dbCluster = await db.createPostgreSQLCluster();
    dbCluster.endpoint.apply(async dbHost => {        
        const port = 5432;
        await db.check(dbHost, port);
    });
    } catch (err) {
        console.log(err);
    }
})();