#!/usr/bin/env node
// Builds Postman + Bruno collections from the VoiceML OpenAPI spec.
//
// Inputs:
//   spec/callbroadcast.json (OpenAPI 3.1 spec, relative to repo root)
//
// Outputs:
//   ./voiceml-api.postman_collection.json
//   ./voiceml-api.postman_environment.json
//   ./bruno/<Folder>/<n>-<request>.bru
//   ./bruno/environments/production.bru
//   ./bruno/bruno.json

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

function resolveSpec() {
  if (process.env.VOICEML_SPEC) return process.env.VOICEML_SPEC;
  const json = resolve(repoRoot, 'spec', 'callbroadcast.json');
  if (existsSync(json)) return json;
  return resolve(repoRoot, 'spec', 'callbroadcast.yml');
}

const specPath = resolveSpec();
const spec = specPath.endsWith('.json')
  ? JSON.parse(readFileSync(specPath, 'utf8'))
  : (() => {
      throw new Error('YAML spec requires spec/callbroadcast.json — run build after generating JSON');
    })();

// ---- helpers --------------------------------------------------------------

const NO_AUTH_OPS = new Set([
  'health.check',
  'openapi.yaml',
  'openapi.yml',
  'openapi.json',
]);

const PATH_PARAM_DEFAULTS = {
  AccountSid: '{{accountSid}}',
};

// Friendly request names per operationId.
const FRIENDLY_NAMES = {
  'calls.list': 'Calls · List',
  'calls.create': 'Calls · Create (originate)',
  'calls.fetch': 'Calls · Fetch',
  'calls.update': 'Calls · Update / terminate',
  'calls.delete': 'Calls · Delete record',
  'callEvents.list': 'Calls · List events',
  'userDefinedMessages.create': 'Calls · Send user-defined message',
  'callNotifications.list': 'Calls · List notifications',
  'callRecordings.list': 'Calls · List recordings',
  'callRecordings.create': 'Calls · Start recording',
  'callRecordings.fetch': 'Calls · Fetch recording',
  'callRecordings.update': 'Calls · Update recording',
  'callRecordings.delete': 'Calls · Delete recording',
  'streams.list': 'Calls · List media streams',
  'streams.create': 'Calls · Create media stream',
  'streams.fetch': 'Calls · Fetch media stream',
  'streams.update': 'Calls · Update media stream',
  'siprec.list': 'Calls · List SIPREC sessions',
  'siprec.create': 'Calls · Start SIPREC session',
  'siprec.fetch': 'Calls · Fetch SIPREC session',
  'siprec.update': 'Calls · Update SIPREC session',
  'transcriptions.list': 'Calls · List transcriptions',
  'transcriptions.create': 'Calls · Create transcription',
  'transcriptions.fetch': 'Calls · Fetch transcription',
  'transcriptions.update': 'Calls · Update transcription',
  'conferences.list': 'Conferences · List',
  'conferences.fetch': 'Conferences · Fetch',
  'conferences.update': 'Conferences · Update',
  'participants.list': 'Conferences · List participants',
  'participants.fetch': 'Conferences · Fetch participant',
  'participants.update': 'Conferences · Update participant',
  'participants.delete': 'Conferences · Kick participant',
  'conferenceRecordings.list': 'Conferences · List recordings',
  'queues.create': 'Queues · Create',
  'queues.list': 'Queues · List',
  'queues.fetch': 'Queues · Fetch',
  'queues.update': 'Queues · Update',
  'queues.delete': 'Queues · Delete',
  'queueMembers.list': 'Queues · List members',
  'queueMembers.fetchFront': 'Queues · Peek front member',
  'queueMembers.dequeueFront': 'Queues · Dequeue front member',
  'queueMembers.fetch': 'Queues · Fetch member',
  'queueMembers.dequeue': 'Queues · Dequeue member',
  'applications.create': 'Applications · Create',
  'applications.list': 'Applications · List',
  'applications.fetch': 'Applications · Fetch',
  'applications.update': 'Applications · Update',
  'applications.delete': 'Applications · Delete',
  'recordings.list': 'Recordings · List (account catalog)',
  'recordings.fetch': 'Recordings · Fetch',
  'recordings.delete': 'Recordings · Delete',
  'recordings.fetchAudio': 'Recordings · Download WAV',
  'incomingPhoneNumbers.list': 'Incoming Phone Numbers · List',
  'incomingPhoneNumbers.create': 'Incoming Phone Numbers · Create',
  'incomingPhoneNumbers.fetch': 'Incoming Phone Numbers · Fetch',
  'incomingPhoneNumbers.update': 'Incoming Phone Numbers · Update',
  'incomingPhoneNumbers.delete': 'Incoming Phone Numbers · Delete',
  'health.check': 'Diagnostics · Health check',
  'openapi.yaml': 'Diagnostics · OpenAPI spec (YAML)',
  'openapi.yml': 'Diagnostics · OpenAPI spec (YML alias)',
  'openapi.json': 'Diagnostics · OpenAPI spec (JSON)',
};

