import { defineBackend } from '@aws-amplify/backend';

const backend = defineBackend({});

// VPC config for ElastiCache connectivity
backend.addOutput({
  custom: {
    vpcConfig: {
      vpcId: 'vpc-0372924852c0332ad',
      subnetIds: [
        'subnet-00f723af49295d2a1',
        'subnet-0ed2ec7842e90e1e6',
        'subnet-00baec95399a9a155'
      ],
      securityGroupIds: ['sg-06adc40b985309b52']
    }
  }
});
