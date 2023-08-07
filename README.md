# Apple localization tools

This is a forked version of [the original Apple localization tools](https://github.com/kishikawakatsumi/applelocalization-tools).

Instead of inserting data into a PostgreSQL database, this creates a SQLite database for each platform and locale. So the output is something like this:

```
$ ls output/macos
ar.db       en-GB.db    es.db       fr_CA.db    id.db       nl.db       pt_PT.db
...
```

The generated databases are intended to be used with [Xliffie](https://b123400.net/xliffie/).

## Run 

```
mkdir -p output/ios output/macos
deno run -A --unstable main.ts ios
deno run -A --unstable main.ts macos
```