// OpenAPI tag → display folder name.
const TAG_TO_FOLDER = {
  Api20100401Call: 'Calls',
  Api20100401CallRecording: 'Calls',
  Api20100401CallNotification: 'Calls',
  Api20100401CallTranscription: 'Calls',
  Api20100401Stream: 'Calls',
  Api20100401Siprec: 'Calls',
  Api20100401Conference: 'Conferences',
  Api20100401ConferenceRecording: 'Conferences',
  Api20100401Participant: 'Conferences',
  Api20100401Queue: 'Queues',
  Api20100401Member: 'Queues',
  Api20100401Application: 'Applications',
  Api20100401Recording: 'Recordings',
  Api20100401IncomingPhoneNumber: 'IncomingPhoneNumbers',
  Diagnostic: 'Diagnostics',
};

const FOLDER_ORDER = [
  'Calls',
  'Conferences',
  'Queues',
  'Applications',
  'Recordings',
  'IncomingPhoneNumbers',
  'Diagnostics',
];

const FOLDER_DESCRIPTIONS = {
  Calls:
    'Call resources and subresources — originate, update, terminate, recordings, streams, SIPREC, transcriptions, events, and notifications.',
  Conferences:
    'Conference resources — list, fetch, update, manage participants, and list conference-scoped recordings.',
  Queues:
    'Queue resources and members — create, list, fetch, update, delete queues; peek, fetch, and dequeue members.',
  Applications:
    'TwiML Application resources — create, list, fetch, update, and delete voice applications.',
  Recordings:
    'Account-scoped recording catalog — list, fetch, delete recordings and download WAV audio.',
  IncomingPhoneNumbers:
    'Tenant self-serve phone numbers — list, create, fetch, update, and delete DIDs assigned to the account.',
  Diagnostics:
    'VoiceML extension endpoints — health probe and OpenAPI self-publish (no authentication required).',
};

function escapeBruValue(s) {
  if (s == null) return '';
  return String(s).replace(/\r?\n/g, ' ');
}

