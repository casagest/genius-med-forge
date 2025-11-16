export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation
        "style", // Code style (formatting, etc.)
        "refactor", // Code refactoring
        "perf", // Performance improvement
        "test", // Adding tests
        "build", // Build system changes
        "ci", // CI configuration
        "chore", // Maintenance tasks
        "revert", // Revert changes
        "security", // Security improvements
        "a11y", // Accessibility improvements
      ],
    ],
    "subject-case": [2, "always", "lower-case"],
    "subject-max-length": [2, "always", 72],
    "body-max-line-length": [2, "always", 100],
  },
};
