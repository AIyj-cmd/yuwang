import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import Fastify from 'fastify';
import { DEFAULT_AI_JUDGE_SYSTEM_PROMPT } from '../shared/aiJudgePrompt.js';
import { AI_JUDGE_FALLBACK_SCORE_VERSION, AI_JUDGE_PROMPT_KEY } from '../shared/aiJudgeTypes.js';
import { getDurationRule, normalizeDurationKey } from '../shared/scoring.js';
import { parseJudgeJson, JudgeFallbackError } from '../server/ai/deepseekClient.js';
import { deterministicScore, generateAiJudgeResult, isPromptUsable } from '../server/ai/judgeService.js';

const prompt = {
  key: AI_JUDGE_PROMPT_KEY,
  content: DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
  version: '1'
};

const closeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

const input = {
  duration: '1-2小时',
  activityText: '开会时假装记笔记',
  storyText: '两小时会议里一边点头一边研究今晚吃什么，领导坐在对面。'
};

const generation = {
  judgeResult: {
    valid: true,
    intensity: 'god' as const,
    outcome: 'close_call' as const,
    specialBonuses: [
      { label: '开会期间', points: 20 },
      { label: '领导坐对面', points: 20 },
      { label: '笔记本伪装', points: 15 }
    ],
    comment: '两小时会议你坐得像个认真员工，屏幕里却另有江山。'
  },
  rawText: '{}',
  fallback: false,
  aiProvider: 'deepseek',
  aiModel: 'deepseek-v4-pro',
  promptKey: AI_JUDGE_PROMPT_KEY,
  promptVersion: '1'
};

const scored = deterministicScore(input, generation).breakdown;
assert.equal(scored.baseScore, 65, 'duration base score');
assert.equal(normalizeDurationKey('1-2h'), '1-2小时', 'legacy duration key maps');
assert.equal(getDurationRule('30-60')?.baseScore, 40, 'legacy duration score maps');
assert.equal(scored.intensityMultiplier, 2, 'intensity multiplier');
assert.equal(scored.outcomeBonus, 15, 'outcome bonus');
assert.equal(scored.specialBonusTotal, 55, 'special bonus total');
assert.equal(scored.rawScore, 200, 'raw score');
assert.equal(scored.displayScore, 5.714, 'display score precision');
assert.equal(scored.fishPowerScore, 200, 'fish power score is raw score');
assert.equal(scored.aiProvider, 'deepseek', 'breakdown provider');
assert.equal(scored.promptKey, AI_JUDGE_PROMPT_KEY, 'breakdown prompt key');
assert.equal(scored.fallback, false, 'breakdown fallback flag');

const clamped = deterministicScore(input, {
  ...generation,
  judgeResult: {
    ...generation.judgeResult,
    specialBonuses: [
      { label: '低分被夹', points: 1 },
      { label: '高分被夹', points: 99 },
      { label: '', points: 30 },
      { label: '非数字丢弃', points: Number.NaN },
      { label: '第三项', points: 30 },
      { label: '第四项不会超过总上限', points: 30 }
    ]
  }
}).breakdown;
assert.deepEqual(
  clamped.specialBonuses?.map((item) => item.points),
  [10, 30, 20],
  'special bonuses clamp and total cap'
);
assert.equal(clamped.specialBonusTotal, 60, 'special bonus total max 60');

const sixByThirty = deterministicScore(input, {
  ...generation,
  judgeResult: {
    ...generation.judgeResult,
    specialBonuses: Array.from({ length: 6 }, (_, index) => ({ label: `加成${index + 1}`, points: 30 }))
  }
}).breakdown;
assert.equal(sixByThirty.specialBonusTotal, 60, 'six 30-point bonuses still cap at 60');

const cappedDisplay = deterministicScore(
  { ...input, duration: '4小时以上/全天' },
  {
    ...generation,
    judgeResult: {
      ...generation.judgeResult,
      outcome: 'countered',
      specialBonuses: [
        { label: '离谱一', points: 30 },
        { label: '离谱二', points: 30 }
      ]
    }
  }
).breakdown;
assert.equal(cappedDisplay.displayScore, 10, 'display score caps at 10');

