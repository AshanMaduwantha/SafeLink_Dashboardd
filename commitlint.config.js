export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [0, "always", 150],
    "subject-case": [0, "always", "sentence-case"],
    "type-enum": [
      2,
      "always",
      [
        "ci",
        "chore",
        "config",
        "build",
        "deps",
        "docs",
        "feat",
        "fix",
        "perf",
        "refactor",
        "release",
        "revert",
        "style",
        "test",
      ],
    ],
  },
};
