import { elasticClient } from '../config/elasticsearch.js';

export async function ensureEmailIndex() {
  try {
    const exists = await elasticClient.indices.exists({ index: 'emails' });
    if (!exists) {
      await elasticClient.indices.create({
        index: 'emails',
        body: {
          mappings: {
            properties: {
              userId: { type: 'keyword' },
              recipient: { type: 'keyword' },
              subject: { type: 'text' },
              status: { type: 'keyword' },
              body: { type: 'text' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
            },
          },
        },
      });
    }
  } catch (error) {
    console.warn('Elasticsearch index setup failed', error);
  }
}

export async function indexEmailDocument(email: Record<string, unknown>) {
  try {
    await ensureEmailIndex();
    await elasticClient.index({
      index: 'emails',
      id: String(email.id),
      document: {
        ...email,
        createdAt: email.createdAt ?? new Date().toISOString(),
      },
    });
  } catch (error) {
    console.warn('Elasticsearch indexing failed', error);
  }
}

export async function searchEmailDocuments(query: string) {
  try {
    await ensureEmailIndex();
    const result = (await elasticClient.search({
      index: 'emails',
      body: {
        query: {
          multi_match: {
            query,
            fields: ['recipient', 'subject', 'status'],
            fuzziness: 'AUTO',
          },
        },
      },
    })) as any;

    return result.hits.hits.map((hit: any) => hit._source);
  } catch (error) {
    console.warn('Elasticsearch search failed', error);
    return [];
  }
}
