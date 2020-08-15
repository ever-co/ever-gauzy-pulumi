// tslint:disable-next-line: no-var-requires
require('dotenv').config();
import {
	getRunningEnvironment,
	Environment,
	setupDemoEnvironment,
	setupDevEnvironment,
	setupProdEnvironment,
	setupFargateEnvironment,
	setupECSEnvironment
} from './src/environments';
import { createDockerImages } from './src/docker-images';
import { RepositoryImage } from '@pulumi/awsx/ecr';

(async () => {
	try {
		const environment = await getRunningEnvironment();

		console.log(`Running in ${environment} Environment`);

		const dockerImages = await createDockerImages(environment);

		switch (environment) {
			case Environment.Fargate:
				await setupFargateEnvironment(dockerImages);
				break;

			case Environment.ECS:
				await setupECSEnvironment(dockerImages);
				break;

			case Environment.Dev:
				await setupDevEnvironment({
					apiImage: <RepositoryImage>dockerImages.apiImage,
					webappImage: <RepositoryImage>dockerImages.webappImage
				});
				break;

			case Environment.Demo:
				await setupDemoEnvironment({
					apiImage: <RepositoryImage>dockerImages.apiImage,
					webappImage: <RepositoryImage>dockerImages.webappImage
				});
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
