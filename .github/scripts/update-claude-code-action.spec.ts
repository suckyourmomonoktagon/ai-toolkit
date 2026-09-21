import { readFileSync } from 'fs';
import { join } from 'path';

describe('update claude-code-action workflow regression checks', () => {
  const workflowPath = join(__dirname, '../workflows/update-claude-code-action.yml');

  it('gates PR-writing steps on job-level WORKFLOW_PAT availability', () => {
    const workflow = readFileSync(workflowPath, 'utf-8');

    expect(workflow).toContain("HAS_WORKFLOW_PAT: ${{ secrets.WORKFLOW_PAT != '' }}");
    expect(workflow).toContain(
      "if: steps.check.outputs.needs_update == 'true' && env.HAS_WORKFLOW_PAT != 'true'"
    );
    expect(workflow).toContain(
      "if: steps.check.outputs.needs_update == 'true' && env.HAS_WORKFLOW_PAT == 'true'"
    );
    expect(workflow).toContain("token: ${{ secrets.WORKFLOW_PAT || github.token }}");
    expect(workflow).not.toContain('steps.credentials.outputs.available');
  });
});
