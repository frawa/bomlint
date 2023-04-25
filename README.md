# bomlint - Align dependencies across projects

## Getting started

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
## Draft your initial `.bomlint.json` file

Try this script:
```
git ls-files --cached \
    | grep package.json \
    | xargs -L1 jq '[.dependencies, .peerDependencies, .devDependencies | .? | to_entries] | flatten | unique | from_entries' \
    | jq -s '[.[] | to_entries] | flatten | sort_by(.key) | reduce .[] as $dot ({}; .[$dot.key] += "|"+$dot.value)'
```
Do not forget to edit the versions!

## A use scenario in a workspace

- create your initial `.bomlint.json` file with dependencies you want to align across modules
- enable `bomlint` for your first package (see above)

- run script `bomlint` to check alignment
- if versions differ, use `bomlint --merge` and edit `.bomlint.json` to keep only the versions you want
- run script `bomlint:check` to apply versions to this package
- repeat for other modules in your workspace

You might want to use `bomlintall` to run `bomlint` against all `package.json` files in your git repository.



