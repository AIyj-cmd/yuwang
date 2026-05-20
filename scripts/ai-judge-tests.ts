import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_AI_JUDGE_SYSTEM_PROMPT } from '../shared/aiJudgePrompt.js';
import { AI_JUDGE_PROMPT_KEY } from '../shared/aiJudgeTypes.js';
import { getDurationRule, normalizeDurationKey } from '../shared/scoring.js';
import { parseJudgeJson, JudgeFallbackError } from '../server/ai/deepseekClient.js';
import { deterministicScore, generateAiJudgeResult, isPromptUsable } from '../server/ai/judgeService.js';

const prompt = {
  key: AI_JUDGE_PROMPT_KEY,
  content: DEFAULT_AI_JUDGE_SYSTEM_PROMPT,
  version: '1'
};

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
process.chdir(oldCwd);

console.log('ai judge tests passed');
