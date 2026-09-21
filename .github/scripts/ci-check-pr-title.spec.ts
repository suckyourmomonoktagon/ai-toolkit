import { readFileSync } from 'fs';
import { join } from 'path';

describe('PR title workflow regression checks', () => {
  const automatedPrActionPath = join(__dirname, '../actions/check-automated-pr/action.yml');
  const prTitleWorkflowPath = join(__dirname, '../workflows/ci-check-pr-title.yml');

  it('keeps copilot branches out of the shared automated-pr classifier', () => {
    const action = readFileSync(automatedPrActionPath, 'utf-8');

    expect(action).not.toMatch(/elif \[\[ "\$BRANCH_NAME" == copilot\/\* \]\]; then/);
    expect(action).not.toContain('CATEGORY="copilot"');
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

  it('revalidates generated titles after the metadata workflow completes', () => {
    const workflow = readFileSync(prTitleWorkflowPath, 'utf-8');

    expect(workflow).toContain(`workflow_run:
    workflows:
      - "Claude: Generate PR Title & Description"
    types:
      - completed
    branches-ignore:
      - copilot/**
      - dependabot/**
      - renovate/**
      - release/**
      - gh-readonly-queue/**
      - gtmq*
      - chore/update-action-versions-*`);
    expect(workflow).toContain("github.event_name == 'workflow_run' &&");
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success' &&");
    expect(workflow).toContain("github.event.workflow_run.event == 'pull_request'");
    expect(workflow).toContain('Load PR metadata');
    expect(workflow).toContain('GITHUB_EVENT_NAME: pull_request_target');
  });
});