const ignoredScores = deterministicScore(input, {
  ...generation,
  judgeResult: {
    ...generation.judgeResult,
    score: 999,
    rawScore: 999,
    displayScore: 9.99,
    fishPowerScore: 999
  } as typeof generation.judgeResult
}).breakdown;
assert.equal(ignoredScores.rawScore, 200, 'AI score fields are ignored');

for (const [raw, reason] of [
  ['', 'empty_response'],
  ['not json', 'invalid_json'],
  ['{}', 'schema_error']
] as const) {
  assert.throws(() => parseJudgeJson(raw), (error) => error instanceof JudgeFallbackError && error.reason === reason);
}

const oldKey = process.env.DEEPSEEK_API_KEY;
delete process.env.DEEPSEEK_API_KEY;
const missingKey = await generateAiJudgeResult(input, { prompt });
assert.equal(missingKey.fallback, true, 'missing API key falls back');
assert.equal(missingKey.fallbackReason, 'missing_api_key', 'missing API key reason');
if (oldKey !== undefined) process.env.DEEPSEEK_API_KEY = oldKey;

const invalidPromptRuntimeFallback = await generateAiJudgeResult(input, {
  prompt: {
    key: AI_JUDGE_PROMPT_KEY,
    content: 'comment only',
    version: 'broken'
  },
  callJudge: async ({ systemPrompt }) => {
    assert.equal(systemPrompt, DEFAULT_AI_JUDGE_SYSTEM_PROMPT, 'invalid prompt uses default prompt');
    return {
      rawText: '{}',
      parsed: generation.judgeResult,
      model: 'mock-model'
    };
  }
});
assert.equal(invalidPromptRuntimeFallback.fallback, true, 'invalid prompt is marked as fallback');
assert.equal(invalidPromptRuntimeFallback.fallbackReason, 'invalid_prompt', 'invalid prompt reason');
assert.equal(invalidPromptRuntimeFallback.aiModel, 'mock-model', 'invalid prompt can still call with default prompt');

for (const reason of ['invalid_json', 'empty_response', 'timeout', 'schema_error'] as const) {
  const result = await generateAiJudgeResult(input, {
    prompt,
    callJudge: async () => {
      throw new JudgeFallbackError(reason);
    }
  });
  assert.equal(result.fallbackReason, reason, `${reason} falls back`);
}

const timeoutFallbackScore = deterministicScore(input, {
  ...generation,
  fallback: true,
  fallbackReason: 'timeout' as const
}).breakdown;
assert.equal(timeoutFallbackScore.fallback, true, 'fallback score marks fallback');
assert.equal(timeoutFallbackScore.fallbackReason, 'timeout', 'fallback score keeps reason');
assert.equal(timeoutFallbackScore.scoreVersion, AI_JUDGE_FALLBACK_SCORE_VERSION, 'fallback score version is stored');

const fallbackWithoutReason = deterministicScore(input, {
  ...generation,
  fallback: true,
  fallbackReason: undefined
}).breakdown;
assert.equal(fallbackWithoutReason.fallbackReason, 'schema_error', 'fallback without reason gets traceable default reason');

const nonSlacking = deterministicScore(
  { ...input, activityText: '今天认真上班了', storyText: '今天认真上班了，没有摸鱼。' },
  {
    ...generation,
    fallback: true,
    fallbackReason: 'missing_api_key' as const,
    judgeResult: {
      valid: false,
      reason: 'not_slacking_event',
      intensity: 'low' as const,
      outcome: 'safe' as const,
      specialBonuses: [],
      comment: '这不像是摸鱼事迹。你要么今天真的很努力，要么还没想好怎么摸。重新提交一个，我等着。'
    }
  }
).breakdown;
assert.equal(nonSlacking.fishPowerScore, 0, 'non-slacking event scores zero');

const invalidDuration = deterministicScore({ ...input, duration: 'unknown-duration' }, generation).breakdown;
assert.equal(invalidDuration.valid, false, 'invalid duration is invalid');
assert.equal(invalidDuration.fishPowerScore, 0, 'invalid duration scores zero');

