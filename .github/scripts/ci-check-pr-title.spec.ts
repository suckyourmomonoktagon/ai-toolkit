import { readFileSync } from 'fs';
import { join } from 'path';

describe('PR title workflow regression checks', () => {
  const automatedPrActionPath = join(__dirname, '../actions/check-automated-pr/action.yml');
  const prTitleWorkflowPath = join(__dirname, '../workflows/ci-check-pr-title.yml');

  it('does not classify copilot branches as automated PRs in the shared detector', () => {
    const action = readFileSync(automatedPrActionPath, 'utf-8');

    expect(action).not.toMatch(/elif \[\[ "\$BRANCH_NAME" == copilot\/\* \]\]; then/);
    expect(action).not.toContain('CATEGORY="copilot"');
  });

  it('skips semantic title validation for copilot branches', () => {
    const workflow = readFileSync(prTitleWorkflowPath, 'utf-8');

    expect(workflow).toContain(
      'PR_HEAD_REF: ${{ github.head_ref || github.event.pull_request.head.ref }}'
    );
    expect(workflow).toContain('branch_name: ${{ env.PR_HEAD_REF }}');
    expect(workflow).toContain(
      "steps.check-automated.outputs.is_automated != 'true' && !startsWith(env.PR_HEAD_REF, 'copilot/')"
    );
    expect(workflow).toContain(
      "steps.check-automated.outputs.is_automated == 'true' || startsWith(env.PR_HEAD_REF, 'copilot/')"
    );
  });
});
