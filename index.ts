// tslint:disable-next-line: no-var-requires
require('dotenv').config();
import {
	getRunningEnvironment,
	Environment,
	setupDemoEnvironment,
	setupDevEnvironment,
	setupProdEnvironment,
	// setupFargateEnvironment,
	// setupECSEnvironment,
} from './src/environments';
import { createDockerImages } from './src/docker-images';

export = async () => {
	const environment = await getRunningEnvironment();

	console.log(`Running in ${environment} Environment`);

	const dockerImages = await createDockerImages(environment);

	let resource;

	switch (environment) {
		case Environment.Fargate:
			// resource = await setupFargateEnvironment(dockerImages);
			break;

		case Environment.ECS:
			// resource = await setupECSEnvironment(dockerImages);
			break;

		case Environment.Dev:
			resource = await setupDevEnvironment({
				apiImage: dockerImages.apiImage,
				webappImage: dockerImages.webappImage,
			});
			break;

		case Environment.Demo:
			resource = await setupDemoEnvironment({
				apiImage: dockerImages.apiImage,
				webappImage: dockerImages.webappImage,
			});
			break;

		case Environment.Prod:
			resource = await setupProdEnvironment({
				apiImage: dockerImages.apiImage,
				webappImage: dockerImages.webappImage,
			});
			break;
	}
};
