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

- [ ] Security Group of Fargate Service should be added to RDS Cluster for full access to RDS DB. Note: it should be done this way: first we create such security group, next we use it when create RDS Cluster and next we use it when create Fargate Cluster
- [ ] Manually changed Health Checks in LB to /api/hello. We need instead to configure it with Pulumi and do requests to `/health`

## Trademarks

Gauzy™ is a trademark of Ever Co. LTD.  
All other brand and product names are trademarks, registered trademarks or service marks of their respective holders.

*Copyright © 2019, Ever Co. LTD. All rights reserved.*
