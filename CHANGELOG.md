### v0.1.4 (unreleased)

- remove unnecessary docs
- move generated lexicon out of src/
- fix e2e tests

### v0.1.3

- mention interactive setup in README
- show helpful pdsls.dev and atproto-browser links
- implement show command
- implement get command
- add attribution to ATFile
- add release script
- complete release script
- add dry-run option to release script

### v0.1.2

- add badges
- fix outdated README wording

### v0.1.1

- save credentials to config file after first run
- cleanup credentials naming
- add option to clear stored credentials
- smart URL normalization for service URLs
- revert internal variable names back to password

### v0.1.0

- initial non-functional snapshot
- fix upload.json lexicon definition
- generat TypeScript lexicon definitions
- convert to Deno runtime from Node.js
- implement blue.zio.atfile.upload record structure
- add machine fingerprint generation
- add file checksum calculation (SHA256/MD5)
- built CLI with @std/cli parseArgs
- add configuration file support
- add comprehensive test suite
- rebrand as aqfile from atfile
- switch to net.altq.aqfile lexicon
- fix collection name
- integrat generated lexicon schemas
- add runtime validation
- add validation documentation and examples
- add list command
- add delete command
- add end-to-end testing
- improve error messages with blob structure debugging
- add lexicon pubish script
- fix config path on windows
- add JSDoc comments
- cleanup README
- remove unused dependencies
- prepare for publishing on jsr.io
- do not publish lexicons to jsr.io see
  https://github.com/denoland/deno/issues/23427
- add manual types to support JSR publishing
