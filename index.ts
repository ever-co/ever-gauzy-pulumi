require("dotenv").config();
import { 
  getRunningEnvironment, 
  Environment,   
  setupDemoEnvironment,
  setupDevEnvironment,
  setupProdEnvironment
} from "./src/environments";
import { createDockerImages } from "./src/docker-images";

(async () => {
  try {

    const environment = await getRunningEnvironment();

    console.log(`Running in ${environment} Environment`);

    const dockerImages = await createDockerImages(environment);

    switch (environment) {

      case Environment.Dev:
          await setupDevEnvironment(dockerImages);
          break;

      case Environment.Demo:
        await setupDemoEnvironment(dockerImages);
        break;

      case Environment.Prod:
        await setupProdEnvironment(dockerImages);
        break;      
    }
    
  } catch (err) {
    console.log(err);
  }
})();
