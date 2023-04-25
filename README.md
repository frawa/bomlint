# bomlint - Align dependencies across projects

Usage in `package.json`:
```
...
"scripts" {
    ...
    "bomlint": "bomlint",
    "bomlint:fix": "bomlint --fix"
},
...
"devDependencies": {
    "bomlint": "^1.0.0",
    ...
}
```

Uses first `.bomlint.json` file following parent folders, like:
```
{
    "bomlint": "^1.0.0",
    "typescript": "^4.0.2",
}
```

A use scenario in a workspace:
- create your initial `.bomlint.json` file with dependencies you want to align across modules
- enable `bomlint` for your first package (see above)
- run script `bomlint` to check alignment
- if versions differ, use `bomlint --merge` and edit `.bomlint.json` to keep only the versions you want
- run script `bomlint:check` to apply versions to this package
- repeat for other modules in your workspace

You might want to use `bomlintall` to run `bomlint` against all `package.json` files in your git repository.



