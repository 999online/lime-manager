import { FC } from 'react';
import { Web3ProviderInterface } from '@gitroom/frontend/components/launches/web3/web3.provider.interface';
export const web3List: {
  identifier: string;
  component: FC<Web3ProviderInterface>;
}[] = [];
