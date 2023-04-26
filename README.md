# bomlint

Features
* centralizes dependency versions in a single [BOM](https://ntia.gov/page/software-bill-materials) file
* ensures versions are aligned across multiple npm packages (mono-repo, or not)
* provides tooling to manage your BOM and keep your dependencies aligned

## Getting started

install : 

    npm i -D bomlint

Usage in `package.json`:

```
"scripts" {
    "bomlint": "bomlint",
    "bomlint:fix": "bomlint --fix"
},
```

This will check the project's `package.json` against the BOM. It scan dependencies and check 
their versions against the ones defined in the BOM file. The build will fail if a dependency
has a version not defined in the BOM :

```
// .bomlint.json
{
    "react": "^16.0.0"
}

// package.json : BAD REACT VERSION !!
{
    "dependencies": {
        "react": "^17.0.0"
    }
}
```

Several package.json files can be checked at the sime time, 
which can be useful in mono-repos :

```
// in root package.json
"scripts" {
    "bomlint": "bomlint package.json ./core/package.json ./sample/package.json",
},
```


`bomlint` also checks for "conflicting" dependencies in your package.json files. It
looks for dependencies declared more than once, with different versions :

```
// app1/package.json
{
    "dependencies": {
        "react": "^16.0.0"
    }
}

// app2/package.json : DIFFERENT REACT VERSION
{
    "dependencies": {
        "react": "^17.0.0"
    }
}
```

This helps to spot what should be added to the BOM file. 

> If the conflict is required (ie you need different versions of a lib in some of your packages), 
then you can use `--allow-conflicts` to "skip" the conflict test on some dependencies.

## Configuration

The tool looks for a `.bomlint.json` file in the current folder, and will
look into parents like it's done for `.gitignore`, `.npmrc` and the like. 
A path to the config file can be passed if needed (`--bom <bomfile>` command line option).

The config is a JSON object with string properties, like a package.json's `dependencies` section :

```
{
    "mypkg": "^1.0.0",
    "typescript": "^4.0.2",
}
```

Those are the versions of the packages you want to align.

## --fix

`bomlint` can fix the BOM errors for you, by passing the `--fix` option. 
It will then change the versions in your package.json files according to the one 
set in the BOM file, if any.

This option only touches your package.json files.

## --merge

Merge will change the BOM file and add versions found in the package.json files.
It's the inverse of `--fix`.

> This changes your dependency versions in the BOM file : handle with care !


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



