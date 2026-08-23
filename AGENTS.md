# Market Research

## Required Skill

For all market research, load the `research` skill before starting. If it is not installed locally, obtain it from [mattpocock/skills: engineering/research](https://github.com/mattpocock/skills/tree/main/skills/engineering/research). The skill delegates research to a background agent and requires findings to be checked against primary sources.

## Workflow

1. Define the research question, market, geography, and time period.
2. Prioritize primary sources: regulators, the companies being analyzed, official documentation, public records, specifications, and APIs.
3. Use secondary sources only to find leads or cases; label them as such and do not use them as the only evidence for an important claim.
4. Save a single report in `docs/research/` with a descriptive kebab-case name.
5. Include the date, scope, methodology, executive summary, findings, limitations, and links next to every verifiable claim.
6. Clearly distinguish facts, estimates, and hypotheses. State data gaps instead of inferring through them.

## Completion Criteria

A report is ready when it answers the original question, every relevant finding has a linked source, and its limitations make it possible to assess confidence in the conclusions.