function exampleFromSchema(schema, depth = 0) {
  if (!schema || depth > 6) return null;
  if (schema.$ref) {
    const refName = schema.$ref.replace('#/components/schemas/', '');
    const target = spec.components?.schemas?.[refName];
    return exampleFromSchema(target, depth + 1);
  }
  if (schema.example !== undefined) return schema.example;
  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length) {
    return schema.examples[0];
  }
  if (schema.default !== undefined) return schema.default;
  if (schema.enum && schema.enum.length) return schema.enum[0];
  if (schema.type === 'object' || schema.properties) {
    const out = {};
    const props = schema.properties || {};
    const required = new Set(schema.required || []);
    for (const [k, v] of Object.entries(props)) {
      if (required.has(k) || v.example !== undefined || v.default !== undefined) {
        const val = exampleFromSchema(v, depth + 1);
        if (val !== null && val !== undefined) out[k] = val;
      }
    }
    return out;
  }
  if (schema.type === 'array') {
    const item = exampleFromSchema(schema.items, depth + 1);
    return item === null || item === undefined ? [] : [item];
  }
  if (schema.type === 'integer' || schema.type === 'number') return 0;
  if (schema.type === 'boolean') return false;
  if (schema.type === 'string') {
    if (schema.format === 'date') return '2026-01-01';
    if (schema.format === 'date-time') return '2026-01-01T00:00:00Z';
    if (schema.format === 'email') return 'name@example.com';
    return '';
  }
  return null;
}

function requestBodyExample(operation) {
  const rb = operation.requestBody;
  if (!rb?.content) return null;
  const content =
    rb.content['application/json'] ||
    rb.content['application/x-www-form-urlencoded'] ||
    Object.values(rb.content)[0];
  if (!content) return null;
  if (content.example !== undefined) return content.example;
  if (content.examples) {
    const first = Object.values(content.examples)[0];
    if (first?.value !== undefined) return first.value;
  }
  return exampleFromSchema(content.schema);
}

function pathParamValue(name) {
  return PATH_PARAM_DEFAULTS[name] || `<${name}>`;
}

function postmanUrl(pathTemplate, query) {
  const segments = pathTemplate
    .split('/')
    .filter(Boolean)
    .map((seg) => seg.replace(/\{([^}]+)\}/g, ':$1'));
  const variable = [];
  for (const seg of pathTemplate.split('/').filter(Boolean)) {
    for (const m of seg.matchAll(/\{([^}]+)\}/g)) {
      const name = m[1];
      variable.push({
        key: name,
        value: pathParamValue(name),
        description: `Path parameter: ${name}`,
      });
    }
  }
  return {
    raw: `{{baseUrl}}/${segments.join('/')}${query.length ? '?' + query.map((q) => `${q.key}=${encodeURIComponent(q.value)}`).join('&') : ''}`,
    host: ['{{baseUrl}}'],
    path: segments,
    query: query.length ? query : undefined,
    variable: variable.length ? variable : undefined,
  };
}

function isNoAuth(op, opId) {
  if (NO_AUTH_OPS.has(opId)) return true;
  if (Array.isArray(op.security) && op.security.length === 0) return true;
  return false;
}

function descriptionFor(op, method, path, opId) {
  const lines = [];
  if (op.summary) lines.push(`**${op.summary}**`);
  if (op.description) lines.push(op.description);

  if (method === 'DELETE' && !['participants.delete'].includes(opId)) {
    lines.push('');
    lines.push('Returns **204 No Content** on success — no response body.');
  }

  if (opId === 'recordings.fetchAudio') {
    lines.push('');
    lines.push('Returns `audio/wav` binary content, or **302** with a presigned S3 URL in `Location`.');
  }

  if (isNoAuth(op, opId)) {
    lines.push('');
    lines.push('No authentication required.');
  } else {
    lines.push('');
    lines.push('HTTP Basic Auth: username = `{{accountSid}}`, password = `{{apiKey}}`.');
  }

  lines.push('');
  lines.push(`OperationId: \`${opId}\``);

  return lines.join('\n');
}

function postmanQueryFor(op) {
  return (op.parameters || [])
    .filter((p) => p.in === 'query')
    .map((p) => ({
      key: p.name,
      value:
        p.schema?.example !== undefined
          ? String(p.schema.example)
          : p.example !== undefined
            ? String(p.example)
            : '',
      description: p.description,
      disabled: !p.required,
    }));
}

