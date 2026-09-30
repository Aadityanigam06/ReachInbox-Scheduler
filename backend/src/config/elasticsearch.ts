import { Client } from '@elastic/elasticsearch';
import { env } from './env.js';

export const elasticClient = new Client({ node: env.elasticsearchUrl, maxRetries: 0, requestTimeout: 1000 });
