import { readFileSync } from 'fs';
import { join } from 'path';

describe('PR title workflow regression checks', () => {
  const automatedPrActionPath = join(
    __dirname,
    '../actions/check-automated-pr/action.yml'
  );
  const prTitleWorkflowPath = join(__dirname, '../workflows/ci-check-pr-title.yml');

  it('classifies copilot branches as automated PRs', () => {
    const action = readFileSync(automatedPrActionPath, 'utf-8');

    expect(action).toMatch(/elif \[\[ "\$BRANCH_NAME" == copilot\/\* \]\]; then/);
    expect(action).toContain('IS_AUTOMATED="true"');
    expect(action).toContain('CATEGORY="copilot"');
  });

  it('skips semantic title validation for copilot branches', () => {
    const workflow = readFileSync(prTitleWorkflowPath, 'utf-8');

    expect(workflow).toContain(
      "steps.check-automated.outputs.is_automated != 'true' && !startsWith(github.head_ref, 'copilot/')"
    );
    expect(workflow).toContain(
      "steps.check-automated.outputs.is_automated == 'true' || startsWith(github.head_ref, 'copilot/')"
    );
  });
});