function postmanHeadersFor(op, hasBody) {
  const out = [];
  if (hasBody) out.push({ key: 'Content-Type', value: 'application/json' });
  for (const p of op.parameters || []) {
    if (p.in === 'header') {
      out.push({
        key: p.name,
        value: p.schema?.example !== undefined ? String(p.schema.example) : '',
        description: p.description,
        disabled: !p.required,
      });
    }
  }
  return out;
}

function folderForTag(tag) {
  const folder = TAG_TO_FOLDER[tag];
  if (!folder) {
    console.error(`Unknown tag: ${tag}`);
    process.exit(1);
  }
  return folder;
}

// ---- collect all operations ----------------------------------------------

const operations = [];
for (const [path, item] of Object.entries(spec.paths)) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    const op = item[method];
    if (!op) continue;
    const tag = (op.tags && op.tags[0]) || 'Untagged';
    operations.push({
      folder: folderForTag(tag),
      tag,
      opId: op.operationId,
      method: method.toUpperCase(),
      path,
      op,
    });
  }
}

const METHOD_ORDER = { GET: 0, POST: 1, PUT: 2, PATCH: 3, DELETE: 4 };
operations.sort((a, b) => {
  return (
    FOLDER_ORDER.indexOf(a.folder) - FOLDER_ORDER.indexOf(b.folder) ||
    a.path.localeCompare(b.path) ||
    METHOD_ORDER[a.method] - METHOD_ORDER[b.method]
  );
});

// ---- Postman collection ---------------------------------------------------

const folders = new Map();
for (const name of FOLDER_ORDER) {
  folders.set(name, {
    name,
    description: FOLDER_DESCRIPTIONS[name],
    item: [],
  });
}

for (const { folder, opId, method, path, op } of operations) {
  const folderItem = folders.get(folder);

  const bodyExample = ['POST', 'PUT', 'PATCH'].includes(method) ? requestBodyExample(op) : null;
  const hasBody = bodyExample !== null && bodyExample !== undefined;
  const headers = postmanHeadersFor(op, hasBody);
  const query = postmanQueryFor(op);
  const url = postmanUrl(path, query);

  const item = {
    name: FRIENDLY_NAMES[opId] || `${folder} · ${opId}`,
    request: {
      method,
      header: headers,
      url,
      description: descriptionFor(op, method, path, opId),
    },
    response: [],
  };

  if (hasBody) {
    item.request.body = {
      mode: 'raw',
      raw: JSON.stringify(bodyExample, null, 2),
      options: { raw: { language: 'json' } },
    };
  }

  if (isNoAuth(op, opId)) {
    item.request.auth = { type: 'noauth' };
  }

  folderItem.item.push(item);
}

const collection = {
  info: {
    _postman_id: `voiceml-api-v${spec.info.version.replace(/\./g, '-')}`,
    name: `VoiceML API (v${spec.info.version})`,
    description: [
      '# VoiceML API — Official Postman Collection',
      '',
      `Version: **${spec.info.version}** · Spec: OpenAPI 3.1 · Host: \`https://voiceml.voicetel.com\``,
      '',
      'Twilio-compatible REST surface for outbound voice and AMD. Every endpoint is grouped by resource family.',
      '',
      '## Auth model',
      '',
      'HTTP Basic Auth on all authenticated endpoints:',
      '- **Username** = your AccountSid (`AC` + 32 hex chars)',
      '- **Password** = your per-account API key',
      '',
      'The username must match the `:AccountSid` path parameter on account-scoped routes.',
      '',
      'Diagnostic endpoints (`/health`, `/openapi.*`) require no authentication.',
      '',
      '## Documentation',
      '',
      '- API reference: https://voicetel.com/docs/api/v0.6/voiceml/',
      '- Validator: https://voicetel.com/voiceml/validator/',
      '- SDK catalogue: https://voicetel.com/docs/voiceml-sdks/',
    ].join('\n'),
    schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    contact: { name: 'VoiceTel', email: 'support@voicetel.com', url: 'https://voicetel.com' },
    version: spec.info.version,
  },
  auth: {
    type: 'basic',
    basic: [
      { key: 'username', value: '{{accountSid}}', type: 'string' },
      { key: 'password', value: '{{apiKey}}', type: 'string' },
    ],
  },
  item: FOLDER_ORDER.map((name) => folders.get(name)),
  variable: [
    { key: 'baseUrl', value: 'https://voiceml.voicetel.com', type: 'string' },
    { key: 'accountSid', value: '', type: 'string' },
    { key: 'apiKey', value: '', type: 'string' },
  ],
};

