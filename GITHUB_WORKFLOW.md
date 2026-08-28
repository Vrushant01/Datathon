# GitHub Workflow: Safe Deployment Pipeline

This document outlines the workflow and CI/CD strategy for deploying code and data changes to Catalyst AppSail & Slate.

## Normal Workflow (Code only)

When you make changes to frontend React components or backend Express controllers, you follow a standard Git workflow:

```bash
git add .
git commit -m "update dashboard logic"
git push origin main
```

**What happens in CI/CD:**
1. GitHub Actions detects a push to `main`.
2. The pipeline runs `npm run deploy` (which triggers `deploy:backend` and `deploy:frontend`).
3. Application code is deployed.
4. **NO DATA IS MODIFIED OR MIGRATED.** 

## Data Update Workflow

When you need to update the synthetic datasets (e.g. modify `generate_seed.py` or seed requirements):

1. **Local verification:**
   ```bash
   npm run data:generate
   npm run data:validate
   npm run data:migrate -- --dry-run
   ```

2. **Triggering Data Migration via GitHub:**
   Because a simple `git push` must *never* overwrite the CloudScale databases unexpectedly, we rely on **Manual Workflow Dispatch**.
   
   In your `.github/workflows/deploy.yml` you should define:
   
   ```yaml
   on:
     push:
       branches: [ main ]
     workflow_dispatch:
       inputs:
         deploy_data:
           description: 'Run full Data Generation and CloudScale Migration?'
           required: true
           type: boolean
           default: false
   ```

   **If `deploy_data` is true**, the workflow should execute:
   ```bash
   npm run deploy:data
   ```
   This safely handles change detection and selective table migrations automatically.

## Rollback Mechanism

If a data deployment causes corruption:
1. Examine `backend/scripts/migration_manifest.json` in the Git history.
2. The manifest stores the `previousVersion` and timestamp of all previous migrations.
3. You can safely revert the Git commit to the previous stable data generator and run `npm run deploy:data` again. The change detector will recognize the reverted datasets and safely orchestrate replacing the tables with the older (reverted) data seamlessly.
