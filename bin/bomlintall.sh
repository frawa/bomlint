
#!/bin/bash

# Run bomlint with all package.json files int this git repository.

update=$(dirname $0)/bomlint.js

git ls-files --cached \
    | grep package.json \
    | xargs -L1 $update "$@"