writeFileSync(
  resolve(repoRoot, 'voiceml-api.postman_collection.json'),
  JSON.stringify(collection, null, 2) + '\n',
  'utf8'
);

// ---- Postman environment --------------------------------------------------

const env = {
  id: 'voiceml-production',
  name: 'VoiceML · Production',
  values: [
    { key: 'baseUrl', value: 'https://voiceml.voicetel.com', type: 'default', enabled: true },
    { key: 'accountSid', value: '', type: 'default', enabled: true },
    { key: 'apiKey', value: '', type: 'secret', enabled: true },
  ],
  _postman_variable_scope: 'environment',
  _postman_exported_using: 'voiceml/api-collections',
};

writeFileSync(
  resolve(repoRoot, 'voiceml-api.postman_environment.json'),
  JSON.stringify(env, null, 2) + '\n',
  'utf8'
);

// ---- Bruno collection -----------------------------------------------------

const brunoRoot = resolve(repoRoot, 'bruno');

for (const name of FOLDER_ORDER) {
  const dir = resolve(brunoRoot, name);
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}
mkdirSync(resolve(brunoRoot, 'environments'), { recursive: true });

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function bruQueryBlock(query) {
  if (!query.length) return '';
  const lines = ['query {'];
  for (const q of query) {
    const prefix = q.disabled ? '~' : '';
    lines.push(`  ${prefix}${q.key}: ${escapeBruValue(q.value)}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function bruHeaderBlock(headers) {
  if (!headers.length) return '';
  const lines = ['headers {'];
  for (const h of headers) {
    const prefix = h.disabled ? '~' : '';
    lines.push(`  ${prefix}${h.key}: ${escapeBruValue(h.value)}`);
  }
  lines.push('}');
  return lines.join('\n');
}

function bruPathParams(pathTemplate) {
  const params = [];
  for (const seg of pathTemplate.split('/').filter(Boolean)) {
    for (const m of seg.matchAll(/\{([^}]+)\}/g)) {
      params.push(m[1]);
    }
  }
  return params;
}

function bruPathBlock(pathTemplate) {
  const params = bruPathParams(pathTemplate);
  if (!params.length) return '';
  const lines = ['params:path {'];
  for (const p of params) lines.push(`  ${p}: ${pathParamValue(p)}`);
  lines.push('}');
  return lines.join('\n');
}

function bruUrl(pathTemplate, query) {
  const url =
    `{{baseUrl}}/` +
    pathTemplate
      .split('/')
      .filter(Boolean)
      .map((seg) => seg.replace(/\{([^}]+)\}/g, ':$1'))
      .join('/');
  if (!query.length) return url;
  const qp = query
    .filter((q) => !q.disabled)
    .map((q) => `${q.key}=${q.value}`)
    .join('&');
  return qp ? `${url}?${qp}` : url;
}

const folderSeqs = new Map();
for (const name of FOLDER_ORDER) folderSeqs.set(name, 0);

for (const { folder, opId, method, path, op } of operations) {
  const seq = folderSeqs.get(folder) + 1;
  folderSeqs.set(folder, seq);

  const friendly = FRIENDLY_NAMES[opId] || `${folder} ${opId}`;
  const fileSlug = slugify(opId);
  const filePath = resolve(brunoRoot, folder, `${String(seq).padStart(2, '0')}-${fileSlug}.bru`);

  const bodyExample = ['POST', 'PUT', 'PATCH'].includes(method) ? requestBodyExample(op) : null;
  const hasBody = bodyExample !== null && bodyExample !== undefined;
  const headers = postmanHeadersFor(op, hasBody);
  const query = postmanQueryFor(op);
  const url = bruUrl(path, query);
  const noAuth = isNoAuth(op, opId);

  const blocks = [];

  blocks.push(
    [
      'meta {',
      `  name: ${friendly}`,
      `  type: http`,
      `  seq: ${seq}`,
      '}',
    ].join('\n')
  );

  const methodKey = method.toLowerCase();
  blocks.push(
    [
      `${methodKey} {`,
      `  url: ${url}`,
      `  body: ${hasBody ? 'json' : 'none'}`,
      `  auth: ${noAuth ? 'none' : 'inherit'}`,
      '}',
    ].join('\n')
  );

  const pathBlock = bruPathBlock(path);
  if (pathBlock) blocks.push(pathBlock);

  const queryBlock = bruQueryBlock(query);
  if (queryBlock) blocks.push(queryBlock);

  const headerBlock = bruHeaderBlock(headers);
  if (headerBlock) blocks.push(headerBlock);

  if (hasBody) {
    blocks.push(`body:json {\n${JSON.stringify(bodyExample, null, 2)}\n}`);
  }

  blocks.push(`docs {\n${descriptionFor(op, method, path, opId)}\n}`);

  writeFileSync(filePath, blocks.join('\n\n') + '\n', 'utf8');
}

for (const name of FOLDER_ORDER) {
  const content = [
    'meta {',
    `  name: ${name}`,
    `  seq: ${FOLDER_ORDER.indexOf(name) + 1}`,
    '}',
    '',
    'docs {',
    FOLDER_DESCRIPTIONS[name],
    '}',
    '',
  ].join('\n');
  writeFileSync(resolve(brunoRoot, name, 'folder.bru'), content, 'utf8');
}

const brunoJson = {
  version: '1',
  name: `VoiceML API (v${spec.info.version})`,
  type: 'collection',
  ignore: ['node_modules', '.git'],
  auth: {
    mode: 'basic',
    basic: {
      username: '{{accountSid}}',
      password: '{{apiKey}}',
    },
  },
  meta: {
    contact: { name: 'VoiceTel', email: 'support@voicetel.com', url: 'https://voicetel.com' },
    apiVersion: spec.info.version,
  },
};
writeFileSync(resolve(brunoRoot, 'bruno.json'), JSON.stringify(brunoJson, null, 2) + '\n', 'utf8');

const collectionBru = [
  'auth {',
  '  mode: basic',
  '}',
  '',
  'auth:basic {',
  '  username: {{accountSid}}',
  '  password: {{apiKey}}',
  '}',
  '',
  'vars {',
  '  baseUrl: https://voiceml.voicetel.com',
  '}',
  '',
  'docs {',
  '# VoiceML API — Bruno Collection',
  '',
  `Version ${spec.info.version}. Reference docs: https://voicetel.com/docs/api/v0.6/voiceml/`,
  '',
  'HTTP Basic Auth is wired at the collection level (username = accountSid, password = apiKey).',
  'Diagnostic endpoints override auth to none.',
  '}',
  '',
].join('\n');
writeFileSync(resolve(brunoRoot, 'collection.bru'), collectionBru, 'utf8');

const prodEnv = [
  'vars {',
  '  baseUrl: https://voiceml.voicetel.com',
  '  accountSid: ',
  '}',
  '',
  'vars:secret [',
  '  apiKey',
  ']',
  '',
].join('\n');
writeFileSync(resolve(brunoRoot, 'environments', 'production.bru'), prodEnv, 'utf8');

console.log(`Wrote Postman collection with ${operations.length} operations.`);
console.log(
  `Wrote Bruno collection with ${operations.length} operations under ${FOLDER_ORDER.length} folders.`
);
