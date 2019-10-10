# Deploy and Manage Gauzy Platform on Clouds

Note: WIP, but already useful :)

## Introduction

- This projects uses [Pulumi](https://www.pulumi.com) to easy and quickly deploy [Gauzy Platform](https://github.com/ever-co/gauzy) into Clouds with single command (`pulumi up --yes`).
- It currently supports AWS Fargate Clusters (for web app and backend api), Application Load Balancers and Serverless PostgreSQL DB deployments.
- Read more [About Gauzy](https://github.com/ever-co/gauzy/wiki/About-Gauzy) and [How to use it](https://github.com/ever-co/gauzy/wiki/How-to-use-Gauzy) at your agency or studio.

## Quick start

- Setup [Docker](https://docs.docker.com/install)
- Setup [eksctl](https://docs.aws.amazon.com/en_pv/eks/latest/userguide/getting-started-eksctl.html) (if production k8s deployment required)
- Setup [Helm](https://helm.sh/docs/using_helm/#installing-helm) (if production k8s deployments required). Don't forget to run `helm init`!
- Setup [Pulumi](https://www.pulumi.com/docs/reference/install)
- Setup [AWS CLI](https://docs.aws.amazon.com/en_pv/cli/latest/userguide/cli-chap-install.html)
- Configure cloud credentials locally with `aws configure` and create AWS profile: `ever` (or replace AWS profile name in Pulumi.*.yaml files)
- Change (optionally) Pulumi Stack with `pulumi stack select dev`, where `dev` is stack name.
- Deploy to Cloud: `pulumi up --yes`
- Enjoy

Note: different stacks may use different services, e.g. AWS EKS (k8s) for `prod` (production) stack, AWS ECS Fargate for `demo` stack or AWS ECS container instances (with EC2) for `dev` stack.

Links:

- Read more about Pulumi at <https://github.com/pulumi/pulumi>
- For CircleCI configuration, see <https://github.com/pulumi/circleci>

## Implementation

Implementation currently based on Pulumi libraries specific to AWS Cloud.
That's why no other Clouds currently supported, but it should be possible at some point to rewrite code using Pulumi Cloud-Agnostic Packages,
see <https://github.com/pulumi/pulumi-cloud>, <https://www.pulumi.com/docs/reference/pkg/nodejs/pulumi/cloud>, <https://www.pulumi.com/docs/tutorials/cloudfx>, etc.
(AWS and Azure clouds should be supported in such case)

Note: for some of AWS specific features (if Pulumi does not support them yet) we can use AWS CDK, see <https://docs.aws.amazon.com/en_pv/cdk/latest/guide/home.html>

### Branches, Pulumi Stacks and Environments

We have 3 branches for Gauzy Pulumi repo:

- `demo` branch for demo (<https://demo.gauzy.co> or <https://demo.gauzy.dev>, login with `admin@ever.co` and password: `admin`). Stack / Environment called `demo`.
- `master` branch for Production deployment (<https://app.gauzy.co>). Stack / Environment called `prod`.
- `develop` branch for Development deployment ("default" branch, <https://app.gauzy.dev>). Stack / Environment called `dev`.

Before Gauzy SaaS Platform will be ready, we just deploy current Gauzy Platform to all environments.

Note: sub-domains are subject to change.

Each Github branch correspond to separate Pulumi Stacks.
Mapping defined in the [./pulumi/ci.json](https://github.com/ever-co/gauzy-pulumi/blob/develop/.pulumi/ci.json) file.

In addition, Gauzy Platform build with different settings for each environment (e.g NODE_ENV set to `production` for production env)

## TODO

- [ ] What about LBs / SSL with EKS for Gauzy? How better to do it? Maybe just use another LBs or provision nginx in k8s? Needs to think about it more...

- [ ] Setup [Redash](https://github.com/getredash/redash) in the same cluster, see <https://github.com/getredash/redash/blob/master/setup/docker-compose.yml> (optionally, but it's great to have that for Gauzy)

- [ ] Finish setup Github Actions, see <https://github.com/ever-co/gauzy-pulumi/blob/master/.github/workflows/main.yml>

- [ ] Fix CircleCI build for this pulumi project: currently it does not have Docker in the build VM and so stage to build docker containers fails and also we should pull Gauzy repo into sub-folder for Docker builds or found another way. We also should fix PATH to docker files, which is hard-coded now like:

```typescript
const context = "C:/Coding/Gauzy/gauzy";
const dockerfile = "C:/Coding/Gauzy/gauzy/.deploy/webapp/Dockerfile"
```

See also <https://www.pulumi.com/docs/guides/continuous-delivery/circleci> and <https://circleci.com/orbs/registry/orb/pulumi/pulumi>

- [ ] Security Group of Fargate Service should be added to RDS Cluster for full access to RDS DB. Note: it should be done this way: first we create such security group, next we use it when create RDS Cluster and next we use it when create Fargate Cluster

- Must READ: <https://www.pulumi.com/docs/guides/k8s-the-prod-way> (how to setup k8s for production with Pulumi)

## Pulumi related FAQ

- Removed resource manually in the Cloud? Run `pulumi refresh`

## Pulumi related Open-Source projects and Examples

- Github Pulumi Actions: see <https://github.com/pulumi/actions> and <https://www.pulumi.com/docs/guides/continuous-delivery/github-actions>
- <https://github.com/cappalyst/cappalyst-pulumi>
- <https://www.npmjs.com/package/@operator-error/pulumi-lambda-cert>
- <https://github.com/jen20/pulumi-aws-vpc>
- <https://github.com/ibrasho/pulumi-github>
- <https://github.com/k-higuchi0440/pulumi-aws-staticsite-builder>
- <https://github.com/pulumi/examples/tree/master/kubernetes-ts-jenkins> - this seems to be very good solution to run Jenkins in k8s with Pulumi
- <https://github.com/pulumi/examples/tree/master/kubernetes-ts-multicloud> - multi-cloud deployment for k8s
- <https://github.com/pulumi/examples/tree/master/kubernetes-ts-sock-shop> - lots of micro-services and DBs (including Mongo / MySQL / RabbitMQ queue, etc)

## Contribute

-   Please give us :star: on Github, it **helps**!
-   You are more than welcome to submit feature requests
-   Pull requests are always welcome! Please base pull requests against the _develop_ branch and follow the [contributing guide](.github/CONTRIBUTING.md).

## Collaborators and Contributors

### Development Team

#### Core

-   Ruslan Konviser ([Evereq](https://github.com/evereq))

### Contributors

-   View all of our [contributors](https://github.com/ever-co/gauzy/graphs/contributors)

## Contact Us

-   [Slack Community](https://join.slack.com/t/gauzy/shared_invite/enQtNzc5MTA5MDUwODg2LTI0MGEwYTlmNWFlNzQzMzBlOWExNTk0NzAyY2IwYWYwMzZjMTliYjMwNDI3NTJmYmM4MDQ4NDliMDNiNDY1NWU)
-   [Spectrum Community](https://spectrum.chat/gauzy)
-   [Gitter Chat](https://gitter.im/ever-co/gauzy)
-   [CodeMentor](https://www.codementor.io/evereq)
-   For business inquiries: <mailto:gauzy@ever.co>
-   Please report security vulnerabilities to <mailto:security@ever.co>
-   [Gauzy Platform @ Twitter](https://twitter.com/gauzyplatform)
-   [Gauzy Platform @ Facebook](https://www.facebook.com/gauzyplatform)

## Security

Gauzy™ follows good security practices, but 100% security cannot be guaranteed in any software!  
Gauzy™ is provided AS IS without any warranty. Use at your own risk!  
See more details in the [LICENSE](LICENSE).

In a production setup, all client-side to server-side (backend, APIs) communications should be encrypted using HTTPS/WSS/SSL (REST APIs, GraphQL endpoint, Socket.io WebSockets, etc.).

## License

This software is available under [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.txt)

This program is free software: you can redistribute it and/or modify it under the terms of the corresponding licenses described in the LICENSE files located in software sub-folders and under the terms of licenses described in individual files.

This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

You should have received a copy of the relevant GNU Licenses along with this program. If not, see http://www.gnu.org/licenses/.

[![FOSSA Status](https://app.fossa.io/api/projects/git%2Bgithub.com%2Fever-co%2Fgauzy-pulumi.svg?type=large)](https://app.fossa.io/projects/git%2Bgithub.com%2Fever-co%2Fgauzy-pulumi?ref=badge_large)

## Trademarks

Gauzy™ is a trademark of Ever Co. LTD.  
All other brand and product names are trademarks, registered trademarks or service marks of their respective holders.

*Copyright © 2019, Ever Co. LTD. All rights reserved.*
