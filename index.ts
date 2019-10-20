require('dotenv').config();
import {
	getRunningEnvironment,
	Environment,
	setupDemoEnvironment,
	setupDevEnvironment,
	setupProdEnvironment
} from './src/environments';
import { createDockerImages } from './src/docker-images';
import { RepositoryImage } from '@pulumi/awsx/ecr';

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
				await setupProdEnvironment({
					apiImage: <RepositoryImage>dockerImages.apiImage,
					webappImage: <RepositoryImage>dockerImages.webappImage
				});
				break;
		}
	} catch (err) {
		console.log(err);
	}
})();