const invalidDurationFallback = deterministicScore(
  { ...input, duration: 'unknown-duration' },
  {
    ...generation,
    fallback: true,
    fallbackReason: 'missing_api_key' as const
  }
).breakdown;
assert.equal(invalidDurationFallback.scoreVersion, AI_JUDGE_FALLBACK_SCORE_VERSION, 'invalid duration preserves fallback score version');
assert.equal(invalidDurationFallback.fallbackReason, 'missing_api_key', 'invalid duration preserves fallback reason');

assert.equal(isPromptUsable(DEFAULT_AI_JUDGE_SYSTEM_PROMPT), true, 'default prompt is usable');
assert.equal(isPromptUsable('only comment'), false, 'broken prompt is rejected');

const adminRoutesSource = readFileSync(new URL('../server/adminRoutes.ts', import.meta.url), 'utf8');
assert.match(adminRoutesSource, /\/api\/admin\/ai-prompts/, 'admin prompt routes exist');
assert.match(adminRoutesSource, /requireAdminSession\(request, reply\)/, 'admin prompt routes use admin session guard');

const oldCwd = process.cwd();
const tempRoot = mkdtempSync(join(tmpdir(), 'gw-yuwang-ai-judge-'));
process.chdir(tempRoot);
const databaseUrl = pathToFileURL(join(oldCwd, 'server/database.ts')).href;
const database = await import(databaseUrl);
database.initDatabase();
assert.equal(database.listAiPrompts().some((item: { key: string }) => item.key === AI_JUDGE_PROMPT_KEY), true, 'default prompt initializes');
const beforeCount = Number((database.db.prepare('SELECT COUNT(*) AS count FROM slacking_records').get() as { count: number }).count);
database.saveAiPrompt({
  key: 'ai_judge_test_prompt',
  name: 'Test Prompt',
  content: DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
  updatedBy: 'test'
});
assert.equal(database.getAiPrompt('ai_judge_test_prompt')?.content, DEFAULT_AI_JUDGE_SYSTEM_PROMPT, 'prompt save/read');
database.restoreDefaultAiPrompt('test');
assert.equal(database.getAiPrompt(AI_JUDGE_PROMPT_KEY)?.content, DEFAULT_AI_JUDGE_SYSTEM_PROMPT, 'restore default prompt');
const afterCount = Number((database.db.prepare('SELECT COUNT(*) AS count FROM slacking_records').get() as { count: number }).count);
assert.equal(afterCount, beforeCount, 'prompt operations do not write records');

const routesUrl = pathToFileURL(join(oldCwd, 'server/routes.ts')).href;
const { registerRoutes } = (await import(routesUrl)) as typeof import('../server/routes.js');
const app = Fastify({ logger: false });
await registerRoutes(app);

const routeOldKey = process.env.DEEPSEEK_API_KEY;
const routeOldProvider = process.env.AI_JUDGE_PROVIDER;
const routeOldBaseUrl = process.env.DEEPSEEK_BASE_URL;
const routeOldTimeoutMs = process.env.DEEPSEEK_TIMEOUT_MS;
delete process.env.DEEPSEEK_API_KEY;
process.env.AI_JUDGE_PROVIDER = 'deepseek';

const registerResponse = await app.inject({
  method: 'POST',
  url: '/api/auth/register',
  payload: {
    username: 'judgeuser',
    password: 'password123',
    displayName: 'Judge User'
  }
});
assert.equal(registerResponse.statusCode, 201, 'test user can register');
const authPayload = JSON.parse(registerResponse.payload) as { token: string };

