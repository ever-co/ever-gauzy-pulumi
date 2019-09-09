require("dotenv").config();
import * as db from "./src/db";
import * as backendAPI from "./src/backend_api";

(async () => {
  try {
    const dbCluster = await db.createPostgreSQLCluster();
    
    dbCluster.endpoint.apply(async (dbHost: any) => {
      const port = parseInt(<string>process.env.DB_PORT, 10);
      await db.check(dbHost, port);

      const backendAPIResponse = await backendAPI.createBackendAPI(dbHost, port);
      backendAPIResponse.backendAPIListener.endpoint.hostname.apply(async (url: string) => {
        console.log(`API URL: ${url}`);
      });
      
    });
  } catch (err) {
    console.log(err);
  }
})();
