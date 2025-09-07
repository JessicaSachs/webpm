//    "id": "registry.npmjs.org/is-positive/1.0.0",
//    "latest": "3.1.0",
//    "package": {
//      "name": "is-positive",
//      "version": "1.0.0",
//      "devDependencies": {
//        "ava": "^0.0.4"
//      },
//      "_hasShrinkwrap": false,
//      "directories": {},
//      "dist": {
//        "shasum": "88009856b64a2f1eb7d8bb0179418424ae0452cb",
//        "tarball": "https://registry.npmjs.org/is-positive/-/is-positive-1.0.0.tgz"
//      },
//      "engines": {
//        "node": ">=0.10.0"
//      }
//    },
//    "resolution": {
//      "integrity": "sha1-iACYVrZKLx632LsBeUGEJK4EUss=",
//      "registry": "https://registry.npmjs.org/",
//      "tarball": "https://registry.npmjs.org/is-positive/-/is-positive-1.0.0.tgz"
//    },
//    "resolvedVia": "npm-registry"
//  }

export type RawSpecifier = string
export type Package = {
  name: string
  version: string
  dependencies: Record<string, string>
  devDependencies: Record<string, string>
  peerDependencies: Record<string, string>
  optionalDependencies: Record<string, string>
  directories: Record<string, string>
  _hasShrinkwrap: boolean
  dist: {
    shasum: string
    tarball: string
  }
  engines: Record<string, string>
}

export type Resolution = {
  integrity: string
  registry: string
  tarball: string
}

export type ResolvedVia = 'npm-registry'

export type PackageResolution = {
  id: string // registry.npmjs.org/is-positive/1.0.0
  latest: RawSpecifier
  package: Package
  resolution: Resolution
  resolvedVia: ResolvedVia
}
