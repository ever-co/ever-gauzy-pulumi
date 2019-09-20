# Deploy and Manage Gauzy Platform on Clouds

Note: WIP, but already useful :)

## Introduction

This projects uses [Pulumi](https://www.pulumi.com) to easy and quickly deploy [Gauzy Platform](https://github.com/ever-co/gauzy) into Clouds with single command (`pulumi up`). It currently supports AWS Fargate Clusters (for web app and backend api), Application Load Balancers and Serverless PostgreSQL DB deployments.

## Quick start

- [Setup pulumi locally](https://www.pulumi.com/docs/reference/install)
- Setup AWS CLI locally
- Configure cloud credentials locally with `aws configure` and create AWS profile: `ever`
- Change (optionally) Pulumi Stack with `pulumi stack select dev` (different stacks may use different services, e.g. k8s vs AWS Fargate for production vs development)
- Deploy to Cloud: `pulumi up`
- Enjoy

Links:

- Read more about Pulumi at <https://github.com/pulumi/pulumi>
- For CircleCI configuration, see <https://github.com/pulumi/circleci>

## Implementation

Implementation currenty based on Pulumi libraries specific to AWS Cloud.
That's why no other Clouds currently supported, but it should be possible at some point to rewrite code using Pulumi Cloud-Agnostic Packages,
see <https://github.com/pulumi/pulumi-cloud>, <https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/cloud>, <https://www.pulumi.com/docs/tutorials/cloudfx>, etc.
(AWS and Azure clouds should be supported in such case)

Note: for some of AWS specific features (if Pulumi does not support them yet) we can use AWS CDK, see <https://docs.aws.amazon.com/en_pv/cdk/latest/guide/home.html>

### Branches, Pulumi Stacks and Environments

We have 3 following branches for Gauzy Pulumi repo:

- `master` for Production deployment (<https://app.gauzy.co>)
- `develop` for Development deployment (default Github branch, <https://dev.gauzy.co>)
- `demo` for demo (<https://demo.gauzy.co>)

Before Gauzy SaaS Platform will be ready, we just deploy current Gauzy Platform to all environments.

Note: sub-domains are subject to change.

Each Github branch correspond to separate Pulumi Stacks. Mapping defined in the [./pulumi/ci.json](https://github.com/ever-co/gauzy-pulumi/blob/develop/.pulumi/ci.json) file.

In addition, Gauzy Platform build with different settings for each environment (e.g NODE_ENV set to `production` for production env)

## TODO

- [ ] Setup [Redash](https://github.com/getredash/redash) in the same cluster, see <https://github.com/getredash/redash/blob/master/setup/docker-compose.yml> (optionally, but it's great to have that for Gauzy)

- [ ] Finish setup Github Actions, see <https://github.com/ever-co/gauzy-pulumi/blob/master/.github/workflows/main.yml>

- [ ] Add support for `develop` and `demo` stacks (branches created)

- [ ] Fix CircleCI build for this pulumi project: currently it does not have Docker in the build VM and so stage to build docker containers fails and also we should pull Gauzy repo into sub-folder for Docker builds or found another way. We also should fix PATH to docker files, which is hard-coded now like:

```typescript
const context = "C:/Coding/Gauzy/gauzy";
const dockerfile = "C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile"
```

See also <https://www.pulumi.com/docs/guides/continuous-delivery/circleci> and <https://circleci.com/orbs/registry/orb/pulumi/pulumi>

- [ ] Security Group of Fargate Service should be added to RDS Cluster for full access to RDS DB. Note: it should be done this way: first we create such security group, next we use it when create RDS Cluster and next we use it when create Fargate Cluster

- [ ] for large production we should use k8s (currently we use Fargate), see <https://www.pulumi.com/docs/guides/k8s-the-prod-way> how to setup with Pulumi

## Pulumi related FAQ

- Removed resource manually in the Cloud? Run `pulumi refresh`

## Pulumi related Open-Source projects

- Github Pulumi Actions: see <https://github.com/pulumi/actions> and <https://www.pulumi.com/docs/guides/continuous-delivery/github-actions>
- <https://github.com/cappalyst/cappalyst-pulumi>
- <https://www.npmjs.com/package/@operator-error/pulumi-lambda-cert>
- <https://github.com/jen20/pulumi-aws-vpc>
- <https://github.com/ibrasho/pulumi-github>
- <https://github.com/k-higuchi0440/pulumi-aws-staticsite-builder>

## Trademarks

Gauzy™ is a trademark of Ever Co. LTD.  
All other brand and product names are trademarks, registered trademarks or service marks of their respective holders.

*Copyright © 2019, Ever Co. LTD. All rights reserved.*