const recordResponse = await app.inject({
  method: 'POST',
  url: '/api/records',
  headers: {
    authorization: `Bearer ${authPayload.token}`
  },
  payload: {
    nickname: 'Judge User',
    activityText: 'not slacking',
    storyText: 'today I worked hard and did not slack',
    duration: '1-2h',
    anonymized: true
  }
});
assert.equal(recordResponse.statusCode, 201, 'POST /api/records succeeds without DeepSeek API key');
const recordPayload = JSON.parse(recordResponse.payload) as {
  record: {
    status: string;
    scoreVersion: string;
    breakdown: {
      fallback?: boolean;
      fallbackReason?: string;
      valid?: boolean;
      reason?: string;
    };
  };
  fishScaleReward: unknown;
};
assert.equal(recordPayload.record.breakdown.fallback, true, 'record fallback flag is stored');
assert.equal(recordPayload.record.breakdown.fallbackReason, 'missing_api_key', 'record fallback reason is stored');
assert.equal(recordPayload.record.scoreVersion, AI_JUDGE_FALLBACK_SCORE_VERSION, 'record fallback score version is stored');
assert.equal(recordPayload.record.status, 'pending', 'non-slacking fallback records are pending');
assert.equal(recordPayload.record.breakdown.valid, false, 'non-slacking fallback is invalid');
assert.equal(recordPayload.record.breakdown.reason, 'not_slacking_event', 'non-slacking reason is stored');
assert.equal(recordPayload.fishScaleReward, null, 'non-slacking record does not get fish-scale reward');
const fishScaleTransactionCount = Number((database.db.prepare('SELECT COUNT(*) AS count FROM fish_scale_transactions').get() as { count: number }).count);
assert.equal(fishScaleTransactionCount, 0, 'non-slacking record creates no fish-scale transactions');

const timeoutServer = createServer(() => {
  // Keep the socket open long enough for the OpenAI client timeout to fire.
});
timeoutServer.unref();
await new Promise<void>((resolve) => timeoutServer.listen(0, '127.0.0.1', resolve));
const timeoutAddress = timeoutServer.address() as AddressInfo;
process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.DEEPSEEK_BASE_URL = `http://127.0.0.1:${timeoutAddress.port}`;
process.env.DEEPSEEK_TIMEOUT_MS = '25';

let timeoutResponse: { statusCode: number; payload: string } | undefined;
try {
  timeoutResponse = await app.inject({
    method: 'POST',
    url: '/api/records',
    headers: {
      authorization: `Bearer ${authPayload.token}`
    },
    payload: {
      nickname: 'Judge User',
      activityText: 'pretended to review docs',
      storyText: 'watched a training video while pretending to review docs',
      duration: '30-60',
      anonymized: true
    }
  });
} finally {
  await closeServer(timeoutServer);
}
assert.ok(timeoutResponse, 'timeout response returned');
assert.equal(timeoutResponse.statusCode, 201, 'POST /api/records succeeds after DeepSeek timeout');
const timeoutPayload = JSON.parse(timeoutResponse.payload) as {
  record: {
    scoreVersion: string;
    breakdown: {
      fallback?: boolean;
      fallbackReason?: string;
    };
  };
};
assert.equal(timeoutPayload.record.breakdown.fallback, true, 'timeout record fallback flag is stored');
assert.equal(timeoutPayload.record.breakdown.fallbackReason, 'timeout', 'timeout record fallback reason is stored');
assert.equal(timeoutPayload.record.scoreVersion, AI_JUDGE_FALLBACK_SCORE_VERSION, 'timeout record fallback score version is stored');

await app.close();
if (routeOldKey === undefined) {
  delete process.env.DEEPSEEK_API_KEY;
} else {
  process.env.DEEPSEEK_API_KEY = routeOldKey;
}
if (routeOldProvider === undefined) {
  delete process.env.AI_JUDGE_PROVIDER;
} else {
  process.env.AI_JUDGE_PROVIDER = routeOldProvider;
}
if (routeOldBaseUrl === undefined) {
  delete process.env.DEEPSEEK_BASE_URL;
} else {
  process.env.DEEPSEEK_BASE_URL = routeOldBaseUrl;
}
if (routeOldTimeoutMs === undefined) {
  delete process.env.DEEPSEEK_TIMEOUT_MS;
} else {
  process.env.DEEPSEEK_TIMEOUT_MS = routeOldTimeoutMs;
}
process.chdir(oldCwd);

console.log('ai judge tests passed');
