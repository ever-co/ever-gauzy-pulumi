# Deploy and Manage Gauzy Platform on Clouds

WIP :)

Quick start:

- [Setup pulumi locally](https://www.pulumi.com/docs/reference/install)
- Setup AWS CLI locally
- Configure cloud credentials locally with `aws configure` and create AWS profile: `ever`
- Deploy to Cloud: `pulumi up`
- Enjoy

Links:

- Read more about Pulumi at <https://github.com/pulumi/pulumi>
- For CircleCI configuration, see <https://github.com/pulumi/circleci>

## TODOs

- [ ] Frontend should auto-generate environment.ts and environment.prod.ts files on build using
ENV vars. It's required for API_BASE_URL to be set correctly.

- [ ] Fix CircleCI build for this pulumi project: currently it does not have Docker in the build VM and so stage to build docker containers fails and also we should pull Gauzy repo into sub-folder for Docker builds or found another way. We also should fix PATH to docker files, which is hard-coded now like:

```typescript
const context = "C:/Coding/Gauzy/gauzy";
const dockerfile = "C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile"
```

- [ ] Security Group of Fargate Service should be added to RDS Cluster for full access to RDS DB. Note: it should be done this way: first we create such security group, next we use it when create RDS Cluster and next we use it when create Fargate Cluster

- [ ] Manually changed Health Checks in LB to /api/hello. We need instead to configure it with Pulumi and do requests to `/health`

- [ ] Manually changed Health Checks in LB for website: increased Unhealthy threshold to 10, timeout to 120 and Interval to 300. Reason: too slow angular build on first run (we should change from Angular dev server / build anyway later, so such issue will not be relevant in the future)

## Some interesting Pulumi repos:

- <https://github.com/cappalyst/cappalyst-pulumi>
- <https://www.npmjs.com/package/@operator-error/pulumi-lambda-cert>
- <https://github.com/jen20/pulumi-aws-vpc>
- <https://github.com/ibrasho/pulumi-github>
- <https://github.com/k-higuchi0440/pulumi-aws-staticsite-builder>

## Trademarks

Gauzy™ is a trademark of Ever Co. LTD.  
All other brand and product names are trademarks, registered trademarks or service marks of their respective holders.

*Copyright © 2019, Ever Co. LTD. All rights reserved.*
